import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  Address,
  Category,
  ChatMessage,
  Dispute,
  Payment,
  Payout,
  Professional,
  ProfessionalView,
  Profile,
  Quote,
  RequestStatus,
  Review,
  Service,
  ServiceRequest,
} from "@/lib/types";

type Db = Database["public"]["Tables"];

function throwIf(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Você precisa entrar para continuar.");
  }
  return data.user.id;
}

function mapProfile(row: Db["profiles"]["Row"]): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar_url: row.avatar_url,
    role: row.role as Profile["role"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCategory(row: Db["categories"]["Row"]): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapProfessionalView(
  row: Database["public"]["Views"]["public_professionals"]["Row"],
): ProfessionalView {
  return {
    id: row.id ?? "",
    user_id: row.user_id ?? "",
    display_name: row.display_name ?? "",
    bio: row.bio,
    photo_url: row.photo_url,
    categories: row.categories ?? [],
    service_area: row.service_area ?? [],
    rating_avg: row.rating_avg ?? 0,
    reviews_count: row.reviews_count ?? 0,
    status: row.status ?? "",
    created_at: row.created_at ?? "",
  };
}

function mapProfessional(row: Db["professionals"]["Row"]): Professional {
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio,
    photo_url: row.photo_url,
    categories: row.categories,
    service_area: row.service_area,
    document_type: row.document_type as Professional["document_type"],
    document_number: row.document_number,
    documents_status:
      row.documents_status as Professional["documents_status"],
    payout_key: row.payout_key,
    payout_bank: row.payout_bank,
    payout_account: row.payout_account,
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    status: row.status as Professional["status"],
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapService(row: Db["services"]["Row"]): Service {
  return {
    id: row.id,
    professional_id: row.professional_id,
    category_slug: row.category_slug,
    title: row.title,
    description: row.description,
    base_price_cents: row.base_price_cents,
    unit: row.unit as Service["unit"],
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAddress(row: Db["addresses"]["Row"]): Address {
  return {
    id: row.id,
    user_id: row.user_id,
    label: row.label,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    zip: row.zip,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRequest(row: Db["service_requests"]["Row"]): ServiceRequest {
  return {
    id: row.id,
    client_id: row.client_id,
    professional_id: row.professional_id,
    service_id: row.service_id,
    category_slug: row.category_slug,
    description: row.description,
    photos: row.photos,
    address_id: row.address_id,
    address_snapshot: row.address_snapshot,
    scheduled_at: row.scheduled_at,
    status: row.status as RequestStatus,
    cancel_reason: row.cancel_reason,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapQuote(row: Db["quotes"]["Row"]): Quote {
  return {
    id: row.id,
    request_id: row.request_id,
    professional_id: row.professional_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    message: row.message,
    expires_at: row.expires_at,
    status: row.status as Quote["status"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPayment(row: Db["payments"]["Row"]): Payment {
  return {
    id: row.id,
    request_id: row.request_id,
    client_id: row.client_id,
    quote_id: row.quote_id,
    method: row.method as Payment["method"],
    amount_cents: row.amount_cents,
    platform_fee_cents: row.platform_fee_cents,
    professional_amount_cents: row.professional_amount_cents,
    gateway_fee_cents: row.gateway_fee_cents,
    currency: row.currency,
    status: row.status as Payment["status"],
    gateway_ref: row.gateway_ref,
    paid_at: row.paid_at,
    released_at: row.released_at,
    refunded_at: row.refunded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPayout(row: Db["payouts"]["Row"]): Payout {
  return {
    id: row.id,
    professional_id: row.professional_id,
    payment_id: row.payment_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status as Payout["status"],
    failure_reason: row.failure_reason,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessage(row: Db["messages"]["Row"]): ChatMessage {
  return {
    id: row.id,
    request_id: row.request_id,
    sender_id: row.sender_id,
    body: row.body,
    photo_url: row.photo_url,
    created_at: row.created_at,
  };
}

function mapReview(row: Db["reviews"]["Row"]): Review {
  return {
    id: row.id,
    request_id: row.request_id,
    client_id: row.client_id,
    professional_id: row.professional_id,
    rating: row.rating,
    comment: row.comment,
    tags: row.tags,
    created_at: row.created_at,
  };
}

function mapDispute(row: Db["disputes"]["Row"]): Dispute {
  return {
    id: row.id,
    request_id: row.request_id,
    opened_by: row.opened_by,
    reason: row.reason,
    evidence_photos: row.evidence_photos,
    status: row.status as Dispute["status"],
    resolution_note: row.resolution_note,
    refund_cents: row.refund_cents,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
  };
}

// ---------------------------------------------------------------------------
// Catálogo público
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name");
  throwIf(error, "Não foi possível carregar as categorias.");
  return (data ?? []).map(mapCategory);
}

export async function searchProfessionals(o: {
  category?: string | undefined;
  neighborhood?: string | undefined;
  query?: string | undefined;
  sort?: "rating" | "price";
}): Promise<ProfessionalView[]> {
  let q = supabase
    .from("public_professionals")
    .select("*")
    .eq("status", "approved");
  if (o.category) q = q.contains("categories", [o.category]);
  if (o.neighborhood) q = q.contains("service_area", [o.neighborhood]);
  if (o.query) q = q.ilike("display_name", `%${o.query.trim()}%`);
  if (o.sort === "rating") {
    q = q.order("rating_avg", { ascending: false });
  } else {
    q = q.order("display_name");
  }
  const { data, error } = await q;
  throwIf(error, "Não foi possível buscar profissionais.");
  const list = (data ?? []).map(mapProfessionalView);
  if (o.sort === "price") {
    const prices = await Promise.all(
      list.map(async (p) => {
        const services = await listServices(p.id);
        const priced = services
          .map((s) => s.base_price_cents)
          .filter((v): v is number => v !== null);
        return priced.length > 0 ? Math.min(...priced) : null;
      }),
    );
    const withPrice = list.map((p, i) => ({ p, price: prices[i] ?? null }));
    withPrice.sort((a, b) => {
      if (a.price === null && b.price === null) return 0;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    });
    return withPrice.map((x) => x.p);
  }
  return list;
}

export async function getProfessional(
  id: string,
): Promise<ProfessionalView | null> {
  const { data, error } = await supabase
    .from("public_professionals")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  throwIf(error, "Não foi possível carregar o profissional.");
  return data ? mapProfessionalView(data) : null;
}

export async function listServices(
  professionalId: string,
): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("active", true)
    .order("title");
  throwIf(error, "Não foi possível carregar os serviços.");
  return (data ?? []).map(mapService);
}

export async function listReviews(
  professionalId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar as avaliações.");
  return (data ?? []).map(mapReview);
}

// ---------------------------------------------------------------------------
// Solicitações
// ---------------------------------------------------------------------------

export async function createRequest(input: {
  professionalId: string;
  serviceId?: string;
  categorySlug: string;
  description: string;
  scheduledAt?: string;
  address: {
    street: string;
    number?: string;
    complement?: string;
    neighborhood: string;
    city?: string;
    zip?: string;
  };
}): Promise<ServiceRequest> {
  const userId = await requireUserId();
  const address = await createAddress({
    street: input.address.street,
    number: input.address.number,
    complement: input.address.complement,
    neighborhood: input.address.neighborhood,
    city: input.address.city,
    zip: input.address.zip,
  });
  const insert: Db["service_requests"]["Insert"] = {
    client_id: userId,
    professional_id: input.professionalId,
    category_slug: input.categorySlug,
    description: input.description,
    address_id: address.id,
    address_snapshot: {
      street: input.address.street,
      number: input.address.number ?? null,
      complement: input.address.complement ?? null,
      neighborhood: input.address.neighborhood,
      city: input.address.city ?? "Teresina",
      zip: input.address.zip ?? null,
    },
    status: "sent",
  };
  if (input.serviceId !== undefined) insert.service_id = input.serviceId;
  if (input.scheduledAt !== undefined) {
    insert.scheduled_at = input.scheduledAt;
  }
  const { data, error } = await supabase
    .from("service_requests")
    .insert(insert)
    .select("*")
    .single();
  throwIf(error, "Não foi possível criar a solicitação.");
  if (!data) throw new Error("Não foi possível criar a solicitação.");
  return mapRequest(data);
}

export async function listMyRequests(): Promise<ServiceRequest[]> {
  const userId = await requireUserId();
  const profile = await getMyProfile();
  let q = supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (profile && profile.role === "professional") {
    const pro = await getMyProfessional();
    if (pro) {
      q = q.eq("professional_id", pro.id);
    } else {
      q = q.eq("client_id", userId);
    }
  } else {
    q = q.eq("client_id", userId);
  }
  const { data, error } = await q;
  throwIf(error, "Não foi possível carregar suas solicitações.");
  return (data ?? []).map(mapRequest);
}

export async function getRequestDetail(id: string): Promise<{
  request: ServiceRequest;
  quotes: Quote[];
  payment: Payment | null;
  messages: ChatMessage[];
  review: Review | null;
} | null> {
  const { data: reqRow, error: reqError } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIf(reqError, "Não foi possível carregar a solicitação.");
  if (!reqRow) return null;
  const [quotesRes, paymentRes, messagesRes, reviewRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("request_id", id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("reviews")
      .select("*")
      .eq("request_id", id)
      .maybeSingle(),
  ]);
  throwIf(quotesRes.error, "Não foi possível carregar os orçamentos.");
  throwIf(paymentRes.error, "Não foi possível carregar o pagamento.");
  throwIf(messagesRes.error, "Não foi possível carregar as mensagens.");
  throwIf(reviewRes.error, "Não foi possível carregar a avaliação.");
  return {
    request: mapRequest(reqRow),
    quotes: (quotesRes.data ?? []).map(mapQuote),
    payment: paymentRes.data ? mapPayment(paymentRes.data) : null,
    messages: (messagesRes.data ?? []).map(mapMessage),
    review: reviewRes.data ? mapReview(reviewRes.data) : null,
  };
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export async function sendQuote(
  requestId: string,
  professionalId: string,
  amountCents: number,
  message: string,
): Promise<Quote> {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      request_id: requestId,
      professional_id: professionalId,
      amount_cents: amountCents,
      message: message || null,
      expires_at: expiresAt,
      status: "pending",
    })
    .select("*")
    .single();
  throwIf(error, "Não foi possível enviar o orçamento.");
  if (!data) throw new Error("Não foi possível enviar o orçamento.");
  const { data: updated, error: updateError } = await supabase
    .from("service_requests")
    .update({ status: "quoted" })
    .eq("id", requestId)
    .eq("status", "sent")
    .select("id");
  throwIf(updateError, "Não foi possível atualizar a solicitação.");
  if (!updated || updated.length === 0) {
    throw new Error(
      "A solicitação não está mais aguardando orçamento.",
    );
  }
  return mapQuote(data);
}

export async function acceptQuote(
  requestId: string,
  quoteId: string,
): Promise<void> {
  const { error } = await supabase.rpc("accept_quote", {
    p_request_id: requestId,
    p_quote_id: quoteId,
  });
  throwIf(error, "Não foi possível aceitar o orçamento.");
}

export async function declineQuote(quoteId: string): Promise<void> {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, request_id")
    .eq("id", quoteId)
    .eq("status", "pending")
    .maybeSingle();
  throwIf(quoteError, "Não foi possível recusar o orçamento.");
  if (!quote) return;
  const { error } = await supabase
    .from("quotes")
    .update({ status: "declined" })
    .eq("id", quoteId)
    .eq("status", "pending");
  throwIf(error, "Não foi possível recusar o orçamento.");
  // Reabre a solicitação para o profissional poder enviar novo orçamento.
  const { error: reopenError } = await supabase
    .from("service_requests")
    .update({ status: "sent" })
    .eq("id", quote.request_id)
    .eq("status", "quoted");
  throwIf(reopenError, "Não foi possível reabrir a solicitação.");
}

// ---------------------------------------------------------------------------
// Pagamento (simulado, via RPCs — nunca insert/update direto em payments)
// ---------------------------------------------------------------------------

export async function createSimulatedPayment(
  requestId: string,
  method: "pix" | "card",
): Promise<string> {
  const { data, error } = await supabase.rpc("create_simulated_payment", {
    p_request_id: requestId,
    p_method: method,
  });
  throwIf(error, "Não foi possível criar o pagamento.");
  if (!data) throw new Error("Não foi possível criar o pagamento.");
  return data;
}

export async function confirmSimulatedPayment(
  paymentId: string,
): Promise<void> {
  const { error } = await supabase.rpc("confirm_simulated_payment", {
    p_payment_id: paymentId,
  });
  throwIf(error, "Não foi possível confirmar o pagamento.");
}

// ---------------------------------------------------------------------------
// Execução / conclusão / cancelamento
// ---------------------------------------------------------------------------

export async function startExecution(requestId: string): Promise<void> {
  const { data, error } = await supabase
    .from("service_requests")
    .update({ status: "in_progress" })
    .eq("id", requestId)
    .eq("status", "paid")
    .select("id");
  throwIf(error, "Não foi possível iniciar a execução.");
  if (!data || data.length === 0) {
    throw new Error("A solicitação precisa estar paga para iniciar a execução.");
  }
}

export async function completeRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_request", {
    p_request_id: requestId,
  });
  throwIf(error, "Não foi possível marcar o serviço como concluído.");
}

export async function confirmCompletion(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("confirm_completion", {
    p_request_id: requestId,
  });
  throwIf(error, "Não foi possível confirmar a conclusão.");
}

export async function cancelRequest(
  requestId: string,
  reason?: string,
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from("service_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  throwIf(fetchError, "Não foi possível carregar a solicitação.");
  const status = current?.status as RequestStatus | undefined;
  if (status === "paid") {
    throw new Error(
      "Solicitação já paga: o cancelamento precisa ser feito com o suporte, pois o valor está retido.",
    );
  }
  if (
    status !== "sent" &&
    status !== "quoted" &&
    status !== "accepted"
  ) {
    throw new Error("Esta solicitação não pode mais ser cancelada.");
  }
  const update: Db["service_requests"]["Update"] = { status: "cancelled" };
  if (reason !== undefined) update.cancel_reason = reason;
  const { data, error } = await supabase
    .from("service_requests")
    .update(update)
    .eq("id", requestId)
    .eq("status", status)
    .select("id");
  throwIf(error, "Não foi possível cancelar a solicitação.");
  if (!data || data.length === 0) {
    throw new Error("A solicitação mudou de status e não pode ser cancelada.");
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function listMessages(
  requestId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  throwIf(error, "Não foi possível carregar as mensagens.");
  return (data ?? []).map(mapMessage);
}

export async function sendChatMessage(
  requestId: string,
  body: string,
): Promise<ChatMessage> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("messages")
    .insert({ request_id: requestId, sender_id: userId, body })
    .select("*")
    .single();
  throwIf(error, "Não foi possível enviar a mensagem.");
  if (!data) throw new Error("Não foi possível enviar a mensagem.");
  return mapMessage(data);
}

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------

export async function submitReview(
  requestId: string,
  professionalId: string,
  rating: number,
  comment: string,
  tags: string[],
): Promise<Review> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      request_id: requestId,
      client_id: userId,
      professional_id: professionalId,
      rating,
      comment: comment || null,
      tags,
    })
    .select("*")
    .single();
  throwIf(error, "Não foi possível enviar a avaliação.");
  if (!data) throw new Error("Não foi possível enviar a avaliação.");
  return mapReview(data);
}

// ---------------------------------------------------------------------------
// Perfil do profissional
// ---------------------------------------------------------------------------

export async function getMyProfessional(): Promise<Professional | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("professionals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  throwIf(error, "Não foi possível carregar seu perfil profissional.");
  return data ? mapProfessional(data) : null;
}

export async function createProfessionalProfile(input: {
  displayName: string;
  bio?: string;
  categories: string[];
  serviceArea: string[];
  documentType?: "cpf" | "cnpj_mei";
  documentNumber?: string;
  payoutKey?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  const userId = await requireUserId();
  const insert: Db["professionals"]["Insert"] = {
    user_id: userId,
    display_name: input.displayName,
    categories: input.categories,
    service_area: input.serviceArea,
    status: "pending",
    documents_status: "pending",
  };
  if (input.bio !== undefined) insert.bio = input.bio;
  if (input.documentType !== undefined) {
    insert.document_type = input.documentType;
  }
  if (input.documentNumber !== undefined) {
    insert.document_number = input.documentNumber;
  }
  if (input.payoutKey !== undefined) insert.payout_key = input.payoutKey;
  const { data, error } = await supabase
    .from("professionals")
    .insert(insert)
    .select("*")
    .single();
  throwIf(error, "Não foi possível criar o perfil profissional.");
  if (!data) throw new Error("Não foi possível criar o perfil profissional.");
  return mapProfessional(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProfessionalProfile(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: Partial<any>,
): Promise<void> {
  const allowed: Array<keyof Db["professionals"]["Update"]> = [
    "display_name",
    "bio",
    "photo_url",
    "categories",
    "service_area",
    "document_type",
    "document_number",
    "documents_status",
    "payout_key",
    "payout_bank",
    "payout_account",
    "status",
    "rejection_reason",
  ];
  const update: Db["professionals"]["Update"] = {};
  for (const key of allowed) {
    const value = patch[key] as unknown;
    if (value !== undefined) {
      (update as Record<string, unknown>)[key] = value;
    }
  }
  const { error } = await supabase
    .from("professionals")
    .update(update)
    .eq("id", id);
  throwIf(error, "Não foi possível atualizar o perfil profissional.");
}

// ---------------------------------------------------------------------------
// Serviços do profissional
// ---------------------------------------------------------------------------

export async function createService(input: {
  professionalId: string;
  categorySlug: string;
  title: string;
  description?: string;
  basePriceCents?: number | null;
  unit: string;
}): Promise<Service> {
  const insert: Db["services"]["Insert"] = {
    professional_id: input.professionalId,
    category_slug: input.categorySlug,
    title: input.title,
    unit: input.unit,
    active: true,
  };
  if (input.description !== undefined) {
    insert.description = input.description;
  }
  if (input.basePriceCents !== undefined) {
    insert.base_price_cents = input.basePriceCents;
  }
  const { data, error } = await supabase
    .from("services")
    .insert(insert)
    .select("*")
    .single();
  throwIf(error, "Não foi possível criar o serviço.");
  if (!data) throw new Error("Não foi possível criar o serviço.");
  return mapService(data);
}

export async function updateService(
  id: string,
  patch: Partial<Service>,
): Promise<void> {
  const update: Db["services"]["Update"] = {};
  if (patch.category_slug !== undefined) {
    update.category_slug = patch.category_slug;
  }
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) {
    update.description = patch.description;
  }
  if (patch.base_price_cents !== undefined) {
    update.base_price_cents = patch.base_price_cents;
  }
  if (patch.unit !== undefined) update.unit = patch.unit;
  if (patch.active !== undefined) update.active = patch.active;
  const { error } = await supabase
    .from("services")
    .update(update)
    .eq("id", id);
  throwIf(error, "Não foi possível atualizar o serviço.");
}

export async function listMyServices(
  professionalId: string,
): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("professional_id", professionalId)
    .order("title");
  throwIf(error, "Não foi possível carregar seus serviços.");
  return (data ?? []).map(mapService);
}

// ---------------------------------------------------------------------------
// Repasses
// ---------------------------------------------------------------------------

export async function listPayoutsMine(
  professionalId: string,
): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar seus repasses.");
  return (data ?? []).map(mapPayout);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function adminListProfessionals(status?: string): Promise<any[]> {
  let q = supabase
    .from("professionals")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  throwIf(error, "Não foi possível carregar os profissionais.");
  return (data ?? []).map(mapProfessional);
}

export async function adminApproveProfessional(id: string): Promise<void> {
  const { error } = await supabase
    .from("professionals")
    .update({ status: "approved" })
    .eq("id", id);
  throwIf(error, "Não foi possível aprovar o profissional.");
}

export async function adminRejectProfessional(
  id: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("professionals")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);
  throwIf(error, "Não foi possível reprovar o profissional.");
}

export async function adminListPayouts(): Promise<Payout[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar os repasses.");
  return (data ?? []).map(mapPayout);
}

export async function adminListDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar as disputas.");
  return (data ?? []).map(mapDispute);
}

export async function adminMetrics(): Promise<{
  requests: number;
  professionalsPending: number;
  completed: number;
  commissionCents: number;
}> {
  const [requestsRes, pendingRes, completedRes, paymentsRes] =
    await Promise.all([
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("professionals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("payments")
        .select("platform_fee_cents")
        .eq("status", "released"),
    ]);
  throwIf(requestsRes.error, "Não foi possível carregar as métricas.");
  throwIf(pendingRes.error, "Não foi possível carregar as métricas.");
  throwIf(completedRes.error, "Não foi possível carregar as métricas.");
  throwIf(paymentsRes.error, "Não foi possível carregar as métricas.");
  const commissionCents = (paymentsRes.data ?? []).reduce(
    (sum, row) => sum + row.platform_fee_cents,
    0,
  );
  return {
    requests: requestsRes.count ?? 0,
    professionalsPending: pendingRes.count ?? 0,
    completed: completedRes.count ?? 0,
    commissionCents,
  };
}

// ---------------------------------------------------------------------------
// Endereços e perfil do usuário
// ---------------------------------------------------------------------------

export async function listAddresses(): Promise<Address[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar seus endereços.");
  return (data ?? []).map(mapAddress);
}

export async function createAddress(input: {
  label?: string | undefined;
  street: string;
  number?: string | undefined;
  complement?: string | undefined;
  neighborhood: string;
  city?: string | undefined;
  zip?: string | undefined;
}): Promise<Address> {
  const userId = await requireUserId();
  const insert: Db["addresses"]["Insert"] = {
    user_id: userId,
    street: input.street,
    neighborhood: input.neighborhood,
    city: input.city ?? "Teresina",
    state: "PI",
  };
  if (input.label !== undefined) insert.label = input.label;
  if (input.number !== undefined) insert.number = input.number;
  if (input.complement !== undefined) insert.complement = input.complement;
  if (input.zip !== undefined) insert.zip = input.zip;
  const { data, error } = await supabase
    .from("addresses")
    .insert(insert)
    .select("*")
    .single();
  throwIf(error, "Não foi possível salvar o endereço.");
  if (!data) throw new Error("Não foi possível salvar o endereço.");
  return mapAddress(data);
}

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  throwIf(error, "Não foi possível carregar seu perfil.");
  return data ? mapProfile(data) : null;
}

export async function updateMyProfile(
  patch: Partial<Profile>,
): Promise<void> {
  const userId = await requireUserId();
  const update: Db["profiles"]["Update"] = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.avatar_url !== undefined) update.avatar_url = patch.avatar_url;
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);
  throwIf(error, "Não foi possível atualizar seu perfil.");
}

export async function listMyPayments(): Promise<Payment[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });
  throwIf(error, "Não foi possível carregar seus pagamentos.");
  return (data ?? []).map(mapPayment);
}
