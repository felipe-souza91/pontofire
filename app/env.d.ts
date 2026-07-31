/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  // Config web do Firebase (não são segredos, mas ficam em env para o dono
  // preencher sem editar código). Ver .env.example.
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  // App Check — reCAPTCHA Enterprise (site key).
  readonly VITE_RECAPTCHA_ENTERPRISE_KEY: string;
  // FCM Web Push (VAPID) — usado no M7.
  readonly VITE_FCM_VAPID_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
