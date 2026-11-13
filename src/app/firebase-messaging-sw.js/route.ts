import { obterFirebaseWebPublicConfig, pushFirebaseHabilitadoNoServidor } from "@/lib/notificacoes/firebase-config";

export async function GET() {
  if (!pushFirebaseHabilitadoNoServidor()) {
    return new Response("// Push Firebase não configurado.\n", {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const firebase = obterFirebaseWebPublicConfig()!;

  const script = `importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(firebase)});
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || payload.data?.title || "Notificação";
  const corpo = payload.notification?.body || payload.data?.body || "";
  const url = payload.data?.url || payload.fcmOptions?.link || "/notificacoes";
  self.registration.showNotification(titulo, {
    body: corpo,
    icon: "/favicon.ico",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/notificacoes";
  event.waitUntil(
  clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ("focus" in client) {
        client.focus();
        if ("navigate" in client && typeof client.navigate === "function") {
          return client.navigate(url);
        }
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }),
  );
});
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
