import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Footer, Header, Page } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — ChamaPro" },
      {
        name: "description",
        content: "Entre na sua conta ChamaPro ou crie uma conta para pedir orçamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

const DEMO_ACCOUNTS: Array<{ label: string; email: string }> = [
  { label: "Cliente", email: "cliente@chamapro.demo" },
  { label: "Eletricista (Carlos Silva)", email: "eletricista@chamapro.demo" },
  { label: "Diarista (Maria Santos)", email: "diarista@chamapro.demo" },
  { label: "Encanador (João Pereira)", email: "encanador@chamapro.demo" },
  { label: "Pintora (Ana Costa)", email: "pintora@chamapro.demo" },
  { label: "Admin", email: "admin@chamapro.demo" },
];

function Entrar() {
  const { signIn, signUp, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [accountType, setAccountType] = useState<Role>("client");
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signIn(loginEmail.trim(), loginPassword);
      void navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível entrar.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { needsEmailConfirmation } = await signUp(
        name.trim(),
        signupEmail.trim(),
        phone.trim(),
        signupPassword,
        accountType,
      );
      if (needsEmailConfirmation) {
        setNotice(
          "Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre com sua senha.",
        );
        setTab("login");
        return;
      }
      if (accountType === "professional") {
        void navigate({ to: "/cadastro-profissional" });
      } else {
        void navigate({ to: "/" });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a conta.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (email: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signInDemo(email);
      void navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível entrar com a conta de demonstração.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (resetError) throw new Error(resetError.message);
      setNotice(
        "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
      );
      setShowForgot(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o e-mail de redefinição.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Page className="max-w-[720px] py-10">
          <h1 className="text-2xl font-bold text-foreground">
            Entrar no ChamaPro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Peça orçamentos, acompanhe suas solicitações e avalie os
            profissionais.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-danger-bg px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm text-success"
            >
              {notice}
            </div>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "login" | "signup")}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Entrando…" : "Entrar"}
                </Button>
              </form>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
              {showForgot && (
                <form
                  onSubmit={(e) => void handleForgot(e)}
                  className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">
                      E-mail para redefinir a senha
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={busy}>
                    Enviar link de redefinição
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={(e) => void handleSignup(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone">Telefone / WhatsApp</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(86) 99999-9999"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="h-12"
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">
                    Tipo de conta
                  </legend>
                  <div className="flex gap-2">
                    <label
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                        accountType === "client"
                          ? "border-primary bg-info-bg text-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="account-type"
                        value="client"
                        checked={accountType === "client"}
                        onChange={() => setAccountType("client")}
                        className="accent-primary"
                      />
                      Cliente
                    </label>
                    <label
                      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                        accountType === "professional"
                          ? "border-primary bg-info-bg text-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="account-type"
                        value="professional"
                        checked={accountType === "professional"}
                        onChange={() => setAccountType("professional")}
                        className="accent-primary"
                      />
                      Profissional
                    </label>
                  </div>
                  {accountType === "professional" && (
                    <p className="text-xs text-muted-foreground">
                      Após criar a conta, você completa seu cadastro
                      profissional (categorias, área de atendimento e dados de
                      repasse).
                    </p>
                  )}
                </fieldset>
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? "Criando conta…" : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">
              Entrar como demonstração
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Contas de demonstração (senha demo1234) para conhecer o
              ChamaPro sem criar conta.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  variant="outline"
                  onClick={() => void handleDemo(account.email)}
                  disabled={busy}
                  className="justify-start"
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-medium text-primary hover:underline">
              Voltar para a busca
            </Link>
          </p>
        </Page>
      </main>
      <Footer />
    </div>
  );
}
