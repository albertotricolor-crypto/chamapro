import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Lock, MessageSquare, RefreshCw, Send, ShieldAlert, Star, XCircle } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import type { ChatMessage, Payment, ProfessionalView, Quote, Review, ServiceRequest } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Stars } from "@/components/stars";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/solicitacoes/$id")({
  head: () => ({
    meta: [{ title: "Acompanhar solicitação — ChamaPro" }],
  }),
  component: SolicitacaoDetalhe,
});

type AddressSnapshot = {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  zip?: string;
};

function parseAddressSnapshot(value: unknown): AddressSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: AddressSnapshot = {};
  for (const key of ["street", "number", "complement", "neighborhood", "city", "zip"] as const) {
    if (typeof v[key] === "string") out[key] = v[key] as string;
  }
  return out;
}

function formatAddress(snapshot: AddressSnapshot | null): string {
  if (!snapshot) return "Endereço não informado";
  const parts = [
    snapshot.street,
    snapshot.number ? `nº ${snapshot.number}` : null,
    snapshot.complement,
    snapshot.neighborhood,
    snapshot.city,
    snapshot.zip,
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length > 0 ? parts.join(" — ") : "Endereço não informado";
}

function SolicitacaoDetalhe() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="flex-1 py-6">
          <DetalheInner />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function DetalheInner() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [professional, setProfessional] = useState<ProfessionalView | null>(null);
  const [serviceTitle, setServiceTitle] = useState<string>("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [chatBody, setChatBody] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const detail = await api.getRequestDetail(id);
      if (!detail) {
        setError("Não foi possível carregar esta solicitação.");
        setLoading(false);
        return;
      }
      const { request: req, quotes: qs, payment: pay, messages: msgs, review: rev } = detail;
      const pro = await api.getProfessional(req.professional_id);
      const isParty =
        req.client_id === user.id || pro?.user_id === user.id || role === "admin";
      if (!isParty) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      setRequest(req);
      setQuotes(qs);
      setPayment(pay);
      setMessages(msgs);
      setReview(rev);
      setProfessional(pro);
      if (req.service_id && pro) {
        const services = await api.listServices(pro.id);
        setServiceTitle(services.find((s) => s.id === req.service_id)?.title ?? "");
      }
      const cats = await api.listCategories();
      setCategoryName(cats.find((c) => c.slug === req.category_slug)?.name ?? req.category_slug);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar esta solicitação.");
      setLoading(false);
    }
  }, [id, user, role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!request) return;
    const timer = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [request, load]);

  const isClient = request?.client_id === user?.id;
  const isProfessional = professional?.user_id === user?.id;
  const pendingQuote = useMemo(() => quotes.find((q) => q.status === "pending") ?? null, [quotes]);
  const acceptedQuote = useMemo(() => quotes.find((q) => q.status === "accepted") ?? null, [quotes]);
  const chatClosed = request?.status === "completed" || request?.status === "cancelled";

  async function runAction(fn: () => Promise<void>) {
    setActionError(null);
    setActing(true);
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setActing(false);
    }
  }

  async function handleSendChat(event: React.FormEvent) {
    event.preventDefault();
    if (!chatBody.trim() || !request || chatClosed) return;
    setChatError(null);
    setSendingChat(true);
    try {
      await api.sendChatMessage(request.id, chatBody.trim());
      setChatBody("");
      await load();
    } catch {
      setChatError("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setSendingChat(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (forbidden) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Sem permissão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta solicitação pertence a outro cliente e profissional. Você não tem acesso a ela.
          </p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes">Minhas solicitações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error || !request) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">Solicitação não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "Verifique o link e tente novamente."}</p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes">Minhas solicitações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalCents = payment?.amount_cents ?? acceptedQuote?.amount_cents ?? null;
  const feeCents =
    payment?.platform_fee_cents ?? (totalCents != null ? Math.round(totalCents * 0.15) : null);
  const proCents =
    payment?.professional_amount_cents ??
    (totalCents != null && feeCents != null ? totalCents - feeCents : null);
  const held = payment?.status === "held" || request.status === "paid";
  const canCancel =
    isClient && (request.status === "sent" || request.status === "quoted" || request.status === "accepted");
  const addressSnapshot = parseAddressSnapshot(request.address_snapshot);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/solicitacoes" className="text-sm text-muted-foreground hover:text-foreground">
            ← Minhas solicitações
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {serviceTitle || categoryName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitado em {formatDateTime(request.created_at)}
            {request.scheduled_at ? ` · Data preferida: ${formatDate(request.scheduled_at)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} />
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      <Tabs defaultValue="detalhes" className="mt-6">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1 h-4 w-4" /> Chat ({messages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Andamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {request.status === "cancelled" || request.status === "refunded" ? (
                    <div className="flex items-start gap-3 rounded-md bg-warning-bg px-3 py-2">
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                      <div>
                        <p className="font-medium text-foreground">{STATUS_LABEL[request.status]}</p>
                        {request.cancel_reason ? (
                          <p className="text-sm text-muted-foreground">Motivo: {request.cancel_reason}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : request.status === "disputed" ? (
                    <div className="flex items-start gap-3 rounded-md bg-destructive/10 px-3 py-2">
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <div>
                        <p className="font-medium text-foreground">Em disputa</p>
                        <p className="text-sm text-muted-foreground">
                          A solicitação está em disputa e será analisada pela equipe ChamaPro.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Timeline current={request.status} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Descrição do problema</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{request.description}</p>
                  <Separator className="my-4" />
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Categoria</dt>
                      <dd className="text-foreground">{categoryName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Endereço</dt>
                      <dd className="text-right text-foreground">{formatAddress(addressSnapshot)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {pendingQuote && request.status === "quoted" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Orçamento recebido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{formatBRL(pendingQuote.amount_cents)}</p>
                    {pendingQuote.message ? (
                      <p className="mt-2 text-sm text-muted-foreground">{pendingQuote.message}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Válido até {formatDateTime(pendingQuote.expires_at)}
                    </p>
                    {isClient ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          disabled={acting}
                          onClick={() =>
                            void runAction(() => api.acceptQuote(request.id, pendingQuote.id))
                          }
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Aceitar orçamento
                        </Button>
                        <Button
                          variant="outline"
                          disabled={acting}
                          onClick={() => {
                            if (!window.confirm("Tem certeza de que quer recusar este orçamento?")) return;
                            void runAction(() => api.declineQuote(pendingQuote.id));
                          }}
                        >
                          Recusar
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {review ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Avaliação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="flex items-center gap-2 text-sm text-foreground">
                      <Stars value={review.rating} size={16} />
                      Você avaliou com {review.rating} {review.rating === 1 ? "estrela" : "estrelas"}
                    </p>
                    {review.comment ? <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p> : null}
                    {review.tags.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Destaques: {review.tags.join(", ")}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {professional?.photo_url ? (
                      <img
                        src={professional.photo_url}
                        alt={`Foto de ${professional.display_name}`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                        {(professional?.display_name ?? "?").charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{professional?.display_name ?? "Profissional"}</p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Stars value={professional?.rating_avg ?? 0} size={16} />
                        {professional && professional.rating_avg > 0
                          ? `${professional.rating_avg.toFixed(1)} · ${professional.reviews_count} avaliações`
                          : "Sem avaliações ainda"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo de valores</CardTitle>
                </CardHeader>
                <CardContent>
                  {totalCents == null ? (
                    <p className="text-sm text-muted-foreground">
                      Sem valores ainda. O total aparece quando o profissional enviar o orçamento.
                    </p>
                  ) : (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Total do orçamento</dt>
                        <dd className="font-medium text-foreground">{formatBRL(totalCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Comissão da plataforma (15%)</dt>
                        <dd className="text-foreground">{feeCents != null ? formatBRL(feeCents) : "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Valor do profissional</dt>
                        <dd className="text-foreground">{proCents != null ? formatBRL(proCents) : "—"}</dd>
                      </div>
                      <Separator />
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground">Total a pagar</dt>
                        <dd className="text-lg font-bold text-foreground">{formatBRL(totalCents)}</dd>
                      </div>
                      {held ? (
                        <p className="mt-2 flex items-center gap-2 rounded-md bg-gold-bg px-3 py-2 text-sm font-medium text-gold-dark">
                          <Lock className="h-4 w-4" /> Valor retido — liberado só após a conclusão confirmada.
                        </p>
                      ) : null}
                      {payment ? (
                        <p className="text-xs text-muted-foreground">
                          Pagamento via {payment.method === "pix" ? "Pix" : "cartão"} · status: {payment.status}
                        </p>
                      ) : null}
                    </dl>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isClient && request.status === "accepted" ? (
                    <Button asChild className="w-full">
                      <Link to="/pagar/$requestId" params={{ requestId: request.id }}>
                        Ir para pagamento
                      </Link>
                    </Button>
                  ) : null}
                  {isClient && request.status === "paid" ? (
                    <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
                      Pagamento retido — aguardando execução do serviço.
                    </p>
                  ) : null}
                  {isProfessional && request.status === "paid" ? (
                    <Button
                      className="w-full"
                      disabled={acting}
                      onClick={() => void runAction(() => api.startExecution(request.id))}
                    >
                      Iniciar execução
                    </Button>
                  ) : null}
                  {isProfessional && (request.status === "paid" || request.status === "in_progress") ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={acting}
                      onClick={() => void runAction(() => api.completeRequest(request.id))}
                    >
                      Marcar serviço como concluído
                    </Button>
                  ) : null}
                  {isClient && request.status === "done_pending_confirmation" ? (
                    <Button
                      className="w-full"
                      disabled={acting}
                      onClick={() => void runAction(() => api.confirmCompletion(request.id))}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar conclusão
                    </Button>
                  ) : null}
                  {isClient && request.status === "completed" && !review ? (
                    <Button asChild className="w-full">
                      <Link to="/avaliar/$requestId" params={{ requestId: request.id }}>
                        <Star className="mr-1 h-4 w-4" /> Avaliar o serviço
                      </Link>
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={acting}
                      onClick={() => {
                        const reason = window.prompt("Qual o motivo do cancelamento? (opcional)");
                        if (reason === null) return;
                        void runAction(() =>
                          api.cancelRequest(request.id, reason.trim() ? reason.trim() : undefined),
                        );
                      }}
                    >
                      Cancelar solicitação
                    </Button>
                  ) : null}
                  <Button variant="ghost" className="w-full" onClick={() => void navigate({ to: "/solicitacoes" })}>
                    Voltar à lista
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
                Combine tudo aqui. Nunca pague fora da plataforma.
              </p>
              <div role="log" aria-live="polite" className="mt-4 max-h-[480px] space-y-3 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Use o chat para combinar detalhes do serviço.
                  </p>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.body ?? ""}</p>
                          <p className={`mt-1 text-right text-xs ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {chatError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {chatError}
                </p>
              ) : null}
              {chatClosed ? (
                <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Esta conversa foi encerrada.
                </p>
              ) : (
                <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                  <Input
                    value={chatBody}
                    onChange={(e) => setChatBody(e.target.value)}
                    placeholder="Escreva sua mensagem..."
                    aria-label="Mensagem"
                    disabled={sendingChat}
                  />
                  <Button type="submit" disabled={sendingChat || !chatBody.trim()}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Enviar</span>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
