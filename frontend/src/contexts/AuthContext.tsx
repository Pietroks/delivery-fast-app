import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { limparCacheRotasLocalmente } from "../services/storage";

interface AuthContextData {
  session: Session | null;
  loading: boolean;
  nomeUsuario: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  session: null,
  loading: false,
  nomeUsuario: "Entregador",
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await limparCacheRotasLocalmente();
    } catch {}
    await supabase.auth.signOut();
  };

  const nomeUsuario =
    session?.user?.user_metadata?.nome_completo ||
    session?.user?.email?.split("@")[0] ||
    "Entregador";

  return (
    <AuthContext.Provider value={{ session, loading, nomeUsuario, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
