import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/solicitacoes/")({
  head: () => ({
    meta: [{ title: "Minhas solicitações — ChamaPro" }],
  }),
  component: Solicitacoes,
});

const ACTIVE_STATUSES: RequestStatus[] = [
  "sent",
  "quoted",
  "accepted",
  "paid",
  "in_progress",
  "done_pending_confirmation",
  "disputed",
];

type ProInfo = { display_name: string; photo_url: string | null };

function Solicitacoes() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="max-w-3xl flex-1 py-6">
          <SolicitacoesList />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function SolicitacoesList() {
  const { role } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [proMap, setProMap] = useState<Record<string, ProInfo>>({});
  const [serviceTitles, setServiceTitles] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("ativas");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rows, cats, pros] = await Promise.all([
          api.listMyRequests(),
          api.listCategories(),
          api.searchProfessionals({}),
        ]);
        if (!alive) return;
        setRequests(rows);
        const catMap: Record<string, string> = {};
        for (const c of cats) catMap[c.slug] = c.name;
        setCategoryNames(catMap);
        const pMap: Record<string, ProInfo> = {};
        for (const p of pros) pMap[p.id] = { display_name: p.display_name, photo_url: p.photo_url };
        setProMap(pMap);
        const proIds = [...new Set(rows.map((r) => r.professional_id))];
        const titles: Record<string, string> = {};
        await Promise.all(
          proIds.map(async (pid) => {
            const services = await api.listServices(pid);
            for (const s of services) titles[s.id] = s.title;
          }),
        );
        if (!alive) return;
        setServiceTitles(titles);
        const completedIds = rows.filter((r) => r.status === "completed").map((r) => r.id);
        const reviewed = new Set<string>();
        await Promise.all(
          completedIds.map(async (id) => {
            const detail = await api.getRequestDetail(id);
            if (detail?.review) reviewed.add(id);
          }),
        );
        if (!alive) return;
        setReviewedIds(reviewed);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar suas solicitações.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const active = useMemo(() => requests.filter((r) => ACTIVE_STATUSES.includes(r.status)), [requests]);
  const done = useMemo(() => requests.filter((r) => r.status === "completed"), [requests]);
  const cancelled = useMemo(
    () => requests.filter((r) => r.status === "cancelled" || r.status === "refunded"),
    [requests],
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Minhas solicitações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe orçamentos, pagamentos, execução e avaliações das suas solicitações.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="ativas">Ativas ({active.length})</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas ({done.length})</TabsTrigger>
          <TabsTrigger value="canceladas">Canceladas ({cancelled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="mt-4">
          <RequestList
            requests={active}
            categoryNames={categoryNames}
            proMap={proMap}
            serviceTitles={serviceTitles}
            reviewedIds={reviewedIds}
            emptyTitle="Nenhuma solicitação ativa"
            emptyText="Quando você pedir um orçamento, ele aparece aqui para acompanhar."
          />
        </TabsContent>
        <TabsContent value="concluidas" className="mt-4">
          <RequestList
            requests={done}
            categoryNames={categoryNames}
            proMap={proMap}
            serviceTitles={serviceTitles}
            reviewedIds={reviewedIds}
            emptyTitle="Nenhuma solicitação concluída"
            emptyText="Serviços concluídos e confirmados aparecem aqui."
          />
        </TabsContent>
        <TabsContent value="canceladas" className="mt-4">
          <RequestList
            requests={cancelled}
            categoryNames={categoryNames}
            proMap={proMap}
            serviceTitles={serviceTitles}
            reviewedIds={reviewedIds}
            emptyTitle="Nenhuma solicitação cancelada"
            emptyText="Solicitações canceladas ou reembolsadas aparecem aqui."
          />
        </TabsContent>
      </Tabs>
      {role === "professional" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Você está vendo as solicitações recebidas como profissional. Para gerenciar orçamentos e execução, use o
          painel.
        </p>
      ) : null}
    </>
  );
}

function RequestList({
  requests,
  categoryNames,
  proMap,
  serviceTitles,
  reviewedIds,
  emptyTitle,
  emptyText,
}: {
  requests: ServiceRequest[];
  categoryNames: Record<string, string>;
  proMap: Record<string, ProInfo>;
  serviceTitles: Record<string, string>;
  reviewedIds: Set<string>;
  emptyTitle: string;
  emptyText: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyText}
        action={
          <Button asChild>
            <Link to="/">Buscar profissionais</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="space-y-4">
      {requests.map((request) => {
        const pro = proMap[request.professional_id];
        const canReview = request.status === "completed" && !reviewedIds.has(request.id);
        return (
          <li key={request.id}>
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {pro?.photo_url ? (
                    <img
                      src={pro.photo_url}
                      alt={`Foto de ${pro.display_name}`}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                      {(pro?.display_name ?? "?").charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{pro?.display_name ?? "Profissional"}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.service_id && serviceTitles[request.service_id]
                        ? serviceTitles[request.service_id]
                        : (categoryNames[request.category_slug] ?? request.category_slug)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.scheduled_at
                        ? `Data preferida: ${formatDate(request.scheduled_at)}`
                        : `Solicitado em ${formatDate(request.created_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={request.status} />
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link to="/solicitacoes/$id" params={{ id: request.id }}>
                        Acompanhar
                      </Link>
                    </Button>
                    {canReview ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/avaliar/$requestId" params={{ requestId: request.id }}>
                          <Star className="mr-1 h-4 w-4" /> Avaliar
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
