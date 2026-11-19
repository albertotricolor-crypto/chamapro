import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Copy, Lock, ShieldAlert } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatBRL, formatDate } from "@/lib/format";
import type { Payment, ProfessionalView, Quote, ServiceRequest } from "@/lib/types";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/pagar/$requestId")({
  head: () => ({
    meta: [{ title: "Pagamento — ChamaPro" }],
  }),
  component: Pagar,
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

function Pagar() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="flex-1 py-6">
          <PagarInner />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function PagarInner() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [professional, setProfessional] = useState<ProfessionalView | null>(null);
  const [serviceTitle, setServiceTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await api.getRequestDetail(requestId);
        if (!alive) return;
        if (!detail) {
          setError("Não foi possível carregar esta solicitação.");
          setLoading(false);
          return;
        }
        if (detail.request.client_id !== user?.id) {
          setError("Esta solicitação não pertence à sua conta.");
          setLoading(false);
          return;
        }
        setRequest(detail.request);
        setQuote(detail.quotes.find((q) => q.status === "accepted") ?? null);
        setPayment(detail.payment);
        const pro = await api.getProfessional(detail.request.professional_id);
        if (!alive) return;
        setProfessional(pro);
        if (detail.request.service_id && pro) {
          const services = await api.listServices(pro.id);
          setServiceTitle(services.find((s) => s.id === detail.request.service_id)?.title ?? "");
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar esta solicitação.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [requestId, user]);

  async function handlePay() {
    if (!quote) return;
    setPayError(null);
    setPaying(true);
    try {
      const paymentId = await api.createSimulatedPayment(requestId, method);
      await api.confirmSimulatedPayment(paymentId);
      if (method === "pix") {
        const clean = paymentId.replace(/-/g, "").slice(0, 16).toUpperCase();
        setPixCode(`SIM-${clean}`);
      }
      setPaid(true);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Algo deu errado no pagamento.");
    } finally {
      setPaying(false);
    }
  }

  async function handleCopyPix() {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (error || !request) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Não foi possível abrir o pagamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes">Minhas solicitações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paid) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Pagamento confirmado (simulado)</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O valor está retido e só será liberado ao profissional quando você confirmar a conclusão do serviço.
          </p>
          {pixCode ? (
            <div className="mx-auto mt-6 max-w-md rounded-md border border-border bg-card p-4 text-left">
              <p className="text-sm font-medium text-foreground">Código Pix fictício (copia e cola)</p>
              <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {pixCode}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void handleCopyPix()}>
                <Copy className="mr-1 h-4 w-4" /> {copied ? "Copiado!" : "Copiar código"}
              </Button>
            </div>
          ) : null}
          <p className="mx-auto mt-6 max-w-md rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            Pagamento SIMULADO — nenhum dinheiro real foi movimentado. O gateway real (Mercado Pago/Stripe) ainda
            não está ligado.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => void navigate({ to: "/confirmacao", search: { requestId } })}>
              Ver confirmação
            </Button>
            <Button asChild variant="outline">
              <Link to="/solicitacoes/$id" params={{ id: requestId }}>
                Acompanhar solicitação
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (request.status === "paid" || request.status === "in_progress" || payment?.status === "held") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Esta solicitação já está paga</h1>
          <p className="mt-2 text-sm text-muted-foreground">O valor está retido até a conclusão do serviço.</p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes/$id" params={{ id: requestId }}>
              Acompanhar solicitação
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!quote) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Sem orçamento aceito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Para pagar, primeiro aceite o orçamento enviado pelo profissional. Se ainda não há orçamento, aguarde o
            profissional responder.
          </p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes/$id" params={{ id: requestId }}>
              Voltar à solicitação
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = quote.amount_cents;
  const fee = Math.round(total * 0.15);
  const proAmount = total - fee;
  const addressSnapshot = parseAddressSnapshot(request.address_snapshot);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Pagamento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {serviceTitle || "Serviço"} · {professional?.display_name ?? "Profissional"}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Serviço</dt>
                  <dd className="text-foreground">{serviceTitle || "Sob consulta"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Profissional</dt>
                  <dd className="text-foreground">{professional?.display_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="text-foreground">{formatDate(request.scheduled_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Endereço</dt>
                  <dd className="text-right text-foreground">{formatAddress(addressSnapshot)}</dd>
                </div>
                {quote.message ? (
                  <div>
                    <dt className="text-muted-foreground">Mensagem do orçamento</dt>
                    <dd className="mt-1 text-foreground">{quote.message}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Método de pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Método de pagamento" className="space-y-3">
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "pix"}
                  onClick={() => setMethod("pix")}
                  className={`w-full rounded-md border p-4 text-left ${
                    method === "pix" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary"
                  }`}
                >
                  <span className="block font-medium text-foreground">Pix</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Pagamento instantâneo simulado, com código copia e cola fictício.
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "card"}
                  onClick={() => setMethod("card")}
                  className={`w-full rounded-md border p-4 text-left ${
                    method === "card" ? "border-primary bg-accent" : "border-border bg-card hover:border-primary"
                  }`}
                >
                  <span className="block font-medium text-foreground">Cartão (simulado)</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Nenhum dado de cartão é pedido. A cobrança é apenas simulada.
                  </span>
                </button>
              </div>
              <p className="mt-4 rounded-md bg-warning-bg px-3 py-2 text-sm font-medium text-warning">
                Pagamento SIMULADO — nenhum dinheiro real foi movimentado. O gateway real (Mercado Pago/Stripe) ainda
                não está ligado.
              </p>
            </CardContent>
          </Card>

          {payError ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {payError}
            </p>
          ) : null}
          <Button size="lg" className="w-full" disabled={paying} onClick={() => void handlePay()}>
            {paying ? "Processando..." : `Confirmar e pagar (simulado) — ${formatBRL(total)}`}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/solicitacoes/$id" params={{ id: requestId }}>
              Voltar à solicitação
            </Link>
          </Button>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumo de valores</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total do orçamento</dt>
                  <dd className="font-medium text-foreground">{formatBRL(total)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Comissão da plataforma (15%)</dt>
                  <dd className="text-foreground">{formatBRL(fee)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Valor do profissional</dt>
                  <dd className="text-foreground">{formatBRL(proAmount)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-foreground">Total a pagar</dt>
                  <dd className="text-lg font-bold text-foreground">{formatBRL(total)}</dd>
                </div>
                <p className="mt-2 flex items-center gap-2 rounded-md bg-gold-bg px-3 py-2 text-sm font-medium text-gold-dark">
                  <Lock className="h-4 w-4" /> Valor retido até a conclusão
                </p>
                <p className="text-xs text-muted-foreground">
                  O valor só é liberado ao profissional depois que você confirmar a conclusão do serviço.
                </p>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
