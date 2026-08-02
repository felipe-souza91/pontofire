import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AuthContextValue {
  user: User | null;
  carregando: boolean;
  entrarComGoogle: () => Promise<void>;
  entrarComEmail: (email: string, senha: string) => Promise<void>;
  criarComEmail: (email: string, senha: string) => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Traduz códigos de erro do Firebase Auth para mensagens em pt-BR. */
export function mensagemErroAuth(erro: unknown): string {
  const code = (erro as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já tem conta. Tente entrar.';
    case 'auth/weak-password':
      return 'A senha precisa de pelo menos 6 caracteres.';
    case 'auth/missing-password':
      return 'Digite a senha.';
    case 'auth/missing-email':
      return 'Digite o e-mail.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelado.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente de novo em instantes.';
    case 'auth/operation-not-allowed':
      return 'Cadastro por e-mail/senha não está habilitado no Firebase.';
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique a conexão e tente de novo.';
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase Authentication.';
    case 'auth/firebase-app-check-token-is-invalid':
    case 'auth/app-check-token-is-invalid':
      return 'App Check bloqueou a requisição (token inválido neste domínio).';
    default:
      // mostra o código bruto para diagnóstico (beta) em vez de esconder
      return code ? `Não foi possível concluir. (${code})` : 'Não foi possível concluir. Tente novamente.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCarregando(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      carregando,
      async entrarComGoogle() {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      async entrarComEmail(email, senha) {
        await signInWithEmailAndPassword(auth, email, senha);
      },
      async criarComEmail(email, senha) {
        await createUserWithEmailAndPassword(auth, email, senha);
      },
      async recuperarSenha(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async sair() {
        await fbSignOut(auth);
      },
    }),
    [user, carregando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
