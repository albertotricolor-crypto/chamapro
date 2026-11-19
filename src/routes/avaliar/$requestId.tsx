import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import type { ProfessionalView, Review, ServiceRequest } from "@/lib/types";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/avaliar/$requestId")({
  head: () => ({
    meta: [{ title: "Avaliar serviço — ChamaPro" }],
  }),
  component: Avaliar,
});

const TAGS = ["pontualidade", "qualidade", "limpeza", "preço justo", "comunicação"] as const;

function Avaliar() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="max-w-3xl flex-1 py-6">
          <AvaliarInner />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function AvaliarInner() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [professional, setProfessional] = useState<ProfessionalView | null>(null);
  const [serviceTitle, setServiceTitle] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setExistingReview(detail.review);
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

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!request) return;
    if (rating < 1 || rating > 5) {
      setFormError("Escolha de 1 a 5 estrelas.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await api.submitReview(request.id, request.professional_id, rating, comment.trim(), tags);
      void navigate({ to: "/solicitacoes/$id", params: { id: request.id } });
    } catch {
      setFormError("Não foi possível enviar a avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (error || !request) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Não foi possível abrir a avaliação</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes">Minhas solicitações</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (existingReview) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Stars value={existingReview.rating} size={32} />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Você avaliou com {existingReview.rating} {existingReview.rating === 1 ? "estrela" : "estrelas"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {professional?.display_name} · {serviceTitle || "Serviço"}
          </p>
          {existingReview.comment ? (
            <p className="mx-auto mt-4 max-w-md text-sm text-foreground">{existingReview.comment}</p>
          ) : null}
          {existingReview.tags.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Destaques: {existingReview.tags.join(", ")}</p>
          ) : null}
          <Button asChild className="mt-6">
            <Link to="/solicitacoes/$id" params={{ id: request.id }}>
              Voltar à solicitação
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (request.status !== "completed") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Serviço ainda não concluído</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você só pode avaliar depois que o serviço for concluído e a conclusão for confirmada.
          </p>
          <Button asChild className="mt-6">
            <Link to="/solicitacoes/$id" params={{ id: request.id }}>
              Voltar à solicitação
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Avaliar serviço</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {professional?.display_name} · {serviceTitle || "Serviço"}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como foi o serviço?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <Label>Nota</Label>
              <div className="mt-2">
                <Stars value={rating} editable onChange={setRating} />
              </div>
              {rating > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {rating === 1
                    ? "Muito ruim"
                    : rating === 2
                      ? "Ruim"
                      : rating === 3
                        ? "Regular"
                        : rating === 4
                          ? "Bom"
                          : "Excelente"}
                </p>
              ) : null}
            </div>

            <div>
              <Label>O que se destacou?</Label>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Destaques do serviço">
                {TAGS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <Button
                      key={tag}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Comentário</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte como foi o atendimento, o prazo e a qualidade do serviço."
                rows={5}
                className="mt-2"
              />
            </div>

            {formError ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/solicitacoes/$id" params={{ id: request.id }}>
                  Voltar
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
