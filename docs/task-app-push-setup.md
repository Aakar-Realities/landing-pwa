# Push notifications: Task Management app setup (AI Studio)

The Aakar Realities PWA receives Task Management notifications as phone/desktop
push notifications. The PWA side is done. The task app (https://aakar-task-notifi.ai.studio)
needs the server changes below, made in Google AI Studio.

## How it fits together

1. A user signs in to the PWA. Because the email and password are the same in both
   apps, the PWA also calls the task app's `POST /api/v1/auth/login` and keeps the
   access and refresh tokens it returns.
2. The user taps **Task notifications** in the PWA header. The PWA asks for permission,
   gets the server's public key from `GET /api/v1/push/public-key`, subscribes the
   device, and sends the subscription to `POST /api/v1/push/subscribe`.
3. Whenever the task app creates a notification for a user (the same moment it emits
   `notification:new` to the browser today), it also sends a Web Push message to every
   device that user subscribed.
4. Tapping the notification opens the task app at the URL in the message.
5. Signing out of the PWA calls `DELETE /api/v1/push/subscribe`, so a shared phone stops
   getting the previous user's notifications.

## Step 1: create the keys (once)

On any computer with Node.js, run:

```
npx web-push generate-vapid-keys
```

In AI Studio, add three secrets (environment variables) to the task app:

| Name | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | the Public Key printed above |
| `VAPID_PRIVATE_KEY` | the Private Key printed above |
| `VAPID_SUBJECT` | `mailto:` followed by an admin email, e.g. `mailto:it@aakarrealties.com` |
| `ALLOWED_ORIGINS` | the PWA's web address, e.g. `https://your-pwa-domain.com` (comma-separate several; no trailing slash) |

Keep these keys forever. If they change, every device has to turn notifications on again.

## Step 2: prompt for AI Studio

Paste this into the task app's chat in AI Studio:

```
Make two small server changes: (A) add Web Push notifications so an external PWA can
deliver this app's notifications to users' phones, and (B) restrict which websites can
call the API. Keep the current architecture. Do not change any existing feature, page,
API response shape, or the login flow of this app.

A. WEB PUSH

1. Add the `web-push` npm package. At startup call
   webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY,
   process.env.VAPID_PRIVATE_KEY). If any of the three is missing, log a warning and
   skip sending pushes instead of crashing.

2. Add a `push_subscriptions` table: id, user_id (references users), endpoint (text,
   unique), p256dh (text), auth (text), created_at.

3. Add three endpoints under /api/v1. All use the existing auth middleware (Bearer
   access token) and the existing { success, data } response format. They act as the
   real signed-in user and ignore the X-View-As-User header.
   - GET /push/public-key -> { success: true, data: { publicKey: VAPID_PUBLIC_KEY } }
   - POST /push/subscribe, body { subscription: { endpoint, keys: { p256dh, auth } } }.
     Return HTTP 400 if any of those fields is missing. Upsert by endpoint and set
     user_id to the signed-in user (if the endpoint already belongs to another user,
     move it to this user, because a shared phone changed hands).
     Return { success: true, data: { subscribed: true } }.
   - DELETE /push/subscribe, JSON body { endpoint }. Delete that row only if it belongs to
     the signed-in user. Return { success: true, data: { removed: true } } even if no row
     matched.

4. Find every place the server creates a notification for a user (where it emits the
   "notification:new" socket event). After saving it, send a push to all of that user's
   subscriptions in the background, so it never delays or fails the original request:
     webpush.sendNotification(
       { endpoint, keys: { p256dh, auth } },
       JSON.stringify({ title, message, url, tag }),
       { TTL: 86400 }
     )
   - title and message: the same text as the in-app notification.
   - url: a relative path inside this app that shows the related item (for example the
     task's page), or "/" if there is none.
   - tag: the notification id, so repeats replace each other on the phone.
   If sending fails with status 404 or 410, delete that subscription. Log other errors.

B. ALLOWED WEBSITES (CORS)

The server currently reflects any Origin and sends Access-Control-Allow-Credentials: true.
Change only the CORS settings to use an allowlist:
- Allowed origins = this app's own origin plus the comma-separated list in
  process.env.ALLOWED_ORIGINS (trim spaces and trailing slashes; compare exactly).
- Only for an allowed origin, send Access-Control-Allow-Origin with that origin and
  Vary: Origin. For any other origin send no CORS headers (do not error, so same-origin
  requests keep working).
- Do not send Access-Control-Allow-Credentials (auth uses Bearer tokens, not cookies).
- Keep the current allowed methods and headers.
- Requests from the allowed external origins must work for /api/v1/auth/login,
  /api/v1/auth/refresh and /api/v1/push/*, including DELETE with a JSON body.

When done, list every file you changed and confirm that the existing web app still logs
in and loads tasks and notifications as before.
```

## Step 3: check it

1. Open the PWA on a phone. On iPhone, add it to the Home Screen first and open it
   from there (iOS 16.4 or later).
2. Sign out and sign in again, so the PWA gets a task app session.
3. Tap **Task notifications** and allow notifications. The button changes to
   **Notifications on**.
4. In the task app, assign a task to that user from another account. A notification
   should appear on the phone. Tapping it should open the task app.

## Where things live in the PWA

- `src/taskApi.js`: signs in to the task app and calls its API (`VITE_TASK_APP_URL`
  overrides the default `https://aakar-task-notifi.ai.studio`).
- `src/push.js`: permission, subscribe, and unsubscribe on sign-out.
- `src/sw.js`: the service worker that shows notifications and opens the task app.
- `src/NotificationButton.jsx`: the header button.
