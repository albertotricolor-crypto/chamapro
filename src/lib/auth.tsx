import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: Role,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  signInDemo: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar_url: row.avatar_url,
    role: row.role as Role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User): Promise<void> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();
    if (!error && data) {
      setProfile(mapProfile(data));
      return;
    }
    // Usuário existe sem profile: tenta criar (role do user_metadata ou 'client').
    const meta = u.user_metadata as Record<string, unknown> | undefined;
    const metaRole =
      typeof meta?.["role"] === "string" ? (meta["role"] as Role) : "client";
    const metaName =
      typeof meta?.["name"] === "string" ? meta["name"] : null;
    const metaPhone =
      typeof meta?.["phone"] === "string" ? meta["phone"] : null;
    const fallbackName =
      metaName ?? u.email?.split("@")[0] ?? "Usuário";
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: u.id,
        name: fallbackName,
        email: u.email ?? "",
        phone: metaPhone,
        role: metaRole,
      })
      .select("*")
      .single();
    if (!insertError && created) {
      setProfile(mapProfile(created));
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        void loadProfile(sessionUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          setLoading(true);
          void loadProfile(sessionUser).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error("E-mail ou senha inválidos. Confira e tente de novo.");
  }, []);

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      password: string,
      role: Role,
    ): Promise<{ needsEmailConfirmation: boolean }> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, phone, role } },
      });
      if (error) throw new Error(error.message);
      const newUser = data.user;
      if (!newUser) {
        return { needsEmailConfirmation: true };
      }
      // Se já há sessão, cria o profile agora.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: newUser.id,
          name,
          email,
          phone: phone || null,
          role,
        });
        if (insertError) {
          // O profile pode ser criado pelo loadProfile na sequência.
          console.warn("Falha ao criar profile no signup:", insertError.message);
        }
        return { needsEmailConfirmation: false };
      }
      return { needsEmailConfirmation: true };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const signInDemo = useCallback(
    async (email: string) => {
      await signIn(email, "demo1234");
    },
    [signIn],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: profile ? profile.role : null,
      loading,
      signIn,
      signUp,
      signOut,
      signInDemo,
    }),
    [user, profile, loading, signIn, signUp, signOut, signInDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: string;
}) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/entrar" });
      return;
    }
    if (role && profile && profile.role !== role) {
      void navigate({ to: "/" });
    }
  }, [loading, user, profile, role, navigate]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-[1120px] px-4 py-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }
  if (role && profile && profile.role !== role) {
    return null;
  }
  return <>{children}</>;
}
