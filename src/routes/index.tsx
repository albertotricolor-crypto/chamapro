import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Footer, Header, Page } from "@/components/layout";
import { ProfessionalCard } from "@/components/professional-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listCategories, listServices, searchProfessionals } from "@/lib/api";
import type { Category, ProfessionalView } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChamaPro — serviços para sua casa" },
      {
        name: "description",
        content:
          "Encontre eletricistas, encanadores, pintores e mais em Teresina. Peça um orçamento, pague com segurança e avalie.",
      },
      { property: "og:title", content: "ChamaPro — serviços para sua casa" },
      {
        property: "og:description",
        content:
          "Encontre eletricistas, encanadores, pintores e mais em Teresina. Peça um orçamento, pague com segurança e avalie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const NEIGHBORHOODS = [
  "Centro",
  "Jóquei",
  "Ininga",
  "Morada do Sol",
  "Dirceu",
  "Saci",
  "Vermelha",
  "Piçarra",
  "Horto",
  "Fátima",
];

function Index() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalView[]>([]);
  const [minPrices, setMinPrices] = useState<Record<string, number | null>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [neighborhood, setNeighborhood] = useState("");
  const [sort, setSort] = useState<"rating" | "price">("rating");

  useEffect(() => {
    let mounted = true;
    listCategories()
      .then((cats) => {
        if (mounted) setCategories(cats);
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    searchProfessionals({
      category,
      neighborhood: neighborhood.trim() || undefined,
      query: query.trim() || undefined,
      sort,
    })
      .then(async (list) => {
        if (!mounted) return;
        setProfessionals(list);
        const prices: Record<string, number | null> = {};
        await Promise.all(
          list.map(async (p) => {
            const services = await listServices(p.id);
            const priced = services
              .map((s) => s.base_price_cents)
              .filter((v): v is number => v !== null);
            prices[p.id] = priced.length > 0 ? Math.min(...priced) : null;
          }),
        );
        if (mounted) setMinPrices(prices);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os profissionais.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [category, neighborhood, query, sort]);

  const hasFilters = useMemo(
    () => Boolean(category || neighborhood.trim() || query.trim()),
    [category, neighborhood, query],
  );

  const clearFilters = () => {
    setCategory(undefined);
    setNeighborhood("");
    setQuery("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="section-dark">
          <Page className="py-12 md:py-16">
            <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
              Precisa de um profissional{" "}
              <span className="text-gold">em casa</span>?
            </h1>
            <p className="text-muted-on-dark mt-3 max-w-xl text-base">
              Eletricistas, encanadores, pintores e mais em Teresina. Peça um
              orçamento, pague com segurança e só libere o valor depois do
              serviço confirmado.
            </p>
            <div className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-input bg-background p-1.5 pl-4 shadow-sm">
              <Search
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="busca-home" className="sr-only">
                Busque por serviço ou profissional
              </label>
              <input
                id="busca-home"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque por serviço ou profissional"
                className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div
              role="group"
              aria-label="Categorias"
              className="mt-5 flex gap-2 overflow-x-auto pb-1"
            >
              <button
                type="button"
                aria-pressed={category === undefined}
                onClick={() => setCategory(undefined)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                  category === undefined
                    ? "bg-gold text-ink"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={category === cat.slug}
                  onClick={() =>
                    setCategory(category === cat.slug ? undefined : cat.slug)
                  }
                  className={cn(
                    "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                    category === cat.slug
                      ? "bg-gold text-ink"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </Page>
        </section>

        <Page className="py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="bairro" className="sr-only">
                Bairro
              </label>
              <Input
                id="bairro"
                list="bairros-teresina"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Filtrar por bairro — ex.: Centro"
                className="h-10"
              />
              <datalist id="bairros-teresina">
                {NEIGHBORHOODS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="ordenar" className="sr-only">
                Ordenar por
              </label>
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as "rating" | "price")}
              >
                <SelectTrigger id="ordenar" className="h-10 w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Melhor avaliados</SelectItem>
                  <SelectItem value="price">Menor preço</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          <p
            className="mt-4 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {loading
              ? "Buscando profissionais…"
              : `${professionals.length} ${professionals.length === 1 ? "profissional encontrado" : "profissionais encontrados"}`}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-danger-bg px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-lg" />
              ))}
            </div>
          ) : professionals.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nenhum profissional encontrado"
                description="Tente outra busca, outro bairro ou limpe os filtros para ver todos os profissionais disponíveis."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((p) => (
                <ProfessionalCard
                  key={p.id}
                  professional={p}
                  minPriceCents={minPrices[p.id] ?? null}
                />
              ))}
            </div>
          )}

          <section className="mt-16" aria-labelledby="como-funciona">
            <h2
              id="como-funciona"
              className="text-2xl font-bold text-foreground"
            >
              Como funciona
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "1. Busque e compare",
                  text: "Encontre o profissional pela categoria, bairro e avaliação. Veja serviços e preços antes de pedir.",
                },
                {
                  icon: ClipboardList,
                  title: "2. Receba o orçamento",
                  text: "Descreva o serviço e receba o orçamento do profissional. Combine os detalhes no chat da solicitação.",
                },
                {
                  icon: ShieldCheck,
                  title: "3. Pague com segurança",
                  text: "O valor fica retido na plataforma e só é liberado ao profissional depois que você confirma a conclusão.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <step.icon
                    className="size-6 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Page>
      </main>
      <Footer />
    </div>
  );
}
