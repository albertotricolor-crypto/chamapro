import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Footer, Header, Page } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { Stars } from "@/components/stars";
import { Timeline } from "@/components/timeline";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RequestStatus } from "@/lib/types";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Design — ChamaPro" },
      {
        name: "description",
        content: "Mostruário dos primitivos de interface do ChamaPro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Design,
});

const ALL_STATUSES: RequestStatus[] = [
  "sent",
  "quoted",
  "accepted",
  "paid",
  "in_progress",
  "done_pending_confirmation",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10" aria-label={title}>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        {children}
      </div>
    </section>
  );
}

function Design() {
  const [rating, setRating] = useState(4);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Page className="py-8">
          <h1 className="text-2xl font-bold text-foreground">
            Mostruário de primitivos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Botões, badges, estrelas, campos, cards e estados do ChamaPro.
          </p>

          <Section title="Botões">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Fantasma</Button>
              <Button variant="destructive">Perigo</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm">Pequeno</Button>
              <Button size="lg">Grande</Button>
              <Button disabled>Desativado</Button>
              <Button disabled aria-busy="true">
                Carregando…
              </Button>
            </div>
          </Section>

          <Section title="Badges de status">
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>Padrão</Badge>
              <Badge variant="secondary">Secundário</Badge>
              <Badge variant="outline">Contorno</Badge>
              <Badge variant="destructive">Destrutivo</Badge>
            </div>
          </Section>

          <Section title="Estrelas">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Leitura (4,8 de 5)
                </p>
                <Stars value={4.8} size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Editável — sua nota: {rating} de 5
                </p>
                <Stars
                  value={rating}
                  size={32}
                  editable
                  onChange={setRating}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Sem avaliações
                </p>
                <Stars value={0} size={16} />
              </div>
            </div>
          </Section>

          <Section title="Campos">
            <div className="grid max-w-xl gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="design-nome">Nome</Label>
                <Input
                  id="design-nome"
                  placeholder="Seu nome"
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="design-busca">Busca</Label>
                <Input
                  id="design-busca"
                  type="search"
                  placeholder="Busque por serviço ou profissional"
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="design-erro">Campo com erro</Label>
                <Input
                  id="design-erro"
                  defaultValue="valor inválido"
                  aria-invalid="true"
                  aria-describedby="design-erro-msg"
                  className="h-12 border-destructive"
                />
                <p id="design-erro-msg" className="text-sm text-destructive">
                  Informe um valor válido.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="design-desativado">Desativado</Label>
                <Input
                  id="design-desativado"
                  disabled
                  placeholder="Campo desativado"
                  className="h-12"
                />
              </div>
            </div>
          </Section>

          <Section title="Cards">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Card de exemplo</CardTitle>
                  <CardDescription>
                    Descrição curta do conteúdo do card.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Corpo do card com texto de apoio e ações abaixo.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm">Ação principal</Button>
                    <Button size="sm" variant="outline">
                      Ação secundária
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="section-dark">
                <CardHeader>
                  <CardTitle className="text-white">
                    Card em seção escura
                  </CardTitle>
                  <CardDescription className="text-muted-on-dark">
                    Variante sobre fundo escuro, com destaque em dourado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white">
                    Texto claro sobre o fundo escuro, com{" "}
                    <span className="font-semibold text-gold">destaque</span>.
                  </p>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section title="Linha do tempo">
            <Timeline current="paid" />
          </Section>

          <Section title="Estado vazio">
            <EmptyState
              title="Nenhum profissional encontrado"
              description="Tente outra busca ou limpe os filtros para ver todos os profissionais."
              action={<Button variant="outline">Limpar filtros</Button>}
            />
          </Section>
        </Page>
      </main>
      <Footer />
    </div>
  );
}
