/**
 * OBS WebSocket connection module (OBS WebSocket 5.x protocol).
 * Connect, auto-reconnect, request helper, current scene, and scene-change events.
 */

let obs;
let reconnectTimer = null;

const OBS_WS_URL = "ws://192.168.1.140:4455";
const RECONNECT_DELAY_MS = 2000;

// Scene change event subscription bit (OBS WebSocket 5.x)
const EVENT_SUBSCRIPTION_SCENES = 1 << 2;

export function connectOBS() {
  function start() {
    obs = new WebSocket(OBS_WS_URL);

    obs.onopen = () => {
      console.log("Connected to OBS");
      // OBS WebSocket 5.x: send Identify (op 1) with optional event subscription
      obs.send(
        JSON.stringify({
          op: 1,
          d: {
            rpcVersion: 1,
            eventSubscriptions: EVENT_SUBSCRIPTION_SCENES,
          },
        })
      );
    };

    obs.onclose = () => {
      console.warn("OBS disconnected, retrying...");
      reconnectTimer = setTimeout(start, RECONNECT_DELAY_MS);
    };

    obs.onerror = (err) => console.error("OBS Error:", err);

    obs.onmessage = (msg) => {
      try {
        handleOBSMessage(JSON.parse(msg.data));
      } catch (e) {
        console.error("OBS message parse error:", e);
      }
    };
  }

  start();
}

export function obsRequest(type, data = {}, id = type + "_" + Date.now()) {
  if (!obs || obs.readyState !== 1) {
    console.warn("OBS not connected, request skipped:", type);
    return;
  }
  obs.send(
    JSON.stringify({
      op: 6,
      d: {
        requestType: type,
        requestId: id,
        requestData: data,
      },
    })
  );
}

export function getCurrentScene() {
  obsRequest("GetCurrentProgramScene", {}, "getCurrentScene");
}

export function subscribeToSceneChanges() {
  // Subscriptions are already sent in Identify (op 1); this is a no-op for OBS 5.x
  // Kept for API compatibility.
}

export let onSceneChanged = (sceneName) => {};

function handleOBSMessage(data) {
  // Identified (op 2): connection ready, fetch current scene
  if (data.op === 2) {
    getCurrentScene();
    return;
  }

  // Request response (op 5 or 7): GetCurrentProgramScene result
  if (data.d?.requestId === "getCurrentScene") {
    const scene = data.d.responseData?.currentProgramSceneName;
    if (scene != null) onSceneChanged(scene);
    return;
  }

  // Event (op 5): CurrentProgramSceneChanged
  if (data.d?.eventType === "CurrentProgramSceneChanged") {
    const scene = data.d.eventData?.sceneName;
    if (scene != null) onSceneChanged(scene);
  }
}
