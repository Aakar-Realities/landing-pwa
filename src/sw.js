/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

const TASK_APP_URL = (
  import.meta.env.VITE_TASK_APP_URL || "https://aakar-task-notifi.ai.studio"
).replace(/\/$/, "");

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets" }),
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Only open links inside the task app; anything else falls back to its home page.
function safeTaskUrl(url) {
  try {
    const target = new URL(url, TASK_APP_URL);
    return target.origin === new URL(TASK_APP_URL).origin ? target.href : TASK_APP_URL;
  } catch {
    return TASK_APP_URL;
  }
}

// Payload sent by the task app: { title, message, url?, tag? }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { message: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Task Management", {
      body: data.message || data.body || "You have a new update.",
      icon: "/images/pwa-192x192.png",
      badge: "/images/pwa-64x64.png",
      tag: data.tag,
      data: { url: safeTaskUrl(data.url || "/") },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || TASK_APP_URL;
  event.waitUntil(self.clients.openWindow(url));
});
