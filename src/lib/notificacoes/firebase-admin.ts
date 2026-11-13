import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { firebaseAdminCredentialFromEnv, pushFirebaseHabilitadoNoServidor } from "@/lib/notificacoes/firebase-config";

let appInicializado: App | null = null;

function obterAppAdmin(): App | null {
  if (!pushFirebaseHabilitadoNoServidor()) return null;
  if (appInicializado) return appInicializado;

  const credencial = firebaseAdminCredentialFromEnv();
  if (!credencial) return null;

  const existentes = getApps();
  if (existentes.length > 0) {
    appInicializado = existentes[0] ?? null;
    return appInicializado;
  }

  appInicializado = initializeApp({
    credential: cert({
      projectId: credencial.projectId,
      clientEmail: credencial.clientEmail,
      privateKey: credencial.privateKey,
    }),
    projectId: credencial.projectId,
  });
  return appInicializado;
}

export function obterFirebaseMessaging(): Messaging | null {
  const app = obterAppAdmin();
  if (!app) return null;
  return getMessaging(app);
}
