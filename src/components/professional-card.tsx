import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { ProfessionalView } from "@/lib/types";
import { formatBRL, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/stars";

export function ProfessionalCard({
  professional,
  minPriceCents,
}: {
  professional: ProfessionalView;
  minPriceCents?: number | null;
}) {
  const areas = professional.service_area.slice(0, 3);
  const extraAreas = professional.service_area.length - areas.length;
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(16,24,40,0.16)]">
      <div className="flex items-start gap-3">
        {professional.photo_url ? (
          <img
            src={professional.photo_url}
            alt={`Foto de ${professional.display_name}`}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials(professional.display_name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {professional.display_name}
          </h3>
          <p
            className="mt-0.5 flex items-center gap-1.5 text-sm"
            aria-label={`Nota ${professional.rating_avg.toFixed(1).replace(".", ",")} de 5, ${professional.reviews_count} avaliações`}
          >
            <Stars value={professional.rating_avg} size={16} />
            <span className="font-semibold text-gold-dark">
              {professional.rating_avg > 0
                ? professional.rating_avg.toFixed(1).replace(".", ",")
                : "—"}
            </span>
            <span className="text-muted-foreground">
              ({professional.reviews_count}{" "}
              {professional.reviews_count === 1 ? "avaliação" : "avaliações"})
            </span>
          </p>
        </div>
      </div>
      {professional.bio && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {professional.bio}
        </p>
      )}
      {areas.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {areas.join(", ")}
          {extraAreas > 0 ? ` e mais ${extraAreas}` : ""}
        </p>
      )}
      <div className="mt-4 flex items-end justify-between gap-2 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {minPriceCents !== undefined && minPriceCents !== null ? (
            <>
              a partir de{" "}
              <span className="text-lg font-semibold text-foreground">
                {formatBRL(minPriceCents)}
              </span>
            </>
          ) : (
            <span className="font-semibold text-gold-dark">Sob consulta</span>
          )}
        </p>
        <Button asChild size="sm">
          <Link to="/profissionais/$id" params={{ id: professional.id }}>
            Ver perfil
          </Link>
        </Button>
      </div>
    </article>
  );
}
