export type RequestStatus =
  | "sent"
  | "quoted"
  | "accepted"
  | "paid"
  | "in_progress"
  | "done_pending_confirmation"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export type Role = "client" | "professional" | "admin";

export type ProfessionalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type QuoteStatus = "pending" | "accepted" | "declined" | "expired";

export type PaymentStatus = "pending" | "held" | "released" | "refunded" | "failed";

export type PaymentMethod = "pix" | "card";

export type PayoutStatus = "pending" | "paid" | "failed";

export type DisputeStatus =
  | "open"
  | "resolved_refund"
  | "resolved_release"
  | "resolved_partial";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Linha da view public_professionals (sem dados sensíveis). */
export interface ProfessionalView {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  categories: string[];
  service_area: string[];
  rating_avg: number;
  reviews_count: number;
  status: string;
  created_at: string;
}

export interface Professional {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  categories: string[];
  service_area: string[];
  document_type: "cpf" | "cnpj_mei" | null;
  document_number: string | null;
  documents_status: "pending" | "approved" | "rejected";
  payout_key: string | null;
  payout_bank: string | null;
  payout_account: string | null;
  rating_avg: number;
  reviews_count: number;
  status: ProfessionalStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  professional_id: string;
  category_slug: string;
  title: string;
  description: string | null;
  base_price_cents: number | null;
  unit: "por serviço" | "por hora" | "por m²";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string | null;
  category_slug: string;
  description: string;
  photos: string[];
  address_id: string | null;
  address_snapshot: unknown;
  scheduled_at: string | null;
  status: RequestStatus;
  cancel_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  request_id: string;
  professional_id: string;
  amount_cents: number;
  currency: string;
  message: string | null;
  expires_at: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  request_id: string;
  client_id: string;
  quote_id: string | null;
  method: PaymentMethod;
  amount_cents: number;
  platform_fee_cents: number;
  professional_amount_cents: number;
  gateway_fee_cents: number;
  currency: string;
  status: PaymentStatus;
  gateway_ref: string | null;
  paid_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  professional_id: string;
  payment_id: string;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  body: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  request_id: string;
  client_id: string;
  professional_id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
}

export interface Dispute {
  id: string;
  request_id: string;
  opened_by: string;
  reason: string;
  evidence_photos: string[];
  status: DisputeStatus;
  resolution_note: string | null;
  refund_cents: number | null;
  created_at: string;
  resolved_at: string | null;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  sent: "Enviada",
  quoted: "Orçada",
  accepted: "Aceita",
  paid: "Paga",
  in_progress: "Em execução",
  done_pending_confirmation: "Aguardando confirmação",
  completed: "Concluída",
  cancelled: "Cancelada",
  disputed: "Em disputa",
  refunded: "Reembolsada",
};

export const STATUS_STEPS: RequestStatus[] = [
  "sent",
  "quoted",
  "accepted",
  "paid",
  "in_progress",
  "done_pending_confirmation",
  "completed",
];
