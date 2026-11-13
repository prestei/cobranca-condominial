import { obterFirebaseVapidPublicKey, obterFirebaseWebPublicConfig } from "@/lib/notificacoes/firebase-config";

export async function GET() {
  const firebase = obterFirebaseWebPublicConfig();
  const vapidKey = obterFirebaseVapidPublicKey();
  const enabled = Boolean(firebase && vapidKey);
  return Response.json({
    enabled,
    firebase: enabled ? firebase : null,
    vapidKey: enabled ? vapidKey : null,
  });
}
