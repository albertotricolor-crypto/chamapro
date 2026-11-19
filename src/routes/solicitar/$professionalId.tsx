import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import type { Category, ProfessionalView, Service } from "@/lib/types";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/solicitar/$professionalId")({
  head: () => ({
    meta: [{ title: "Pedir orçamento — ChamaPro" }],
  }),
  component: Solicitar,
});

const SHIFTS = [
  { id: "manha", label: "Manhã", hour: 9 },
  { id: "tarde", label: "Tarde", hour: 14 },
  { id: "noite", label: "Noite", hour: 18 },
] as const;

type ShiftId = (typeof SHIFTS)[number]["id"];

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type FormErrors = {
  service?: string;
  description?: string;
  date?: string;
  shift?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  zip?: string;
};

function Solicitar() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="max-w-3xl flex-1 py-6">
          <SolicitarForm />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function SolicitarForm() {
  const { professionalId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalView | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState<ShiftId | "">("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Teresina");
  const [zip, setZip] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [pro, svc, cats] = await Promise.all([
          api.getProfessional(professionalId),
          api.listServices(professionalId),
          api.listCategories(),
        ]);
        if (!alive) return;
        if (!pro) {
          setLoadError("Não encontramos esse profissional. Ele pode ter sido removido.");
          setLoading(false);
          return;
        }
        setProfessional(pro);
        setServices(svc);
        const map: Record<string, string> = {};
        for (const c of cats as Category[]) {
          map[c.slug] = c.name;
        }
        setCategoryNames(map);
      } catch {
        if (!alive) return;
        setLoadError("Não foi possível carregar o profissional. Tente novamente.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [professionalId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );
  const isQuoteOnly = serviceId === "none";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors: FormErrors = {};
    if (!serviceId) nextErrors.service = "Escolha um serviço ou a opção sob consulta.";
    if (description.trim().length < 10) {
      nextErrors.description = "Descreva o problema com pelo menos 10 caracteres.";
    }
    if (!date) nextErrors.date = "Escolha uma data preferida.";
    else if (date < todayIso()) nextErrors.date = "A data não pode ser no passado.";
    if (!shift) nextErrors.shift = "Escolha um período do dia.";
    if (!street.trim()) nextErrors.street = "Informe a rua.";
    if (!neighborhood.trim()) nextErrors.neighborhood = "Informe o bairro.";
    if (!city.trim()) nextErrors.city = "Informe a cidade.";
    if (zip.trim() && !/^\d{5}-?\d{3}$/.test(zip.trim())) {
      nextErrors.zip = "CEP inválido. Use o formato 64000-000.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!user || !professional) return;

    const categorySlug = selectedService?.category_slug ?? professional.categories[0] ?? null;
    if (!categorySlug) {
      setSubmitError("Não foi possível identificar a categoria do serviço. Tente novamente.");
      return;
    }

    setSubmitting(true);
    try {
      const address: {
        street: string;
        number?: string;
        complement?: string;
        neighborhood: string;
        city?: string;
        zip?: string;
      } = { street: street.trim(), neighborhood: neighborhood.trim(), city: city.trim() };
      if (number.trim()) address.number = number.trim();
      if (complement.trim()) address.complement = complement.trim();
      if (zip.trim()) address.zip = zip.trim();

      const payload: {
        professionalId: string;
        serviceId?: string;
        categorySlug: string;
        description: string;
        scheduledAt?: string;
        address: typeof address;
      } = {
        professionalId: professional.id,
        categorySlug,
        description: description.trim(),
        address,
      };
      if (selectedService) payload.serviceId = selectedService.id;
      if (date && shift) {
        const shiftHour = SHIFTS.find((s) => s.id === shift)?.hour ?? 9;
        payload.scheduledAt = new Date(
          `${date}T${String(shiftHour).padStart(2, "0")}:00:00-03:00`,
        ).toISOString();
      }
      const request = await api.createRequest(payload);
      void navigate({ to: "/solicitacoes/$id", params: { id: request.id } });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (loadError || !professional) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">Profissional não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Buscar profissionais</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Pedir orçamento</h1>

      <Card className="mt-4">
        <CardContent className="flex items-start gap-4 pt-6">
          {professional.photo_url ? (
            <img
              src={professional.photo_url}
              alt={`Foto de ${professional.display_name}`}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-muted-foreground">
              {professional.display_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-foreground">{professional.display_name}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Stars value={professional.rating_avg} size={16} />
              {professional.rating_avg > 0 ? professional.rating_avg.toFixed(1) : "Sem avaliações ainda"}
              {professional.reviews_count > 0 ? ` · ${professional.reviews_count} avaliações` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {professional.categories.map((c) => categoryNames[c] ?? c).join(" · ")}
              {professional.service_area.length > 0 ? ` · Atende em ${professional.service_area.join(", ")}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Escolha o serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="radiogroup" aria-label="Serviço" className="space-y-3">
              {services.map((service) => {
                const selected = serviceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setServiceId(service.id)}
                    className={`flex w-full items-start justify-between gap-4 rounded-md border p-4 text-left transition-colors ${
                      selected ? "border-primary bg-accent" : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <span>
                      <span className="block font-medium text-foreground">{service.title}</span>
                      {service.description ? (
                        <span className="mt-1 block text-sm text-muted-foreground">{service.description}</span>
                      ) : null}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {categoryNames[service.category_slug] ?? service.category_slug}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {service.base_price_cents != null
                        ? `${formatBRL(service.base_price_cents)} ${service.unit}`
                        : "Sob consulta"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={isQuoteOnly}
                onClick={() => setServiceId("none")}
                className={`w-full rounded-md border p-4 text-left transition-colors ${
                  isQuoteOnly ? "border-primary bg-accent" : "border-border bg-card hover:border-primary"
                }`}
              >
                <span className="block font-medium text-foreground">Não sei exatamente o que preciso</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Descreva o problema abaixo e receba um orçamento sob consulta.
                </span>
              </button>
            </div>
            {errors.service ? <p className="mt-2 text-sm text-destructive">{errors.service}</p> : null}
            {isQuoteOnly ? (
              <p className="mt-3 rounded-md bg-gold-bg px-3 py-2 text-sm text-gold-dark">
                Serviço sob consulta: o preço vem no orçamento do profissional, antes de qualquer pagamento.
              </p>
            ) : null}
            {services.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Este profissional ainda não cadastrou serviços com preço. Descreva o problema e receba um orçamento sob
                consulta.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descreva o problema</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="description">O que precisa ser feito?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: A tomada da cozinha parou de funcionar e o disjuntor desarma quando ligo o micro-ondas."
              rows={5}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : undefined}
              className="mt-2"
            />
            {errors.description ? (
              <p id="description-error" className="mt-2 text-sm text-destructive">
                {errors.description}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Data preferida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                min={todayIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={Boolean(errors.date)}
                className="mt-2"
              />
              {errors.date ? <p className="mt-2 text-sm text-destructive">{errors.date}</p> : null}
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4" /> Período do dia (horário de Teresina)
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Período do dia">
                {SHIFTS.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant={shift === s.id ? "default" : "outline"}
                    aria-pressed={shift === s.id}
                    onClick={() => setShift(s.id)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              {errors.shift ? <p className="mt-2 text-sm text-destructive">{errors.shift}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Endereço do serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <Label htmlFor="street">Rua / Avenida *</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex.: Rua São José"
                  aria-invalid={Boolean(errors.street)}
                  className="mt-2"
                />
                {errors.street ? <p className="mt-2 text-sm text-destructive">{errors.street}</p> : null}
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apartamento, casa, ponto de referência"
                className="mt-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex.: Centro"
                  aria-invalid={Boolean(errors.neighborhood)}
                  className="mt-2"
                />
                {errors.neighborhood ? <p className="mt-2 text-sm text-destructive">{errors.neighborhood}</p> : null}
              </div>
              <div>
                <Label htmlFor="zip">CEP</Label>
                <Input
                  id="zip"
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="64000-000"
                  aria-invalid={Boolean(errors.zip)}
                  className="mt-2"
                />
                {errors.zip ? <p className="mt-2 text-sm text-destructive">{errors.zip}</p> : null}
              </div>
            </div>
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-invalid={Boolean(errors.city)}
                className="mt-2"
              />
              {errors.city ? <p className="mt-2 text-sm text-destructive">{errors.city}</p> : null}
            </div>
          </CardContent>
        </Card>

        {submitError ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Pedir orçamento"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Você só paga depois de aceitar o orçamento. O valor fica retido até a conclusão do serviço.
        </p>
      </form>
    </>
  );
}
