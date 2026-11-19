import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/cadastro-profissional")({
  head: () => ({
    meta: [
      { title: "Cadastro de profissional — ChamaPro" },
      {
        name: "description",
        content: "Cadastre-se como profissional do ChamaPro em Teresina e receba solicitações de serviços.",
      },
    ],
  }),
  component: CadastroProfissional,
});

/* ------------------------------------------------------------------ */
/* Tipos locais (o contrato de @/lib/types ainda não existe no repo;   */
/* campos copiados da migration 20261118214104).                       */
/* ------------------------------------------------------------------ */

type DocumentType = "cpf" | "cnpj_mei";
type ProfessionalStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
type Unit = "por serviço" | "por hora" | "por m²";

type FormErrors = {
  displayName?: string;
  phone?: string;
  categories?: string;
  serviceTitle?: string;
  servicePrice?: string;
  serviceArea?: string;
  payoutKey?: string;
  documentNumber?: string;
};

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface ProfessionalRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  categories: string[];
  service_area: string[];
  document_type: DocumentType | null;
  document_number: string | null;
  documents_status: string;
  payout_key: string | null;
  status: ProfessionalStatus;
  rejection_reason: string | null;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

const BAIRROS_TERESINA = [
  "Centro",
  "Jóquei",
  "Ininga",
  "Horto",
  "Morada do Sol",
  "São Cristóvão",
  "Dirceu Arcoverde",
  "Mocambinho",
  "Santa Maria da Codipi",
  "Buenos Aires",
  "Piçarra",
  "Vermelha",
  "Tabuleta",
  "Gurupi",
  "Renascença",
  "Fátima",
  "Monte Castelo",
  "Três Andares",
];

const STATUS_LABEL: Record<ProfessionalStatus, string> = {
  draft: "Rascunho",
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  suspended: "Suspenso",
};

