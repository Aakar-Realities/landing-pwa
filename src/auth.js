import { USERS } from "./users.js";
import { disablePush } from "./push.js";
import { clearTaskSession, taskSignIn } from "./taskApi.js";

const SESSION_KEY = "aakar-session";

// Tool names that users with role "member" can see. Admins see every tool.
export const MEMBER_TOOLS = ["Task Management", "MOM Creator"];

export const canSeeTool = (user, tool) =>
  user?.role === "admin" || MEMBER_TOOLS.includes(tool.name);

const normalize = (email) => email.trim().toLowerCase();

const findUser = (email) => USERS.find((u) => u.email === normalize(email));

async function sha256Hex(text) {
  if (!window.crypto?.subtle) {
    throw new Error("Sign-in needs a secure (https) connection.");
  }
  const data = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Returns the user on success, or null when the email or password is wrong.
export async function signIn(email, password) {
  const user = findUser(email);
  const hash = await sha256Hex(`${normalize(email)}:${password}`);
  if (!user || user.hash !== hash) return null;
  try {
    localStorage.setItem(SESSION_KEY, user.email);
  } catch {
    // Storage blocked: the session lasts until the page is closed.
  }
  // Same credentials work in the task app; signing in there lets this device
  // register for its push notifications. Failure here doesn't block the PWA.
  await taskSignIn(user.email, password);
  return { email: user.email, role: user.role };
}

// Unregisters this device from push and forgets both sessions.
export async function signOut() {
  await disablePush().catch(() => {});
  clearTaskSession();
  clearLocalSession();
}

function clearLocalSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
}

// Restores a saved session, dropping it if that user is no longer in the list.
export function getSessionUser() {
  let email = null;
  try {
    email = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  const user = email && findUser(email);
  if (!user) {
    clearLocalSession();
    clearTaskSession();
    return null;
  }
  return { email: user.email, role: user.role };
}
