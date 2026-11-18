do $$
declare
  u record; v_uid uuid; v_pro uuid;
begin
  for u in select * from (values
    ('cliente@chamapro.demo','Cliente Demo','client'),
    ('eletricista@chamapro.demo','Carlos Silva','professional'),
    ('diarista@chamapro.demo','Maria Santos','professional'),
    ('encanador@chamapro.demo','João Pereira','professional'),
    ('pintora@chamapro.demo','Ana Costa','professional'),
    ('admin@chamapro.demo','Admin ChamaPro','admin')) t(email,name,role)
  loop
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', u.email,
      crypt('demo1234', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('name', u.name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now());
    insert into public.profiles (id, name, email, role) values (v_uid, u.name, u.email, u.role);
  end loop;
end $$;

with p as (
  insert into public.professionals (user_id, display_name, bio, categories, service_area, rating_avg, reviews_count, documents_status, payout_key, status)
  select pr.id, d.name, d.bio, d.cats, d.area, d.rating, 0, 'approved', d.pix, 'approved'
  from (values
    ('eletricista@chamapro.demo','Carlos Silva','Eletricista com 10 anos de experiência em instalações residenciais em Teresina.',array['eletricista'],array['Centro','Jóquei','Ininga'],4.8,'carlos.silva@chamapro.demo'),
    ('diarista@chamapro.demo','Maria Santos','Diarista cuidadosa, limpeza residencial e pós-obra.',array['diarista-faxina'],array['Morada do Sol','Dirceu','Saci'],4.9,'maria.santos@chamapro.demo'),
    ('encanador@chamapro.demo','João Pereira','Encanador, reparos hidráulicos e desentupimentos.',array['encanador'],array['Centro','Vermelha','Piçarra'],4.7,'joao.pereira@chamapro.demo'),
    ('pintora@chamapro.demo','Ana Costa','Pintora residencial, paredes, portas e janelas.',array['pintor'],array['Jóquei','Horto','Fátima'],4.8,'ana.costa@chamapro.demo')
  ) d(email,name,bio,cats,area,rating,pix)
  join public.profiles pr on pr.email = d.email
  returning id, display_name
)
insert into public.services (professional_id, category_slug, title, base_price_cents, unit)
select p.id, s.cat, s.title, s.price, s.unit from p join (values
  ('Carlos Silva','eletricista','Instalação de tomada e interruptor',8000,'por serviço'),
  ('Carlos Silva','eletricista','Troca de disjuntor e quadro de luz',15000,'por serviço'),
  ('Maria Santos','diarista-faxina','Faxina completa (até 3 quartos)',12000,'por serviço'),
  ('Maria Santos','diarista-faxina','Limpeza pós-obra',22000,'por serviço'),
  ('João Pereira','encanador','Desentupimento de pia e ralo',9000,'por serviço'),
  ('João Pereira','encanador','Troca de torneira e sifão',11000,'por serviço'),
  ('Ana Costa','pintor','Pintura de parede',3500,'por m²'),
  ('Ana Costa','pintor','Pintura de porta e janela',18000,'por serviço')
) s(name,cat,title,price,unit) on s.name = p.display_name;