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
    var password = (config.password || "").trim();

    dispatch("obs-connection-start");
    obs = new WebSocket(url);

    obs.onopen = function () {
      console.log("[OBS] WebSocket open, waiting for Hello...");
    };

    obs.onmessage = function (event) {
      var msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (msg.op === 0) {
        console.log("[OBS] Hello received, sending Identify");
        var identify = {
          op: 1,
          d: {
            rpcVersion: (msg.d && msg.d.rpcVersion) || 1,
            eventSubscriptions: 1 << 2,
          },
        };
        if (password) {
          identify.d.authentication = password;
        }
        obs.send(JSON.stringify(identify));
        return;
      }
      if (msg.op === 2) {
        isConnected = true;
        console.log("Authenticated with OBS");
        dispatch("obs-connection-success");
        obs.send(JSON.stringify({
          op: 6,
          d: { requestType: "GetCurrentProgramScene", requestId: "getCurrentScene", requestData: {} },
        }));
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
      if ((msg.op === 5 || msg.op === 7) && msg.d) {
        if (msg.d.requestId === "getCurrentScene" && msg.d.responseData) {
          var sceneName = msg.d.responseData.currentProgramSceneName;
          if (sceneName != null) dispatch("obs-current-scene", { sceneName: sceneName });
          return;
        }
        if (msg.d.eventType === "CurrentProgramSceneChanged" && msg.d.eventData) {
          var evScene = msg.d.eventData.sceneName;
          if (evScene != null) dispatch("obs-current-scene", { sceneName: evScene });
          return;
        }
        if (msg.d.requestId && String(msg.d.requestId).indexOf("heartbeat_") === 0) {
          if (heartbeatTimeoutId) {
            clearTimeout(heartbeatTimeoutId);
            heartbeatTimeoutId = null;
          }
          return;
        }
        if (msg.d.requestId && pendingRequests[msg.d.requestId]) {
          var pending = pendingRequests[msg.d.requestId];
          delete pendingRequests[msg.d.requestId];
          clearTimeout(pending.timeoutId);
          var status = msg.d.requestStatus;
          if (status && status.result === false) {
            var errMsg = status.comment || (status.code != null ? "Error " + status.code : "Request failed");
            pending.reject(new Error(errMsg));
          } else {
            pending.resolve(msg.d.responseData || undefined);
          }
        }
        return;
      }
      console.log("OBS Message:", msg);
    };

    obs.onerror = function () {
      console.warn("[OBS] WebSocket error");
    };

    obs.onclose = function (event) {
      var code = event.code;
      var reason = event.reason || "";
      var message = "OBS connection failed.";
      if (!isConnected) {
        if (code === 1006) {
          message = "Cannot reach OBS. Is the WebSocket server enabled and the IP/port correct? Check firewall on the OBS PC (allow port 4455).";
        } else if (code === 1002) {
          message = "OBS closed the connection (protocol error).";
        } else if (code === 1003) {
          message = "OBS closed the connection (unsupported data).";
        } else if (reason) {
          message = reason;
        } else if (code) {
          message = "Connection closed (code " + code + ").";
        }
      } else {
        message = reason || "OBS disconnected.";
      }
      clearHeartbeat();
      dispatch("obs-current-scene", { sceneName: null });
      dispatch("obs-connection-fail", { message: message, code: code, reason: reason });
      isConnected = false;
      obs = null;
      var ids = Object.keys(pendingRequests);
      for (var i = 0; i < ids.length; i++) {
        pendingRequests[ids[i]].reject(new Error("OBS disconnected before response."));
        clearTimeout(pendingRequests[ids[i]].timeoutId);
      }
      pendingRequests = {};
      console.log("[OBS] Disconnected", code, reason);
    };
  };

  function ensureConnected() {
    if (!obs) throw new Error("OBS WebSocket not connected.");
    if (obs.readyState === 0) throw new Error("OBS is still connecting. Wait a moment and try again.");
    if (obs.readyState !== 1) throw new Error("OBS connection was closed.");
  }

  window.isOBSConnected = function () {
    return !!(obs && isConnected && obs.readyState === 1);
  };

  window.disconnectOBS = function () {
    if (obs) {
      try { obs.close(); } catch (e) {}
      obs = null;
    }
    isConnected = false;
    clearHeartbeat();
  };

  window.obsRequest = function (requestType, requestData) {
    return new Promise(function (resolve, reject) {
      try {
        ensureConnected();
      } catch (e) {
        reject(e);
        return;
      }
      var requestId = "req-" + (++requestIdCounter) + "-" + Date.now();
      var timeoutId = setTimeout(function () {
        if (pendingRequests[requestId]) {
          delete pendingRequests[requestId];
          reject(new Error("OBS did not respond in time."));
        }
      }, RESPONSE_TIMEOUT_MS);
      pendingRequests[requestId] = { resolve: resolve, reject: reject, timeoutId: timeoutId };
      obs.send(JSON.stringify({
        op: 6,
        d: { requestType: requestType, requestId: requestId, requestData: requestData || {} },
      }));
    });
  };

  window.reloadBrowserSource = function (inputName) {
    return window.obsRequest("PressInputPropertiesButton", { inputName: inputName, propertyName: "refreshnocache" });
  };
})();
