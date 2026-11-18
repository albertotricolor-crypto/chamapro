create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role text not null default 'client'
    check (role in ('client', 'professional', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create index on public.profiles (role);
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.categories (active);
create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
alter table public.categories enable row level security;
create policy "categories_select_public" on public.categories
  for select using (active = true or public.is_admin());
create policy "categories_write_admin" on public.categories
  for all using (public.is_admin());

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  street text not null,
  number text,
  complement text,
  neighborhood text not null,
  city text not null default 'Teresina',
  state text not null default 'PI',
  zip text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.addresses (user_id);
create index on public.addresses (neighborhood);
create trigger addresses_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();
alter table public.addresses enable row level security;
create policy "addresses_own" on public.addresses
  for all using (user_id = auth.uid() or public.is_admin());

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  photo_url text,
  categories text[] not null default '{}',
  service_area text[] not null default '{}',
  document_type text check (document_type in ('cpf', 'cnpj_mei')),
  document_number text,
  documents_status text not null default 'pending'
    check (documents_status in ('pending', 'approved', 'rejected')),
  payout_key text,
  payout_bank text,
  payout_account text,
  rating_avg numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.professionals (status);
create index on public.professionals (categories);
create index on public.professionals (service_area);
create index on public.professionals (rating_avg desc);
create trigger professionals_updated_at
  before update on public.professionals
  for each row execute function public.set_updated_at();
alter table public.professionals enable row level security;
create policy "professionals_select_public_approved" on public.professionals
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "professionals_insert_own" on public.professionals
  for insert with check (user_id = auth.uid());
create policy "professionals_update_own_or_admin" on public.professionals
  for update using (user_id = auth.uid() or public.is_admin());

create table public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  category_slug text not null references public.categories(slug) on delete restrict,
  title text not null,
  description text,
  base_price_cents integer check (base_price_cents is null or base_price_cents > 0),
  unit text not null default 'por serviço'
    check (unit in ('por serviço', 'por hora', 'por m²')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.services (professional_id);
create index on public.services (category_slug);
create index on public.services (active);
create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();
alter table public.services enable row level security;
create policy "services_select_public" on public.services
  for select using (active = true or public.is_admin());
create policy "services_write_owner" on public.services
  for all using (
    exists (select 1 from public.professionals p
            where p.id = services.professional_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  category_slug text not null references public.categories(slug) on delete restrict,
  description text not null,
  photos text[] not null default '{}',
  address_id uuid references public.addresses(id) on delete set null,
  address_snapshot jsonb,
  scheduled_at timestamptz,
  status text not null default 'sent'
    check (status in ('sent', 'quoted', 'accepted', 'paid', 'in_progress',
                      'done_pending_confirmation', 'completed', 'cancelled',
                      'disputed', 'refunded')),
  cancel_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.service_requests (client_id, created_at desc);
create index on public.service_requests (professional_id, created_at desc);
create index on public.service_requests (status);
create index on public.service_requests (category_slug);
create trigger service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();
alter table public.service_requests enable row level security;
create policy "requests_select_parties_or_admin" on public.service_requests
  for select using (
    client_id = auth.uid()
    or exists (select 1 from public.professionals p
               where p.id = service_requests.professional_id and p.user_id = auth.uid())
    or public.is_admin()
  );
create policy "requests_insert_client" on public.service_requests
  for insert with check (client_id = auth.uid());
create policy "requests_update_parties_or_admin" on public.service_requests
  for update using (
    client_id = auth.uid()
    or exists (select 1 from public.professionals p
               where p.id = service_requests.professional_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL',
  message text,
  expires_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.quotes (request_id);
create unique index quotes_one_pending_per_request
  on public.quotes (request_id) where status = 'pending';
create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();
alter table public.quotes enable row level security;
create policy "quotes_select_parties_or_admin" on public.quotes
  for select using (
    exists (select 1 from public.service_requests r
            where r.id = quotes.request_id
            and (r.client_id = auth.uid()
                 or exists (select 1 from public.professionals p
                            where p.id = r.professional_id and p.user_id = auth.uid())))
    or public.is_admin()
  );
create policy "quotes_insert_professional" on public.quotes
  for insert with check (
    exists (select 1 from public.professionals p
            where p.id = quotes.professional_id and p.user_id = auth.uid())
  );
create policy "quotes_update_parties_or_admin" on public.quotes
  for update using (
    exists (select 1 from public.service_requests r
            where r.id = quotes.request_id and r.client_id = auth.uid())
    or exists (select 1 from public.professionals p
               where p.id = quotes.professional_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  method text not null check (method in ('pix', 'card')),
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  professional_amount_cents integer not null check (professional_amount_cents >= 0),
  gateway_fee_cents integer not null default 0 check (gateway_fee_cents >= 0),
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'held', 'released', 'refunded', 'failed')),
  gateway_ref text unique,
  gateway_payload jsonb not null default '{}',
  paid_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_sums_check
    check (platform_fee_cents + professional_amount_cents + gateway_fee_cents <= amount_cents)
);
create index on public.payments (client_id);
create index on public.payments (status);
create index on public.payments (gateway_ref);
create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
alter table public.payments enable row level security;
create policy "payments_select_parties_or_admin" on public.payments
  for select using (
    client_id = auth.uid()
    or exists (select 1 from public.service_requests r
               join public.professionals p on p.id = r.professional_id
               where r.id = payments.request_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete restrict,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payouts (professional_id, created_at desc);
create index on public.payouts (status);
create trigger payouts_updated_at
  before update on public.payouts
  for each row execute function public.set_updated_at();
alter table public.payouts enable row level security;
create policy "payouts_select_owner_or_admin" on public.payouts
  for select using (
    exists (select 1 from public.professionals p
            where p.id = payouts.professional_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  photo_url text,
  created_at timestamptz not null default now(),
  constraint message_has_content check (body is not null or photo_url is not null)
);
create index on public.messages (request_id, created_at);
alter table public.messages enable row level security;
create policy "messages_parties_or_admin" on public.messages
  for all using (
    exists (select 1 from public.service_requests r
            where r.id = messages.request_id
            and (r.client_id = auth.uid()
                 or exists (select 1 from public.professionals p
                            where p.id = r.professional_id and p.user_id = auth.uid())))
    or public.is_admin()
  );

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.reviews (professional_id, created_at desc);
alter table public.reviews enable row level security;
create policy "reviews_select_public" on public.reviews
  for select using (true);
create policy "reviews_insert_client" on public.reviews
  for insert with check (
    exists (select 1 from public.service_requests r
            where r.id = reviews.request_id and r.client_id = auth.uid())
  );

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  evidence_photos text[] not null default '{}',
  status text not null default 'open'
    check (status in ('open', 'resolved_refund', 'resolved_release', 'resolved_partial')),
  resolution_note text,
  refund_cents integer check (refund_cents is null or refund_cents >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.disputes (request_id);
create index on public.disputes (status);
create unique index disputes_one_open_per_request
  on public.disputes (request_id) where status = 'open';
alter table public.disputes enable row level security;
create policy "disputes_parties_or_admin" on public.disputes
  for all using (
    exists (select 1 from public.service_requests r
            where r.id = disputes.request_id
            and (r.client_id = auth.uid()
                 or exists (select 1 from public.professionals p
                            where p.id = r.professional_id and p.user_id = auth.uid())))
    or public.is_admin()
  );

insert into public.categories (name, slug, icon) values
  ('Eletricista', 'eletricista', 'zap'),
  ('Encanador', 'encanador', 'droplets'),
  ('Pintor', 'pintor', 'paintbrush'),
  ('Montador de móveis', 'montador-de-moveis', 'armchair'),
  ('Diarista / Faxina', 'diarista-faxina', 'sparkles'),
  ('Jardineiro', 'jardineiro', 'leaf')
on conflict (slug) do nothing;

create or replace view public.public_professionals as
select id, user_id, display_name, bio, photo_url, categories, service_area,
       rating_avg, reviews_count, status, created_at
from public.professionals;

create or replace function public.update_professional_rating()
returns trigger language plpgsql as $$
begin
  update public.professionals p
  set rating_avg = coalesce((select round(avg(rating),2) from public.reviews where professional_id = new.professional_id), 0),
      reviews_count = (select count(*) from public.reviews where professional_id = new.professional_id)
  where p.id = new.professional_id;
  return new;
end;
$$;
create trigger reviews_rating_trigger after insert on public.reviews
for each row execute function public.update_professional_rating();

create or replace function public.accept_quote(p_request_id uuid, p_quote_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.service_requests where id = p_request_id and client_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  update public.quotes set status = 'accepted', updated_at = now()
  where id = p_quote_id and request_id = p_request_id and status = 'pending';
  if not found then raise exception 'quote_not_pending'; end if;
  update public.service_requests set status = 'accepted', updated_at = now()
  where id = p_request_id and status = 'quoted';
  if not found then raise exception 'request_not_quoted'; end if;
end;
$$;

create or replace function public.create_simulated_payment(p_request_id uuid, p_method text)
returns uuid language plpgsql security definer as $$
declare v_quote record; v_payment_id uuid; v_fee int; v_pro int;
begin
  if not exists (select 1 from public.service_requests where id = p_request_id and client_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  select * into v_quote from public.quotes where request_id = p_request_id and status = 'accepted' order by created_at desc limit 1;
  if not found then raise exception 'no_accepted_quote'; end if;
  v_fee := round(v_quote.amount_cents * 0.15);
  v_pro := v_quote.amount_cents - v_fee;
  insert into public.payments (request_id, client_id, quote_id, method, amount_cents, platform_fee_cents, professional_amount_cents, gateway_fee_cents, currency, status, gateway_ref, gateway_payload)
  values (p_request_id, auth.uid(), v_quote.id, p_method, v_quote.amount_cents, v_fee, v_pro, 0, 'BRL', 'pending', 'SIM-' || gen_random_uuid(), '{"simulated": true, "note": "Pagamento SIMULADO (demonstração). Nenhum dinheiro real foi movimentado."}')
  returning id into v_payment_id;
  return v_payment_id;
end;
$$;

create or replace function public.confirm_simulated_payment(p_payment_id uuid)
returns void language plpgsql security definer as $$
declare v_request uuid;
begin
  update public.payments set status = 'held', paid_at = now(), updated_at = now()
  where id = p_payment_id and status = 'pending' and client_id = auth.uid()
  returning request_id into v_request;
  if not found then raise exception 'payment_not_pending'; end if;
  update public.service_requests set status = 'paid', updated_at = now() where id = v_request and status = 'accepted';
end;
$$;

create or replace function public.complete_request(p_request_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.service_requests r join public.professionals p on p.id = r.professional_id where r.id = p_request_id and p.user_id = auth.uid()) then
    raise exception 'not_professional';
  end if;
  update public.service_requests set status = 'done_pending_confirmation', completed_at = now(), updated_at = now()
  where id = p_request_id and status in ('paid', 'in_progress');
  if not found then raise exception 'request_not_in_progress'; end if;
end;
$$;

create or replace function public.confirm_completion(p_request_id uuid)
returns void language plpgsql security definer as $$
declare v_payment record;
begin
  if not exists (select 1 from public.service_requests where id = p_request_id and client_id = auth.uid()) then
    raise exception 'not_owner';
  end if;
  update public.service_requests set status = 'completed', updated_at = now()
  where id = p_request_id and status = 'done_pending_confirmation';
  if not found then raise exception 'request_not_pending_confirmation'; end if;
  update public.payments set status = 'released', released_at = now(), updated_at = now()
  where request_id = p_request_id and status = 'held'
  returning * into v_payment;
  if found then
    insert into public.payouts (professional_id, payment_id, amount_cents, currency, status)
    select r.professional_id, v_payment.id, v_payment.professional_amount_cents, 'BRL', 'pending'
    from public.service_requests r where r.id = p_request_id;
  end if;
end;
$$;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.categories, public.professionals, public.services, public.reviews, public.public_professionals to anon;
grant all on all tables in schema public to service_role;