function textoEnv(chave: string): string | null {
  const valor = process.env[chave]?.trim();
  return valor ? valor : null;
}

/** Config pública do Firebase Web (cliente e service worker). */
export function obterFirebaseWebPublicConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} | null {
  const apiKey = textoEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const projectId = textoEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const messagingSenderId = textoEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = textoEnv("NEXT_PUBLIC_FIREBASE_APP_ID");
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null;

  const authDomain =
    textoEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ?? `${projectId}.firebaseapp.com`;
  const storageBucket =
    textoEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ?? `${projectId}.appspot.com`;

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function obterFirebaseVapidPublicKey(): string | null {
  return textoEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
}

/** Credencial Admin SDK para envio FCM no servidor. */
export function firebaseAdminCredentialFromEnv():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = textoEnv("FIREBASE_PROJECT_ID") ?? textoEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const clientEmail = textoEnv("FIREBASE_CLIENT_EMAIL");
  const privateKeyRaw = textoEnv("FIREBASE_PRIVATE_KEY");
  if (!projectId || !clientEmail || !privateKeyRaw) return null;

  return {
    projectId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  };
}

export function pushFirebaseHabilitadoNoServidor(): boolean {
  return Boolean(obterFirebaseWebPublicConfig() && obterFirebaseVapidPublicKey() && firebaseAdminCredentialFromEnv());
}