const STEP_TITLES = [
  "Seus dados",
  "Categorias e primeiro serviço",
  "Área de atendimento e repasse",
  "Documentos",
  "Revisão",
];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRLToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  if (cleaned.trim() === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function PageHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold text-foreground">
          ChamaPro
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/painel" className="text-muted-foreground hover:text-foreground">
            Painel do profissional
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CadastroProfissional() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [existing, setExisting] = useState<ProfessionalRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [editingRejected, setEditingRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Etapa 1
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  // Etapa 2
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [serviceTitle, setServiceTitle] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceNoPrice, setServiceNoPrice] = useState(false);
  const [serviceUnit, setServiceUnit] = useState<Unit>("por serviço");
  // Etapa 3
  const [serviceArea, setServiceArea] = useState<string[]>([]);
  const [payoutKey, setPayoutKey] = useState("");
  // Etapa 4
  const [documentType, setDocumentType] = useState<DocumentType>("cpf");
  const [documentNumber, setDocumentNumber] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const [profileRes, proRes, catRes] = await Promise.all([
        supabase.from("profiles").select("id,name,email,phone,role").eq("id", uid).maybeSingle(),
        supabase.from("professionals").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("categories").select("id,name,slug").eq("active", true).order("name"),
      ]);
      if (cancelled) return;
      if (profileRes.error || proRes.error || catRes.error) {
        setLoadError("Não foi possível carregar seus dados. Tente novamente.");
      } else {
        const p = (profileRes.data ?? null) as unknown as ProfileRow | null;
        setProfile(p);
        const pro = (proRes.data ?? null) as unknown as ProfessionalRow | null;
        setExisting(pro);
        setCategories(((catRes.data ?? []) as unknown as CategoryRow[]));
        if (p) {
          setDisplayName(p.name);
          setPhone(p.phone ?? "");
        }
        if (pro) {
          setDisplayName(pro.display_name);
          setBio(pro.bio ?? "");
          setSelectedCategories(pro.categories);
          setServiceArea(pro.service_area);
          setPayoutKey(pro.payout_key ?? "");
          if (pro.document_type) setDocumentType(pro.document_type);
          setDocumentNumber(pro.document_number ?? "");
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function validateStep(s: number): boolean {
    const e: FormErrors = {};
    if (s === 0) {
      if (displayName.trim().length < 3) e.displayName = "Informe o nome de exibição (mínimo 3 caracteres).";
      if (phone.trim().length < 8) e.phone = "Informe um telefone válido com DDD.";
    }
    if (s === 1) {
      if (selectedCategories.length === 0) e.categories = "Escolha pelo menos uma categoria.";
      if (serviceTitle.trim().length < 3) e.serviceTitle = "Informe o título do seu primeiro serviço.";
      if (!serviceNoPrice && parseBRLToCents(servicePrice) === null)
        e.servicePrice = "Informe um preço válido em R$ ou marque “sob consulta”.";
    }
    if (s === 2) {
      if (serviceArea.length === 0) e.serviceArea = "Escolha pelo menos um bairro de atendimento.";
      if (payoutKey.trim().length < 3) e.payoutKey = "Informe sua chave Pix para receber os repasses.";
    }
    if (s === 3) {
      const digits = documentNumber.replace(/\D/g, "");
      if (documentType === "cpf" && digits.length !== 11) e.documentNumber = "O CPF precisa ter 11 dígitos.";
      if (documentType === "cnpj_mei" && digits.length !== 14) e.documentNumber = "O CNPJ-MEI precisa ter 14 dígitos.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 4));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!userId || !validateStep(3)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Se a conta ainda é de cliente, passa a ser de profissional.
      if (profile && profile.role === "client") {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "professional", phone: phone.trim() || null })
          .eq("id", userId);
        if (error) throw new Error("Não foi possível atualizar sua conta para profissional.");
      } else if (profile) {
        await supabase.from("profiles").update({ phone: phone.trim() || null }).eq("id", userId);
      }

      const basePriceCents = serviceNoPrice ? null : parseBRLToCents(servicePrice);
      let professionalId: string;

      if (existing && existing.status === "rejected") {
        const { data, error } = await supabase
          .from("professionals")
          .update({
            display_name: displayName.trim(),
            bio: bio.trim() || null,
            categories: selectedCategories,
            service_area: serviceArea,
            payout_key: payoutKey.trim(),
            document_type: documentType,
            document_number: documentNumber.replace(/\D/g, ""),
            documents_status: "pending",
            status: "pending",
            rejection_reason: null,
          })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error || !data) throw new Error("Não foi possível reenviar seu cadastro.");
        professionalId = (data as { id: string }).id;
      } else {
        const { data, error } = await supabase
          .from("professionals")
          .insert({
            user_id: userId,
            display_name: displayName.trim(),
            bio: bio.trim() || null,
            categories: selectedCategories,
            service_area: serviceArea,
            payout_key: payoutKey.trim(),
            document_type: documentType,
            document_number: documentNumber.replace(/\D/g, ""),
            documents_status: "pending",
            status: "pending",
          })
          .select("id")
          .single();
        if (error || !data) throw new Error("Não foi possível enviar seu cadastro.");
        professionalId = (data as { id: string }).id;
      }

      // Primeiro serviço (categoria = primeira categoria escolhida).
      const firstCategory = selectedCategories[0];
      if (firstCategory) {
        const { error } = await supabase.from("services").insert({
          professional_id: professionalId,
          category_slug: firstCategory,
          title: serviceTitle.trim(),
          description: null,
          base_price_cents: basePriceCents,
          unit: serviceUnit,
          active: true,
        });
        if (error) throw new Error("Cadastro enviado, mas o primeiro serviço não foi criado. Crie-o no painel.");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar o cadastro.");
    } finally {
      setSubmitting(false);
    }
  }

  const showStatusCard = existing && existing.status !== "rejected" && !editingRejected;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !userId ? (
          <Card>
            <CardHeader>
              <CardTitle>Faça login para continuar</CardTitle>
              <CardDescription>
                Você precisa de uma conta para se cadastrar como profissional do ChamaPro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/entrar">Entrar ou criar conta</Link>
              </Button>
            </CardContent>
          </Card>
        ) : loadError ? (
          <Card>
            <CardHeader>
              <CardTitle>Algo deu errado</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        ) : submitted ? (
          <Card className="text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="mt-2 text-2xl">Cadastro enviado!</CardTitle>
              <CardDescription>
                Vamos analisar em até 72h. Você acompanha o andamento no seu painel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : showStatusCard && existing ? (
          <Card>
            <CardHeader>
              <CardTitle>Seu cadastro de profissional</CardTitle>
              <CardDescription>
                Você já tem um cadastro. Acompanhe o andamento no painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={existing.status === "approved" ? "default" : "secondary"}>
                  {STATUS_LABEL[existing.status]}
                </Badge>
                <Badge variant="outline">Documentos: {existing.documents_status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Nome de exibição: <span className="font-medium text-foreground">{existing.display_name}</span>
              </p>
              {existing.status === "pending" && (
                <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  Seu cadastro está em análise. O prazo é de até 72h.
                </p>
              )}
              <Button asChild>
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {existing && existing.status === "rejected" && !editingRejected && (
              <Card className="mb-6 border-destructive">
                <CardHeader>
                  <CardTitle>Cadastro recusado</CardTitle>
                  <CardDescription>
                    {existing.rejection_reason
                      ? `Motivo: ${existing.rejection_reason}`
                      : "Seu cadastro foi recusado. Revise os dados e reenvie."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRejected(true);
                      setStep(0);
                    }}
                  >
                    Editar e reenviar cadastro
                  </Button>
                </CardContent>
              </Card>
            )}
            {( !existing || existing.status === "rejected") && (editingRejected || !existing) && (
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cadastro de profissional</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Etapa {step + 1} de 5 — {STEP_TITLES[step]}
                </p>
                <div
                  className="mt-4 flex gap-1"
                  role="progressbar"
                  aria-valuenow={step + 1}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-label={`Etapa ${step + 1} de 5`}
                >
                  {STEP_TITLES.map((t, i) => (
                    <div
                      key={t}
                      className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{STEP_TITLES[step]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {step === 0 && (
                      <fieldset className="space-y-5">
                        <legend className="sr-only">Dados</legend>
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Nome de exibição</Label>
                          <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ex.: João Silva — Eletricista"
                            aria-invalid={Boolean(errors.displayName)}
                            aria-describedby={errors.displayName ? "err-displayName" : undefined}
                          />
                          {errors.displayName && (
                            <p id="err-displayName" className="text-sm text-destructive">{errors.displayName}</p>
                          )}
                          <p className="text-sm text-muted-foreground">É o nome que os clientes veem no seu perfil público.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Sobre você</Label>
                          <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Conte sua experiência, há quantos anos trabalha na área e o que você atende."
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone / WhatsApp</Label>
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(86) 99999-9999"
                            inputMode="tel"
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? "err-phone" : undefined}
                          />
                          {errors.phone && (
                            <p id="err-phone" className="text-sm text-destructive">{errors.phone}</p>
                          )}
                        </div>
                      </fieldset>
                    )}

                    {step === 1 && (
                      <fieldset className="space-y-5">
                        <legend className="sr-only">Categorias e primeiro serviço</legend>
                        <div className="space-y-2">
                          <Label>Categorias que você atende</Label>
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias">
                            {categories.map((c) => {
                              const active = selectedCategories.includes(c.slug);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggle(selectedCategories, c.slug, setSelectedCategories)}
                                  className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input bg-card text-foreground hover:bg-muted"
                                  }`}
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                          {errors.categories && <p className="text-sm text-destructive">{errors.categories}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serviceTitle">Primeiro serviço</Label>
                          <Input
                            id="serviceTitle"
                            value={serviceTitle}
                            onChange={(e) => setServiceTitle(e.target.value)}
                            placeholder="Ex.: Instalação de chuveiro elétrico"
                            aria-invalid={Boolean(errors.serviceTitle)}
                            aria-describedby={errors.serviceTitle ? "err-serviceTitle" : undefined}
                          />
                          {errors.serviceTitle && (
                            <p id="err-serviceTitle" className="text-sm text-destructive">{errors.serviceTitle}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Depois você adiciona outros serviços no painel.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="servicePrice">Preço base (R$)</Label>
                            <Input
                              id="servicePrice"
                              value={servicePrice}
                              onChange={(e) => setServicePrice(e.target.value)}
                              placeholder="Ex.: 120,00"
                              inputMode="decimal"
                              disabled={serviceNoPrice}
                              aria-invalid={Boolean(errors.servicePrice)}
                              aria-describedby={errors.servicePrice ? "err-servicePrice" : undefined}
                            />
                            {errors.servicePrice && (
                              <p id="err-servicePrice" className="text-sm text-destructive">{errors.servicePrice}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="serviceUnit">Cobrança</Label>
                            <Select value={serviceUnit} onValueChange={(v) => setServiceUnit(v as Unit)}>
                              <SelectTrigger id="serviceUnit">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="por serviço">Por serviço</SelectItem>
                                <SelectItem value="por hora">Por hora</SelectItem>
                                <SelectItem value="por m²">Por m²</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={serviceNoPrice}
                            onChange={(e) => setServiceNoPrice(e.target.checked)}
                            className="h-4 w-4 accent-primary"
                          />
                          Preço sob consulta (o valor é definido no orçamento)
                        </label>
                      </fieldset>
                    )}

                    {step === 2 && (
                      <fieldset className="space-y-5">
                        <legend className="sr-only">Área de atendimento e repasse</legend>
                        <div className="space-y-2">
                          <Label>Bairros de Teresina que você atende</Label>
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Bairros de atendimento">
                            {BAIRROS_TERESINA.map((b) => {
                              const active = serviceArea.includes(b);
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggle(serviceArea, b, setServiceArea)}
                                  className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-input bg-card text-foreground hover:bg-muted"
                                  }`}
                                >
                                  {b}
                                </button>
                              );
                            })}
                          </div>
                          {errors.serviceArea && <p className="text-sm text-destructive">{errors.serviceArea}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payoutKey">Chave Pix para receber os repasses</Label>
                          <Input
                            id="payoutKey"
                            value={payoutKey}
                            onChange={(e) => setPayoutKey(e.target.value)}
                            placeholder="CPF, e-mail, telefone ou chave aleatória"
                            aria-invalid={Boolean(errors.payoutKey)}
                            aria-describedby={errors.payoutKey ? "err-payoutKey" : undefined}
                          />
                          {errors.payoutKey && (
                            <p id="err-payoutKey" className="text-sm text-destructive">{errors.payoutKey}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Os valores dos serviços concluídos são repassados para essa chave, descontada a comissão da plataforma.
                          </p>
                        </div>
                      </fieldset>
                    )}

                    {step === 3 && (
                      <fieldset className="space-y-5">
                        <legend className="sr-only">Documentos</legend>
                        <div className="space-y-2">
                          <Label htmlFor="documentType">Tipo de documento</Label>
                          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                            <SelectTrigger id="documentType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj_mei">CNPJ-MEI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="documentNumber">
                            {documentType === "cpf" ? "Número do CPF" : "Número do CNPJ-MEI"}
                          </Label>
                          <Input
                            id="documentNumber"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0001-00"}
                            inputMode="numeric"
                            aria-invalid={Boolean(errors.documentNumber)}
                            aria-describedby={errors.documentNumber ? "err-documentNumber" : undefined}
                          />
                          {errors.documentNumber && (
                            <p id="err-documentNumber" className="text-sm text-destructive">{errors.documentNumber}</p>
                          )}
                        </div>
                        <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          Seus documentos ficam só com a plataforma e nunca aparecem no seu perfil público.
                        </p>
                      </fieldset>
                    )}

                    {step === 4 && (
                      <div className="space-y-4">
                        <dl className="space-y-3 text-sm">
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Nome de exibição</dt>
                            <dd className="font-medium text-foreground">{displayName}</dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Telefone</dt>
                            <dd className="font-medium text-foreground">{phone}</dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Categorias</dt>
                            <dd className="text-right font-medium text-foreground">
                              {selectedCategories
                                .map((s) => categories.find((c) => c.slug === s)?.name ?? s)
                                .join(", ")}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Primeiro serviço</dt>
                            <dd className="text-right font-medium text-foreground">
                              {serviceTitle} —{" "}
                              {serviceNoPrice
                                ? "sob consulta"
                                : `${formatBRL(parseBRLToCents(servicePrice) ?? 0)} ${serviceUnit}`}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Bairros atendidos</dt>
                            <dd className="text-right font-medium text-foreground">{serviceArea.join(", ")}</dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Chave Pix</dt>
                            <dd className="font-medium text-foreground">{payoutKey}</dd>
                          </div>
                          <div className="flex justify-between gap-4 border-b border-border pb-2">
                            <dt className="text-muted-foreground">Documento</dt>
                            <dd className="font-medium text-foreground">
                              {documentType === "cpf" ? "CPF" : "CNPJ-MEI"} — {documentNumber}
                            </dd>
                          </div>
                        </dl>
                        <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                          Ao enviar, seu cadastro vai para análise da plataforma. O prazo é de até 72h.
                        </p>
                        {submitError && (
                          <p role="alert" className="text-sm text-destructive">{submitError}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                      </Button>
                      {step < 4 ? (
                        <Button onClick={next}>
                          Continuar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={() => void submit()} disabled={submitting}>
                          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <UserRound className="mr-2 h-4 w-4" />
                          Enviar para análise
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
