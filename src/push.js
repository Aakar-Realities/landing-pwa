import { hasTaskSession, taskRequest } from "./taskApi.js";

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// One of: "needs-install" (iPhone/iPad outside the installed app), "unsupported",
// "denied", "on", "off".
export async function getPushState() {
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

// Must be called from a tap/click. Throws with a user-facing message on failure.
export async function enablePush(email) {
  if (!hasTaskSession(email)) {
    throw new Error("Sign out and sign in again to connect your task account.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications were not allowed.");
  }

  const { publicKey } = await taskRequest("/push/public-key");
  if (!publicKey) {
    throw new Error("Task notifications aren't set up on the task app yet.");
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  try {
    await taskRequest("/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } });
  } catch (err) {
    await sub.unsubscribe();
    throw err;
  }
}

// Stops pushes to this device for the signed-in user. Called on sign-out so the
// next person using this device doesn't get the previous user's notifications.
export async function disablePush() {
  if (!pushSupported()) return;
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  await taskRequest("/push/subscribe", {
    method: "DELETE",
    body: { endpoint: sub.endpoint },
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
