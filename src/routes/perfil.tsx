import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CreditCard, MapPin, UserRound } from "lucide-react";
import * as api from "@/lib/api";
import { RequireAuth, useAuth } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/format";
import type { Address, Payment, Profile } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Footer, Header, LoadingSkeleton, Page } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Meu perfil — ChamaPro" }],
  }),
  component: Perfil,
});

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  held: "Retido",
  released: "Liberado",
  refunded: "Reembolsado",
  failed: "Falhou",
};

function Perfil() {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <Page className="max-w-3xl flex-1 py-6">
          <PerfilInner />
        </Page>
        <Footer />
      </div>
    </RequireAuth>
  );
}

function PerfilInner() {
  const { role } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [payments, setPayments] = useState<(Payment & { professionalName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newComplement, setNewComplement] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newCity, setNewCity] = useState("Teresina");
  const [newZip, setNewZip] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [profileData, addressData, paymentData, pros] = await Promise.all([
          api.getMyProfile(),
          api.listAddresses(),
          api.listMyPayments(),
          api.searchProfessionals({}),
        ]);
        if (!alive) return;
        if (!profileData) {
          setError("Não foi possível carregar seu perfil.");
          setLoading(false);
          return;
        }
        setProfile(profileData);
        setName(profileData.name);
        setPhone(profileData.phone ?? "");
        setAddresses(addressData);
        const proNames: Record<string, string> = {};
        for (const p of pros) proNames[p.id] = p.display_name;
        const enriched = await Promise.all(
          paymentData.map(async (payment) => {
            const detail = await api.getRequestDetail(payment.request_id);
            return {
              ...payment,
              professionalName: detail ? (proNames[detail.request.professional_id] ?? "Profissional") : "Profissional",
            };
          }),
        );
        if (!alive) return;
        setPayments(enriched);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar seu perfil.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      await api.updateMyProfile({ name: name.trim(), phone: phone.trim() ? phone.trim() : null });
      setProfileMessage("Dados salvos.");
      setProfile((prev) => (prev ? { ...prev, name: name.trim(), phone: phone.trim() || null } : prev));
    } catch {
      setProfileMessage("Não foi possível salvar. Tente novamente.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleCreateAddress(event: React.FormEvent) {
    event.preventDefault();
    setAddressError(null);
    if (!newStreet.trim()) {
      setAddressError("Informe a rua.");
      return;
    }
    if (!newNeighborhood.trim()) {
      setAddressError("Informe o bairro.");
      return;
    }
    setAddressSaving(true);
    try {
      const input: {
        label?: string;
        street: string;
        number?: string;
        complement?: string;
        neighborhood: string;
        city?: string;
        zip?: string;
      } = {
        street: newStreet.trim(),
        neighborhood: newNeighborhood.trim(),
        city: newCity.trim() ? newCity.trim() : "Teresina",
      };
      if (newLabel.trim()) input.label = newLabel.trim();
      if (newNumber.trim()) input.number = newNumber.trim();
      if (newComplement.trim()) input.complement = newComplement.trim();
      if (newZip.trim()) input.zip = newZip.trim();
      const created = await api.createAddress(input);
      setAddresses((prev) => [...prev, created]);
      setNewLabel("");
      setNewStreet("");
      setNewNumber("");
      setNewComplement("");
      setNewNeighborhood("");
      setNewCity("Teresina");
      setNewZip("");
    } catch {
      setAddressError("Não foi possível salvar o endereço. Tente novamente.");
    } finally {
      setAddressSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">Não foi possível carregar o perfil</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar à home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">Seus dados, endereços e histórico de pagamentos.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {role === "professional" ? (
          <Button asChild variant="outline">
            <Link to="/painel">Ir para o painel do profissional</Link>
          </Button>
        ) : null}
        {role === "admin" ? (
          <Button asChild variant="outline">
            <Link to="/admin">Ir para o painel do administrador</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to="/solicitacoes">Minhas solicitações</Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" /> Dados da conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={profile.email} disabled className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
              </div>
              <div>
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="mt-2"
                />
              </div>
              {profileMessage ? <p className="text-sm text-success">{profileMessage}</p> : null}
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? "Salvando..." : "Salvar dados"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Meus endereços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum endereço salvo. Adicione um endereço para agilizar os próximos pedidos.
              </p>
            ) : (
              <ul className="space-y-2">
                {addresses.map((address) => (
                  <li key={address.id} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {address.label ?? "Endereço"}
                      {address.is_default ? (
                        <Badge variant="secondary" className="ml-2">
                          Padrão
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground">
                      {[address.street, address.number ? `nº ${address.number}` : null, address.complement]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    <p className="text-muted-foreground">
                      {address.neighborhood} — {address.city}
                      {address.zip ? ` · CEP ${address.zip}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleCreateAddress} className="space-y-4 border-t border-border pt-4">
              <p className="font-medium text-foreground">Adicionar endereço</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-label">Rótulo (opcional)</Label>
                  <Input
                    id="new-label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Casa, trabalho..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="new-zip">CEP</Label>
                  <Input
                    id="new-zip"
                    inputMode="numeric"
                    value={newZip}
                    onChange={(e) => setNewZip(e.target.value)}
                    placeholder="64000-000"
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <div>
                  <Label htmlFor="new-street">Rua / Avenida *</Label>
                  <Input
                    id="new-street"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="new-number">Número</Label>
                  <Input
                    id="new-number"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="new-complement">Complemento</Label>
                <Input
                  id="new-complement"
                  value={newComplement}
                  onChange={(e) => setNewComplement(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-neighborhood">Bairro *</Label>
                  <Input
                    id="new-neighborhood"
                    value={newNeighborhood}
                    onChange={(e) => setNewNeighborhood(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="new-city">Cidade</Label>
                  <Input id="new-city" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="mt-2" />
                </div>
              </div>
              {addressError ? (
                <p role="alert" className="text-sm text-destructive">
                  {addressError}
                </p>
              ) : null}
              <Button type="submit" disabled={addressSaving}>
                {addressSaving ? "Salvando..." : "Adicionar endereço"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Histórico de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                title="Nenhum pagamento ainda"
                description="Seus pagamentos aparecem aqui depois que você pagar uma solicitação."
                action={
                  <Button asChild>
                    <Link to="/solicitacoes">Ver minhas solicitações</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{payment.professionalName}</p>
                      <p className="text-muted-foreground">
                        {payment.method === "pix" ? "Pix" : "Cartão"} · {formatDateTime(payment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}</Badge>
                      <span className="font-semibold text-foreground">{formatBRL(payment.amount_cents)}</span>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/solicitacoes/$id" params={{ id: payment.request_id }}>
                          Ver solicitação
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
