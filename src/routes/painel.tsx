import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Info,
  Loader2,
  Play,
  CheckCircle2,
  Wallet,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel do profissional — ChamaPro" },
      {
        name: "description",
        content: "Acompanhe solicitações, gerencie serviços e veja seus ganhos no ChamaPro.",
      },
    ],
  }),
  component: Painel,
});

/* ------------------------------------------------------------------ */
/* Tipos locais (o contrato de @/lib/types ainda não existe no repo;   */
/* campos copiados da migration 20261118214104).                       */
/* ------------------------------------------------------------------ */

type RequestStatus =
  | "sent"
  | "quoted"
  | "accepted"
  | "paid"
  | "in_progress"
  | "done_pending_confirmation"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

type Unit = "por serviço" | "por hora" | "por m²";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface ProfessionalRow {
  id: string;
  display_name: string;
  status: string;
  rejection_reason: string | null;
}

interface RequestRow {
  id: string;
  category_slug: string;
  description: string;
  status: RequestStatus;
  created_at: string;
}

interface ServiceRow {
  id: string;
  category_slug: string;
  title: string;
  description: string | null;
  base_price_cents: number | null;
  unit: Unit;
  active: boolean;
}

interface PayoutRow {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface PaymentRow {
  request_id: string;
  amount_cents: number;
  professional_amount_cents: number;
  platform_fee_cents: number;
  status: string;
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  sent: "Enviada",
  quoted: "Orçada",
  accepted: "Aceita",
  paid: "Paga",
  in_progress: "Em execução",
  done_pending_confirmation: "Aguardando confirmação",
  completed: "Concluída",
  cancelled: "Cancelada",
  disputed: "Em disputa",
  refunded: "Reembolsada",
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseBRLToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  if (cleaned.trim() === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const tone: Record<RequestStatus, string> = {
    sent: "bg-secondary text-secondary-foreground",
    quoted: "bg-primary/10 text-primary",
    accepted: "bg-primary/10 text-primary",
    paid: "bg-primary/10 text-primary",
    in_progress: "bg-primary/10 text-primary",
    done_pending_confirmation: "bg-muted text-muted-foreground",
    completed: "bg-primary text-primary-foreground",
    cancelled: "bg-muted text-muted-foreground",
    disputed: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={tone[status]} aria-label={`Status: ${STATUS_LABEL[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold text-foreground">
          ChamaPro
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/cadastro-profissional" className="text-muted-foreground hover:text-foreground">
            Meu cadastro
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Painel() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [professional, setProfessional] = useState<ProfessionalRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Form de orçamento (por solicitação)
  const [quoteAmount, setQuoteAmount] = useState<Record<string, string>>({});
  const [quoteMessage, setQuoteMessage] = useState<Record<string, string>>({});
  const [quoteError, setQuoteError] = useState<Record<string, string>>({});

  // Form de novo serviço
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceNoPrice, setNewServiceNoPrice] = useState(false);
  const [newServiceUnit, setNewServiceUnit] = useState<Unit>("por serviço");
  const [serviceFormError, setServiceFormError] = useState<string | null>(null);
  const [creatingService, setCreatingService] = useState(false);

  async function loadAll(uid: string) {
    const proRes = await supabase
      .from("professionals")
      .select("id,display_name,status,rejection_reason")
      .eq("user_id", uid)
      .maybeSingle();
    const pro = (proRes.data ?? null) as unknown as ProfessionalRow | null;
    setProfessional(pro);

    const catRes = await supabase
      .from("categories")
      .select("id,name,slug")
      .eq("active", true)
      .order("name");
    setCategories(((catRes.data ?? []) as unknown as CategoryRow[]));

    if (!pro) return;
    const [reqRes, svcRes, payRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select("id,category_slug,description,status,created_at")
        .eq("professional_id", pro.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("services")
        .select("id,category_slug,title,description,base_price_cents,unit,active")
        .eq("professional_id", pro.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payouts")
        .select("id,amount_cents,status,created_at,paid_at")
        .eq("professional_id", pro.id)
        .order("created_at", { ascending: false }),
    ]);
    setRequests(((reqRes.data ?? []) as unknown as RequestRow[]));
    setServices(((svcRes.data ?? []) as unknown as ServiceRow[]));
    setPayouts(((payRes.data ?? []) as unknown as PayoutRow[]));

    const requestIds = ((reqRes.data ?? []) as unknown as RequestRow[]).map((r) => r.id);
    if (requestIds.length > 0) {
      const paymRes = await supabase
        .from("payments")
        .select("request_id,amount_cents,professional_amount_cents,platform_fee_cents,status")
        .in("request_id", requestIds);
      setPayments(((paymRes.data ?? []) as unknown as PaymentRow[]));
    } else {
      setPayments([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const profileRes = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (profileRes.error) {
        setLoadError("Não foi possível carregar seus dados. Tente novamente.");
        setLoading(false);
        return;
      }
      const r = (profileRes.data as { role: string } | null)?.role ?? null;
      setRole(r);
      try {
        await loadAll(uid);
      } catch {
        setLoadError("Não foi possível carregar seus dados. Tente novamente.");
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    if (userId) await loadAll(userId);
  }

  async function sendQuote(request: RequestRow) {
    if (!professional) return;
    const amountCents = parseBRLToCents(quoteAmount[request.id] ?? "");
    if (amountCents === null) {
      setQuoteError((prev) => ({ ...prev, [request.id]: "Informe um valor válido em R$." }));
      return;
    }
    setQuoteError((prev) => ({ ...prev, [request.id]: "" }));
    setActingId(request.id);
    setActionError(null);
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: quoteErr } = await supabase.from("quotes").insert({
        request_id: request.id,
        professional_id: professional.id,
        amount_cents: amountCents,
        currency: "BRL",
        message: (quoteMessage[request.id] ?? "").trim() || null,
        expires_at: expiresAt,
        status: "pending",
      });
      if (quoteErr) throw new Error("Não foi possível enviar o orçamento.");
      const { error: reqErr } = await supabase
        .from("service_requests")
        .update({ status: "quoted" })
        .eq("id", request.id);
      if (reqErr) throw new Error("Orçamento enviado, mas o status da solicitação não foi atualizado.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao enviar o orçamento.");
    } finally {
      setActingId(null);
    }
  }

  async function startExecution(request: RequestRow) {
    setActingId(request.id);
    setActionError(null);
    try {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "in_progress" })
        .eq("id", request.id);
      if (error) throw new Error("Não foi possível iniciar a execução.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao iniciar a execução.");
    } finally {
      setActingId(null);
    }
  }

  async function markCompleted(request: RequestRow) {
    setActingId(request.id);
    setActionError(null);
    try {
      const { error } = await supabase.rpc("complete_request", { p_request_id: request.id });
      if (error) throw new Error("Não foi possível marcar como concluído.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao marcar como concluído.");
    } finally {
      setActingId(null);
    }
  }

  async function toggleService(service: ServiceRow) {
    setActionError(null);
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);
    if (error) {
      setActionError("Não foi possível atualizar o serviço.");
      return;
    }
    await refresh();
  }

  async function createService() {
    if (!professional) return;
    setServiceFormError(null);
    if (!newServiceCategory) {
      setServiceFormError("Escolha uma categoria.");
      return;
    }
    if (newServiceTitle.trim().length < 3) {
      setServiceFormError("Informe o título do serviço.");
      return;
    }
    const priceCents = newServiceNoPrice ? null : parseBRLToCents(newServicePrice);
    if (!newServiceNoPrice && priceCents === null) {
      setServiceFormError("Informe um preço válido em R$ ou marque “sob consulta”.");
      return;
    }
    setCreatingService(true);
    const { error } = await supabase.from("services").insert({
      professional_id: professional.id,
      category_slug: newServiceCategory,
      title: newServiceTitle.trim(),
      description: null,
      base_price_cents: priceCents,
      unit: newServiceUnit,
      active: true,
    });
    setCreatingService(false);
    if (error) {
      setServiceFormError("Não foi possível criar o serviço.");
      return;
    }
    setNewServiceCategory("");
    setNewServiceTitle("");
    setNewServicePrice("");
    setNewServiceNoPrice(false);
    await refresh();
  }

  const heldTotal = payments
    .filter((p) => p.status === "held")
    .reduce((sum, p) => sum + p.professional_amount_cents, 0);
  const releasedTotal = payments
    .filter((p) => p.status === "released")
    .reduce((sum, p) => sum + p.professional_amount_cents, 0);
  const completedCount = requests.filter((r) => r.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !userId ? (
          <Card>
            <CardHeader>
              <CardTitle>Faça login para continuar</CardTitle>
              <CardDescription>Você precisa de uma conta para acessar o painel do profissional.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/entrar">Entrar ou criar conta</Link>
              </Button>
            </CardContent>
          </Card>
        ) : loadError ? (
          <Card>
            <CardHeader>
              <CardTitle>Algo deu errado</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        ) : role !== "professional" || !professional ? (
          <Card>
            <CardHeader>
              <CardTitle>Você ainda não é profissional</CardTitle>
              <CardDescription>
                O painel é para profissionais cadastrados. Crie seu cadastro em poucos passos para
                começar a receber solicitações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/cadastro-profissional">Cadastrar como profissional</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel do profissional</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Olá, {professional.display_name} — acompanhe suas solicitações, serviços e ganhos.
              </p>
            </div>

            {professional.status !== "approved" && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Seu cadastro está{" "}
                  <strong className="text-foreground">
                    {professional.status === "pending" ? "em análise" : professional.status}
                  </strong>
                  . Você já pode acompanhar as solicitações aqui, mas seu perfil só aparece nas
                  buscas depois da aprovação.{" "}
                  <Link to="/cadastro-profissional" className="font-medium text-foreground underline">
                    Ver cadastro
                  </Link>
                </span>
              </div>
            )}

            {actionError && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionError}
              </p>
            )}

            <Tabs defaultValue="solicitacoes">
              <TabsList>
                <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
                <TabsTrigger value="servicos">Meus serviços</TabsTrigger>
                <TabsTrigger value="ganhos">Ganhos</TabsTrigger>
              </TabsList>

              <TabsContent value="solicitacoes" className="mt-4 space-y-4">
                {requests.length === 0 ? (
                  <EmptyState
                    title="Nenhuma solicitação ainda"
                    description="Quando um cliente pedir um orçamento, a solicitação aparece aqui."
                  />
                ) : (
                  requests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                        <div>
                          <CardTitle className="text-base">
                            {categories.find((c) => c.slug === request.category_slug)?.name ??
                              request.category_slug}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {request.description}
                          </CardDescription>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Recebida em {formatDate(request.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Link
                          to="/solicitacoes/$id"
                          params={{ id: request.id }}
                          className="text-sm font-medium text-primary underline"
                        >
                          Ver detalhes e conversa
                        </Link>

                        {request.status === "sent" && (
                          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                            <p className="text-sm font-medium text-foreground">Enviar orçamento</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`amount-${request.id}`}>Valor do serviço (R$)</Label>
                                <Input
                                  id={`amount-${request.id}`}
                                  value={quoteAmount[request.id] ?? ""}
                                  onChange={(e) =>
                                    setQuoteAmount((prev) => ({ ...prev, [request.id]: e.target.value }))
                                  }
                                  placeholder="Ex.: 150,00"
                                  inputMode="decimal"
                                />
                                {quoteError[request.id] && (
                                  <p className="text-sm text-destructive">{quoteError[request.id]}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`msg-${request.id}`}>Mensagem ao cliente</Label>
                                <Textarea
                                  id={`msg-${request.id}`}
                                  value={quoteMessage[request.id] ?? ""}
                                  onChange={(e) =>
                                    setQuoteMessage((prev) => ({ ...prev, [request.id]: e.target.value }))
                                  }
                                  placeholder="Detalhe o que está incluído no valor."
                                  rows={2}
                                />
                              </div>
                            </div>
                            <Button onClick={() => void sendQuote(request)} disabled={actingId === request.id}>
                              {actingId === request.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enviar orçamento
                            </Button>
                          </div>
                        )}

                        {request.status === "paid" && (
                          <Button onClick={() => void startExecution(request)} disabled={actingId === request.id}>
                            {actingId === request.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar execução
                          </Button>
                        )}

                        {request.status === "in_progress" && (
                          <Button onClick={() => void markCompleted(request)} disabled={actingId === request.id}>
                            {actingId === request.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Marcar como concluído
                          </Button>
                        )}

                        {request.status === "done_pending_confirmation" && (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4" />
                            Aguardando confirmação do cliente
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="servicos" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Novo serviço</CardTitle>
                    <CardDescription>Adicione um serviço à sua vitrine.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new-service-category">Categoria</Label>
                        <Select value={newServiceCategory} onValueChange={setNewServiceCategory}>
                          <SelectTrigger id="new-service-category">
                            <SelectValue placeholder="Escolha a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.slug}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-service-unit">Cobrança</Label>
                        <Select value={newServiceUnit} onValueChange={(v) => setNewServiceUnit(v as Unit)}>
                          <SelectTrigger id="new-service-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="por serviço">Por serviço</SelectItem>
                            <SelectItem value="por hora">Por hora</SelectItem>
                            <SelectItem value="por m²">Por m²</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-service-title">Título do serviço</Label>
                      <Input
                        id="new-service-title"
                        value={newServiceTitle}
                        onChange={(e) => setNewServiceTitle(e.target.value)}
                        placeholder="Ex.: Troca de resistência de chuveiro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-service-price">Preço base (R$)</Label>
                      <Input
                        id="new-service-price"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        placeholder="Ex.: 80,00"
                        inputMode="decimal"
                        disabled={newServiceNoPrice}
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newServiceNoPrice}
                        onChange={(e) => setNewServiceNoPrice(e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                      Preço sob consulta
                    </label>
                    {serviceFormError && (
                      <p role="alert" className="text-sm text-destructive">{serviceFormError}</p>
                    )}
                    <Button onClick={() => void createService()} disabled={creatingService}>
                      {creatingService && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar serviço
                    </Button>
                  </CardContent>
                </Card>

                {services.length === 0 ? (
                  <EmptyState
                    title="Nenhum serviço cadastrado"
                    description="Adicione seu primeiro serviço no formulário acima."
                  />
                ) : (
                  services.map((service) => (
                    <Card key={service.id}>
                      <CardContent className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">{service.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {categories.find((c) => c.slug === service.category_slug)?.name ??
                              service.category_slug}
                            {" — "}
                            {service.base_price_cents === null
                              ? "sob consulta"
                              : `${formatBRL(service.base_price_cents)} ${service.unit}`}
                          </p>
                          {!service.active && (
                            <Badge variant="secondary" className="mt-1">Pausado</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${service.id}`} className="text-sm text-muted-foreground">
                            {service.active ? "Ativo" : "Pausado"}
                          </Label>
                          <Switch
                            id={`active-${service.id}`}
                            checked={service.active}
                            onCheckedChange={() => void toggleService(service)}
                            aria-label={`Ativar ou pausar ${service.title}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="ganhos" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        A receber
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{formatBRL(heldTotal)}</p>
                      <p className="text-xs text-muted-foreground">Valores retidos aguardando liberação</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        Já recebido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{formatBRL(releasedTotal)}</p>
                      <p className="text-xs text-muted-foreground">Valores liberados de serviços concluídos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        Serviços concluídos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                      <p className="text-xs text-muted-foreground">Solicitações com confirmação do cliente</p>
                    </CardContent>
                  </Card>
                </div>

                <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  Repasse SIMULADO no M0 — nenhum dinheiro real foi movimentado.
                </p>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wrench className="h-4 w-4" />
                      Repasses
                    </CardTitle>
                    <CardDescription>Histórico de repasses gerados após a confirmação do cliente.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payouts.length === 0 ? (
                      <EmptyState
                        title="Nenhum repasse ainda"
                        description="Os repasses aparecem aqui quando um serviço é concluído e confirmado pelo cliente."
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>{formatDate(payout.created_at)}</TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatBRL(payout.amount_cents)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={payout.status === "paid" ? "default" : "secondary"}>
                                  {PAYOUT_STATUS_LABEL[payout.status] ?? payout.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
