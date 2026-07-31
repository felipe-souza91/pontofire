import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Config web (não é segredo) vinda de env — ver app/.env.example.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);

// App Check com reCAPTCHA Enterprise (já ativo no projeto — §3).
// Em dev local o reCAPTCHA falha no localhost: defina VITE_APPCHECK_DEBUG_TOKEN
// (true para gerar um token e registrá-lo no console, ou cole um token já
// registrado). Só roda em modo DEV.
if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
  const debug = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debug === 'true' ? true : debug;
}

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
if (recaptchaKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.PROD) {
  // Não derruba o app, mas avisa: em produção o App Check deve estar ligado.
  console.warn('[Ponto FIRE] App Check sem chave reCAPTCHA — defina VITE_RECAPTCHA_ENTERPRISE_KEY.');
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
