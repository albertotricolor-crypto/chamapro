import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — ChamaPro" },
      {
        name: "description",
        content: "Painel administrativo do ChamaPro: aprovações, repasses, disputas e métricas.",
      },
    ],
  }),
  component: Admin,
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

interface PendingProfessional {
  id: string;
  display_name: string;
  categories: string[];
  documents_status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  professionals: { display_name: string } | null;
}

interface DisputeRow {
  id: string;
  request_id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface RecentRequest {
  id: string;
  category_slug: string;
  description: string;
  status: RequestStatus;
  created_at: string;
}

interface Metrics {
  requests: number;
  professionalsPending: number;
  completed: number;
  commissionCents: number;
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

const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  resolved_refund: "Resolvida — reembolso",
  resolved_release: "Resolvida — liberação",
  resolved_partial: "Resolvida — parcial",
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
          <Link to="/painel" className="text-muted-foreground hover:text-foreground">
            Painel do profissional
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Admin() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<Metrics>({
    requests: 0,
    professionalsPending: 0,
    completed: 0,
    commissionCents: 0,
  });
  const [pending, setPending] = useState<PendingProfessional[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  async function loadAll() {
    const [reqCount, pendCount, compCount, feeRes, pendRes, payoutRes, disputeRes, recentRes] =
      await Promise.all([
        supabase.from("service_requests").select("id", { count: "exact", head: true }),
        supabase
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("payments")
          .select("platform_fee_cents")
          .in("status", ["held", "released"]),
        supabase
          .from("professionals")
          .select("id,display_name,categories,documents_status,created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
        supabase
          .from("payouts")
          .select("id,amount_cents,status,created_at,professionals(display_name)")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("disputes")
          .select("id,request_id,reason,status,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("service_requests")
          .select("id,category_slug,description,status,created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const firstError =
      reqCount.error ?? pendCount.error ?? compCount.error ?? feeRes.error ?? pendRes.error ??
      payoutRes.error ?? disputeRes.error ?? recentRes.error;
    if (firstError) throw new Error("Não foi possível carregar os dados do admin.");

    const commissionCents = ((feeRes.data ?? []) as unknown as { platform_fee_cents: number }[]).reduce(
      (sum, p) => sum + p.platform_fee_cents,
      0,
    );
    setMetrics({
      requests: reqCount.count ?? 0,
      professionalsPending: pendCount.count ?? 0,
      completed: compCount.count ?? 0,
      commissionCents,
    });
    setPending(((pendRes.data ?? []) as unknown as PendingProfessional[]));
    setPayouts(((payoutRes.data ?? []) as unknown as PayoutRow[]));
    setDisputes(((disputeRes.data ?? []) as unknown as DisputeRow[]));
    setRecentRequests(((recentRes.data ?? []) as unknown as RecentRequest[]));
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
      const role = (profileRes.data as { role: string } | null)?.role ?? null;
      setIsAdmin(role === "admin");
      if (role !== "admin") {
        setLoading(false);
        return;
      }
      try {
        await loadAll();
      } catch {
        if (!cancelled) setLoadError("Não foi possível carregar os dados do admin. Tente novamente.");
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function approve(id: string) {
    setActingId(id);
    setActionError(null);
    const { error } = await supabase
      .from("professionals")
      .update({ status: "approved", documents_status: "approved" })
      .eq("id", id);
    if (error) {
      setActionError("Não foi possível aprovar o profissional.");
    } else {
      await loadAll();
    }
    setActingId(null);
  }

  async function reject(id: string) {
    const reason = window.prompt("Motivo da recusa (o profissional vai ver essa mensagem):");
    if (reason === null) return; // usuário cancelou
    if (reason.trim() === "") {
      setActionError("Informe o motivo da recusa.");
      return;
    }
    setActingId(id);
    setActionError(null);
    const { error } = await supabase
      .from("professionals")
      .update({ status: "rejected", rejection_reason: reason.trim() })
      .eq("id", id);
    if (error) {
      setActionError("Não foi possível recusar o profissional.");
    } else {
      await loadAll();
    }
    setActingId(null);
  }

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
              <CardDescription>Você precisa de uma conta para acessar a administração.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/entrar">Entrar ou criar conta</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Sem permissão</CardTitle>
              <CardDescription>
                Esta área é restrita aos administradores do ChamaPro. Se você é administrador,
                entre com a conta certa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/">Voltar para a página inicial</Link>
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
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Administração</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Aprovações, repasses, disputas e métricas da plataforma.
              </p>
            </div>

            {actionError && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Solicitações totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{metrics.requests}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Profissionais pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{metrics.professionalsPending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Serviços concluídos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{metrics.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Comissão acumulada (15%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{formatBRL(metrics.commissionCents)}</p>
                </CardContent>
              </Card>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Aprovações pendentes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Profissionais aguardando análise de cadastro e documentos.
              </p>
              <Card className="mt-4">
                <CardContent className="pt-6">
                  {pending.length === 0 ? (
                    <EmptyState
                      title="Nenhuma aprovação pendente"
                      description="Quando um profissional se cadastrar, ele aparece aqui para análise."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Categorias</TableHead>
                          <TableHead>Documentos</TableHead>
                          <TableHead>Desde</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pending.map((pro) => (
                          <TableRow key={pro.id}>
                            <TableCell className="font-medium">{pro.display_name}</TableCell>
                            <TableCell>{pro.categories.join(", ") || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{pro.documents_status}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(pro.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void approve(pro.id)}
                                  disabled={actingId === pro.id}
                                >
                                  {actingId === pro.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void reject(pro.id)}
                                  disabled={actingId === pro.id}
                                >
                                  Recusar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Repasses</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Valores a repassar aos profissionais após a confirmação do cliente.
              </p>
              <Card className="mt-4">
                <CardContent className="space-y-4 pt-6">
                  <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    Efetivação manual: o repasse é feito fora da plataforma. Marque o pagamento
                    como feito no seu controle financeiro e avise o profissional.
                  </p>
                  {payouts.length === 0 ? (
                    <EmptyState
                      title="Nenhum repasse ainda"
                      description="Os repasses aparecem aqui quando um serviço é concluído e confirmado."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell className="font-medium">
                              {payout.professionals?.display_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatBRL(payout.amount_cents)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={payout.status === "paid" ? "default" : "secondary"}>
                                {PAYOUT_STATUS_LABEL[payout.status] ?? payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(payout.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Disputas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Disputas abertas por clientes ou profissionais sobre solicitações.
              </p>
              <Card className="mt-4">
                <CardContent className="pt-6">
                  {disputes.length === 0 ? (
                    <EmptyState
                      title="Nenhuma disputa"
                      description="Quando uma disputa for aberta, ela aparece aqui para análise."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Solicitação</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disputes.map((dispute) => (
                          <TableRow key={dispute.id}>
                            <TableCell>
                              <Link
                                to="/solicitacoes/$id"
                                params={{ id: dispute.request_id }}
                                className="font-medium text-primary underline"
                              >
                                {dispute.request_id.slice(0, 8)}…
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{dispute.reason}</TableCell>
                            <TableCell>
                              <Badge variant={dispute.status === "open" ? "destructive" : "secondary"}>
                                {DISPUTE_STATUS_LABEL[dispute.status] ?? dispute.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(dispute.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Solicitações recentes</h2>
              <p className="mt-1 text-sm text-muted-foreground">As 10 solicitações mais recentes da plataforma.</p>
              <Card className="mt-4">
                <CardContent className="pt-6">
                  {recentRequests.length === 0 ? (
                    <EmptyState
                      title="Nenhuma solicitação ainda"
                      description="As solicitações dos clientes aparecem aqui assim que forem criadas."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.category_slug}</TableCell>
                            <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{STATUS_LABEL[request.status]}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
