// Client for the Task Management app's API (https://aakar-task-notifi.ai.studio).
// The PWA signs in to it with the same email and password, so it can register
// this device for push notifications on behalf of that user.

export const TASK_APP_URL = (
  import.meta.env.VITE_TASK_APP_URL || "https://aakar-task-notifi.ai.studio"
).replace(/\/$/, "");

const API = `${TASK_APP_URL}/api/v1`;
const TOKENS_KEY = "aakar-task-tokens";

function readTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY)) || null;
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  try {
    if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {
    // Storage blocked: push setup will ask the user to sign in again.
  }
}

export const hasTaskSession = (email) => readTokens()?.email === email;

export const clearTaskSession = () => saveTokens(null);

// The task API wraps responses as { success, data, error }.
async function parse(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const err = new Error(body?.error?.message || `Task app request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body.data ?? body;
}

// Signs in to the task app. Returns true on success, false if it fails for any reason.
export async function taskSignIn(email, password) {
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout?.(10000),
    });
    const { tokens } = await parse(res);
    if (!tokens?.accessToken) return false;
    saveTokens({ email, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return true;
  } catch {
    return false;
  }
}

async function refresh(tokens) {
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  const data = await parse(res);
  const next = { ...tokens, accessToken: data.accessToken, refreshToken: data.refreshToken };
  saveTokens(next);
  return next;
}

// Authenticated request to the task API, refreshing the access token once on 401.
export async function taskRequest(path, { method = "GET", body } = {}) {
  let tokens = readTokens();
  if (!tokens) {
    const err = new Error("Not signed in to the task app.");
    err.status = 401;
    throw err;
  }
  const send = (t) =>
    fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await send(tokens);
  if (res.status === 401 && tokens.refreshToken) {
    try {
      tokens = await refresh(tokens);
    } catch (err) {
      clearTaskSession();
      throw err;
    }
    res = await send(tokens);
  }
  return parse(res);
}

// Opens the task app already signed in as this user (no second login).
// The task app swaps a 60-second one-time code for its own session at /sso.
// Call from a click handler. Returns false when the caller should fall back to
// a plain link (no task session, or the popup was blocked).
export function openTaskAppSignedIn(email) {
  if (!hasTaskSession(email)) return false;
  // Open the tab synchronously so it isn't treated as a popup, then point it
  // at the sign-in link once the code arrives.
  const win = window.open("", "_blank");
  if (!win) return false;
  win.opener = null;

  taskRequest("/auth/handoff", { method: "POST" })
    .then(({ code }) => {
      win.location.replace(`${TASK_APP_URL}/sso#code=${encodeURIComponent(code)}`);
    })
    .catch(() => {
      win.location.replace(TASK_APP_URL);
    });
  return true;
}
