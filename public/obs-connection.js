(function () {
  "use strict";
  var obs = null;
  var isConnected = false;
  var defaultUrl = "ws://192.168.1.50:4455";
  var pendingRequests = {};
  var requestIdCounter = 0;
  var RESPONSE_TIMEOUT_MS = 20000;
  var heartbeatIntervalId = null;
  var heartbeatTimeoutId = null;
  var HEARTBEAT_INTERVAL_MS = 4000;
  var HEARTBEAT_RESPONSE_MS = 6000;

  function clearHeartbeat() {
    if (heartbeatIntervalId != null) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    if (heartbeatTimeoutId != null) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
  }

  function markDisconnected(reason) {
    if (!isConnected) return;
    isConnected = false;
    clearHeartbeat();
    dispatch("obs-connection-fail", { message: reason || "OBS disconnected." });
    if (obs) {
      try { obs.close(); } catch (e) {}
      obs = null;
    }
    var ids = Object.keys(pendingRequests);
    for (var i = 0; i < ids.length; i++) {
      pendingRequests[ids[i]].reject(new Error("OBS disconnected before response."));
      clearTimeout(pendingRequests[ids[i]].timeoutId);
    }
    pendingRequests = {};
  }

  function dispatch(eventName, detail) {
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
    } catch (e) {}
  }

  window.connectOBS = function connectOBS() {
    var config = window.__OBS_WS_CONFIG__ || {};
    var url = config.url || defaultUrl;
    var password = config.password || "";

    dispatch("obs-connection-start");
    obs = new WebSocket(url);

    obs.onopen = function () {
      console.log("Connected to OBS WebSocket");
      obs.send(
        JSON.stringify({
          op: 1,
          d: {
            rpcVersion: 1,
            authentication: password || undefined,
          },
        })
      );
    };

    obs.onmessage = function (event) {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (msg.op === 2) {
        isConnected = true;
        console.log("Authenticated with OBS");
        dispatch("obs-connection-success");
        clearHeartbeat();
        heartbeatIntervalId = setInterval(function () {
          if (!obs || obs.readyState !== 1) return;
          var requestId = "heartbeat_" + Date.now();
          if (heartbeatTimeoutId) clearTimeout(heartbeatTimeoutId);
          heartbeatTimeoutId = setTimeout(function () {
            heartbeatTimeoutId = null;
            console.warn("[OBS] Heartbeat timeout – no response from OBS");
            markDisconnected("Connection lost (no response from OBS).");
          }, HEARTBEAT_RESPONSE_MS);
          obs.send(JSON.stringify({
            op: 6,
            d: { requestType: "GetVersion", requestId: requestId, requestData: {} },
          }));
        }, HEARTBEAT_INTERVAL_MS);
      }
      if (msg.op === 5 && msg.d && msg.d.requestId) {
        if (String(msg.d.requestId).indexOf("heartbeat_") === 0) {
          if (heartbeatTimeoutId) {
            clearTimeout(heartbeatTimeoutId);
            heartbeatTimeoutId = null;
          }
          return;
        }
        if (pendingRequests[msg.d.requestId]) {
        var pending = pendingRequests[msg.d.requestId];
        delete pendingRequests[msg.d.requestId];
        clearTimeout(pending.timeoutId);
        var status = msg.d.requestStatus;
        if (status && status.result === false) {
          var errMsg = status.comment || (status.code != null ? "Error " + status.code : "Request failed");
          pending.reject(new Error(errMsg));
        } else {
          pending.resolve();
        }
        }
        return;
      }
      console.log("OBS Message:", msg);
    };

    obs.onerror = function () {
      console.warn("OBS WebSocket error – check that OBS is running and the WebSocket server is enabled at the URL in .env.local (NEXT_PUBLIC_OBS_WS_URL).");
    };

    obs.onclose = function () {
      clearHeartbeat();
      if (!isConnected) {
        dispatch("obs-connection-fail", { message: "OBS connection failed. Check OBS is running and NEXT_PUBLIC_OBS_WS_URL in .env.local." });
      } else {
        dispatch("obs-connection-fail", { message: "OBS disconnected." });
      }
      isConnected = false;
      obs = null;
      var ids = Object.keys(pendingRequests);
      for (var i = 0; i < ids.length; i++) {
        pendingRequests[ids[i]].reject(new Error("OBS disconnected before response."));
        clearTimeout(pendingRequests[ids[i]].timeoutId);
      }
      pendingRequests = {};
      console.log("OBS Disconnected");
    };
  };

  window.reloadBrowserSource = function (sourceName) {
    return new Promise(function (resolve, reject) {
      if (!obs) {
        reject(new Error("OBS WebSocket not connected. Load the page and wait for the connection, or set NEXT_PUBLIC_OBS_WS_URL in .env.local (e.g. ws://localhost:4455 if OBS is on this computer) and restart the app."));
        return;
      }
      if (obs.readyState === 0) {
        reject(new Error("OBS is still connecting. Wait a moment and try again."));
        return;
      }
      if (obs.readyState !== 1) {
        reject(new Error("OBS connection was closed. Check OBS and the WebSocket server (Tools → WebSocket Server Settings). If OBS is on this computer, use ws://localhost:4455 in .env.local."));
        return;
      }
      var requestId = "reloadBrowser-" + (++requestIdCounter) + "-" + Date.now();
      var timeoutId = setTimeout(function () {
        if (pendingRequests[requestId]) {
          delete pendingRequests[requestId];
          reject(new Error("OBS did not respond in time. Is the source name correct?"));
        }
      }, RESPONSE_TIMEOUT_MS);
      pendingRequests[requestId] = { resolve: resolve, reject: reject, timeoutId: timeoutId };
      obs.send(
        JSON.stringify({
          op: 6,
          d: {
            requestType: "ReloadBrowserSource",
            requestId: requestId,
            requestData: { sourceName: sourceName },
          },
        })
      );
    });
  };

  function escapeForTemplateLiteral(str) {
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");
  }

  window.injectHTML = function injectHTML(sourceName, html) {
    return new Promise(function (resolve, reject) {
      if (!obs || obs.readyState !== 1) {
        console.warn("[OBS] injectHTML skipped: not connected (obs=" + (obs ? obs.readyState : "null") + "). Source:", sourceName);
        reject(new Error("OBS not connected"));
        return;
      }
      var requestId = "injectHTML_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      var escaped = escapeForTemplateLiteral(html);
      var javascript = "document.documentElement.innerHTML = `" + escaped + "`;";
      var timeoutId = setTimeout(function () {
        if (pendingRequests[requestId]) {
          delete pendingRequests[requestId];
          reject(new Error("OBS did not respond. Is the source name exactly 'Matchup Card'?"));
        }
      }, RESPONSE_TIMEOUT_MS);
      pendingRequests[requestId] = { resolve: resolve, reject: reject, timeoutId: timeoutId };
      console.log("[OBS] Pushing HTML to source:", sourceName, "requestId:", requestId);
      obs.send(
        JSON.stringify({
          op: 6,
          d: {
            requestType: "ExecuteJavaScript",
            requestId: requestId,
            requestData: {
              sourceName: sourceName,
              javascript: javascript,
            },
          },
        })
      );
    });
  };
})();
