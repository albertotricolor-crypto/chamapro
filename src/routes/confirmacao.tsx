import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Lock, MessageSquare } from "lucide-react";
import * as api from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/format";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/confirmacao")({
  validateSearch: (search: Record<string, unknown>) => ({
    requestId: typeof search["requestId"] === "string" ? search["requestId"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Pagamento confirmado — ChamaPro" }],
  }),
  component: Confirmacao,
});

type Detail = {
  serviceTitle: string;
  professionalName: string;
  totalCents: number | null;
  scheduledAt: string | null;
};

function Confirmacao() {
  const { requestId } = Route.useSearch();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    let alive = true;
    async function load() {
      const id = requestId;
      if (!id) return;
      try {
        const result = await api.getRequestDetail(id);
        if (!alive || !result) return;
        const pro = await api.getProfessional(result.request.professional_id);
        if (!alive) return;
        let serviceTitle = "";
        if (result.request.service_id && pro) {
          const services = await api.listServices(pro.id);
          serviceTitle = services.find((s) => s.id === result.request.service_id)?.title ?? "";
        }
        setDetail({
          serviceTitle,
          professionalName: pro?.display_name ?? "Profissional",
          totalCents: result.payment?.amount_cents ?? null,
          scheduledAt: result.request.scheduled_at,
        });
      } catch {
        if (alive) setDetail(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [requestId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <Page className="max-w-3xl flex-1 py-6">
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Pagamento confirmado!</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Seu pagamento foi registrado e o valor está retido. O profissional foi avisado e pode começar o
              serviço.
            </p>
            <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-md bg-gold-bg px-3 py-2 text-sm font-medium text-gold-dark">
              <Lock className="h-4 w-4" /> Valor retido até a conclusão — você só libera quando confirmar o serviço.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="mt-4">
            <LoadingSkeleton />
          </div>
        ) : detail ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Serviço</dt>
                  <dd className="text-foreground">{detail.serviceTitle || "Serviço"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Profissional</dt>
                  <dd className="text-foreground">{detail.professionalName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="text-foreground">{formatDate(detail.scheduledAt)}</dd>
                </div>
                {detail.totalCents != null ? (
                  <>
                    <Separator />
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-foreground">Total pago (simulado)</dt>
                      <dd className="text-lg font-bold text-foreground">{formatBRL(detail.totalCents)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              <li>
                O profissional executa o serviço na data combinada. Combine os detalhes pelo chat da solicitação.
              </li>
              <li>Quando o serviço terminar, o profissional marca a conclusão.</li>
              <li>
                Você confere o serviço e confirma a conclusão — só então o valor é liberado ao profissional.
              </li>
              <li>Depois de concluído, avalie o serviço para ajudar outros clientes.</li>
            </ol>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-info-bg px-3 py-2 text-sm text-info">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
              Combine tudo pelo chat da plataforma. Nunca pague fora da plataforma.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {requestId ? (
                <Button asChild>
                  <Link to="/solicitacoes/$id" params={{ id: requestId }}>
                    Acompanhar solicitação
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link to="/">Voltar à home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Page>
      <Footer />
    </div>
  );
}
