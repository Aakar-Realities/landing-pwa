# Open the Task Management app already signed in (AI Studio)

Users sign in once, in the PWA. When they tap **Task Management**, the PWA asks the task
app for a 60-second one-time code and opens `https://aakar-task-notifi.ai.studio/sso#code=...`.
The task app swaps that code for its own new session, so the user lands inside without
logging in again. The password is never put in a link, and the PWA's session and the
task app's session stay separate.

The PWA side is done (`openTaskAppSignedIn` in `src/taskApi.js`). If the task app doesn't
have the changes below yet, the card just opens the task app's normal login page.

## Prompt for AI Studio

Paste this into the task app's chat in AI Studio, then redeploy the app:

```
Add single sign-on from the Aakar PWA, so a user who is signed in to the PWA opens this
app already logged in. Reuse the existing JWT and session functions. Do not change the
existing login page, other pages, or existing API responses.

SERVER - two new endpoints

1. POST /api/v1/auth/handoff  (PROTECTED: uses the existing Bearer auth middleware)
   - Uses the real signed-in user (ignore the X-View-As-User header).
   - Creates a JWT: payload { sub: <user id>, type: "handoff" }, expiresIn "60s",
     signed with the access-token secret + ":handoff" (a different secret, so this code
     can never be used as an access token).
   - Responds { success: true, data: { code: <that JWT> } }.

2. POST /api/v1/auth/handoff/exchange  (PUBLIC: no auth, exactly like /api/v1/auth/login)
   - IMPORTANT: register this route where /api/v1/auth/login is registered, BEFORE the
     global auth middleware, or add it to the same public-route list as /auth/login.
     Today every unknown /api/v1 path answers "Missing or malformed Authorization
     header", so if that message comes back from this endpoint it is not public yet.
   - Body { code }. Verify it with the ":handoff" secret, check it is not expired and
     type === "handoff", then load the user by sub (reject if missing or inactive).
   - Then do exactly what /api/v1/auth/login does after a correct password (create the
     session / refresh token the same way) and respond with the SAME shape as login:
     { success: true, data: { user, tokens: { accessToken, refreshToken } } }.
   - On any failure respond 401: { success: false, error: { code: "UNAUTHORIZED",
     message: "Invalid or expired sign-in link" } }.

3. CORS: keep using ALLOWED_ORIGINS. POST /api/v1/auth/handoff is called from the PWA's
   origin, so it must get the same CORS headers as /api/v1/auth/login.

FRONTEND - one new page

4. Add a PUBLIC route "/sso" in the router, next to "/login" (NOT inside the protected /
   logged-in route wrapper, otherwise it redirects to /login before it can run).
   On mount:
   a. const code = new URLSearchParams(window.location.hash.slice(1)).get("code")
   b. window.history.replaceState(null, "", "/sso")  // remove the code from the URL
   c. If there is no code, navigate("/login", { replace: true }) and stop.
   d. POST { code } to "/auth/handoff/exchange" with the existing API client.
   e. On success run the same steps as the login page's success handler: clear the
      React Query cache, call setAuth(user, tokens.accessToken, tokens.refreshToken)
      on the auth store, then navigate("/", { replace: true }). This replaces any
      session already open in this browser.
   f. On failure: navigate("/login", { replace: true }) and show the error toast
      "Couldn't sign you in automatically. Please log in."
   While waiting, show a centered "Signing you in..." message.

5. The server must return index.html for GET /sso (same SPA fallback as other routes).

CHECK BEFORE FINISHING
- POST /api/v1/auth/handoff/exchange with body {"code":"bad"} and no Authorization
  header must return 401 with the message "Invalid or expired sign-in link".
- Logged in, POST /api/v1/auth/handoff must return a code; opening /sso#code=<code>
  in a fresh browser window must land on the dashboard already logged in.
```

## Check it

1. Sign in to the PWA (sign out and in again if you were signed in before this update).
2. Tap **Task Management**. A new tab should open the task app already signed in as the
   same user, with no login page.
