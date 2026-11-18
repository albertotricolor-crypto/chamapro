import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Stars } from "@/components/stars";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfessional, listReviews, listServices } from "@/lib/api";
import type { ProfessionalView, Review, Service } from "@/lib/types";
import { formatBRL, formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/profissionais/$id")({
  head: () => ({
    meta: [
      { title: "Profissional — ChamaPro" },
      {
        name: "description",
        content:
          "Veja os serviços, preços e avaliações do profissional e peça um orçamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfessionalDetail,
});

function ProfessionalDetail() {
  const { id } = Route.useParams();
  const [professional, setProfessional] = useState<ProfessionalView | null>(
    null,
  );
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    getProfessional(id)
      .then((pro) => {
        if (!mounted) return;
        if (!pro) {
          setNotFound(true);
          return;
        }
        setProfessional(pro);
        return Promise.all([listServices(pro.id), listReviews(pro.id)]).then(
          ([svcs, revs]) => {
            if (mounted) {
              setServices(svcs);
              setReviews(revs);
            }
          },
        );
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o profissional.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Page className="py-8">
          {loading ? (
            <LoadingSkeleton />
          ) : notFound ? (
            <EmptyState
              title="Profissional não encontrado"
              description="Este perfil pode ter sido removido ou ainda não foi aprovado."
              action={
                <Button asChild>
                  <Link to="/">Voltar para a busca</Link>
                </Button>
              }
            />
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-danger-bg px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : professional ? (
            <>
              <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row">
                {professional.photo_url ? (
                  <img
                    src={professional.photo_url}
                    alt={`Foto de ${professional.display_name}`}
                    className="h-24 w-24 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground"
                    aria-hidden="true"
                  >
                    {initials(professional.display_name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {professional.display_name}
                  </h1>
                  <p
                    className="mt-1 flex items-center gap-1.5 text-sm"
                    aria-label={`Nota ${professional.rating_avg.toFixed(1).replace(".", ",")} de 5, ${professional.reviews_count} avaliações`}
                  >
                    <Stars value={professional.rating_avg} size={16} />
                    <span className="font-semibold text-gold-dark">
                      {professional.rating_avg > 0
                        ? professional.rating_avg
                            .toFixed(1)
                            .replace(".", ",")
                        : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      ({professional.reviews_count}{" "}
                      {professional.reviews_count === 1
                        ? "avaliação"
                        : "avaliações"}
                      )
                    </span>
                  </p>
                  {professional.service_area.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden="true" />
                      Atende em {professional.service_area.join(", ")}
                    </p>
                  )}
                  {professional.bio && (
                    <p className="mt-3 text-base text-foreground">
                      {professional.bio}
                    </p>
                  )}
                </div>
                <div className="shrink-0 sm:self-center">
                  <Button asChild size="lg">
                    <Link to="/solicitar/$professionalId" params={{ professionalId: professional.id }}>
                      Solicitar
                    </Link>
                  </Button>
                </div>
              </div>

              <section className="mt-8" aria-labelledby="servicos">
                <h2
                  id="servicos"
                  className="text-xl font-bold text-foreground"
                >
                  Serviços
                </h2>
                {services.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este profissional ainda não cadastrou serviços com preço —
                    peça um orçamento descrevendo o que precisa.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {services.map((service) => (
                      <li
                        key={service.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground">
                            {service.title}
                          </p>
                          {service.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-right text-sm">
                          {service.base_price_cents !== null ? (
                            <>
                              <span className="text-muted-foreground">
                                a partir de{" "}
                              </span>
                              <span className="text-lg font-semibold text-foreground">
                                {formatBRL(service.base_price_cents)}
                              </span>
                              <span className="block text-muted-foreground">
                                {service.unit}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-gold-dark">
                              Sob consulta
                            </span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-8" aria-labelledby="avaliacoes">
                <h2
                  id="avaliacoes"
                  className="text-xl font-bold text-foreground"
                >
                  Avaliações
                </h2>
                {reviews.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sem avaliações ainda.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Stars value={review.rating} size={16} />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-foreground">
                            {review.comment}
                          </p>
                        )}
                        {review.tags.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-1">
                            {review.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <Skeleton className="h-40 rounded-lg" />
          )}
        </Page>
      </main>
      <Footer />
    </div>
  );
}
