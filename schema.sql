-- ============================================================
-- TOGETHER WE CAN — Schéma de base de données (Supabase / Postgres)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- ---------- Extension utile pour générer des codes ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES — étend auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_admin boolean default false,
  points integer default 0,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Génère un code de parrainage court et unique à l'inscription
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Crée automatiquement un profil quand un utilisateur s'inscrit
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone, referral_code)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    public.generate_referral_code()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Fonction utilitaire : l'utilisateur courant est-il admin ?
-- (définie ici, tôt, car utilisée par plusieurs politiques ci-dessous)
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- 2. POSTS — fil d'accueil
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade,
  post_type text default 'publication', -- publication | annonce | evenement
  content text not null,
  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  is_approved boolean default false, -- les publications attendent la validation admin
  created_at timestamptz default now()
);

-- ============================================================
-- 3bis. PUSH_SUBSCRIPTIONS — abonnements aux notifications
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
create policy "Un utilisateur gère son abonnement" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admin lit tous les abonnements" on public.push_subscriptions
  for select using (public.is_admin());

-- ============================================================
-- 3. CONTENT_ITEMS — contenu générique pour Éducation, Formation,
--    Opportunités, Entrepreneuriat, Marketing, Sport, Art
-- ============================================================
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- education | formation | opportunites | entrepreneuriat | marketing | sport | art
  subcategory text, -- ex: facebook/tiktok pour marketing
  title text not null,
  body text,
  video_url text,
  document_url text,
  image_url text,
  is_premium boolean default false,
  deadline timestamptz,
  quiz jsonb, -- [{question, options:[...], correct_index}]
  author_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 4. QUIZ_RESULTS
-- ============================================================
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_items(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  score integer,
  created_at timestamptz default now()
);

-- ============================================================
-- 5. APPLICATIONS — candidatures aux opportunités / premium
-- ============================================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references public.content_items(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  message text,
  status text default 'en_attente', -- en_attente | acceptee | refusee
  created_at timestamptz default now()
);

-- ============================================================
-- 6. MARKETPLACE_PRODUCTS
-- ============================================================
create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric,
  image_url text,
  is_boosted boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 7. BOOST_REQUESTS — demandes de promotion (marketing/marketplace)
-- ============================================================
create table if not exists public.boost_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  target_type text, -- profil | page | publication | produit
  platform text,     -- facebook | tiktok | instagram | youtube
  link text,
  budget numeric,
  transaction_id text,
  status text default 'en_attente', -- en_attente | validee | rejetee
  created_at timestamptz default now()
);

-- ============================================================
-- 8. MESSAGES — conversation "Together We Can Admin"
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade, -- le membre concerné par la conversation
  sender_is_admin boolean default false,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- 9. REWARD_REQUESTS — échange de points
-- ============================================================
create table if not exists public.reward_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  points_requested integer not null,
  amount_fc numeric,
  status text default 'en_attente', -- en_attente | validee | rejetee
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.content_items enable row level security;
alter table public.quiz_results enable row level security;
alter table public.applications enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.boost_requests enable row level security;
alter table public.messages enable row level security;
alter table public.reward_requests enable row level security;

-- ---- PROFILES ----
create policy "Profils visibles par tous les connectés" on public.profiles
  for select using (auth.uid() is not null);
create policy "Un utilisateur modifie son propre profil" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- ---- POSTS ----
create policy "Publications approuvées visibles par tous, brouillons par auteur/admin" on public.posts
  for select using (is_approved = true or auth.uid() = author_id or public.is_admin());
create policy "Un utilisateur crée ses publications" on public.posts
  for insert with check (auth.uid() = author_id);
create policy "Auteur ou admin modifie" on public.posts
  for update using (auth.uid() = author_id or public.is_admin());
create policy "Auteur ou admin supprime" on public.posts
  for delete using (auth.uid() = author_id or public.is_admin());

-- ---- CONTENT_ITEMS (lecture publique, écriture admin uniquement) ----
create policy "Contenu visible par tous les connectés" on public.content_items
  for select using (auth.uid() is not null);
create policy "Seul l'admin publie du contenu" on public.content_items
  for insert with check (public.is_admin());
create policy "Seul l'admin modifie le contenu" on public.content_items
  for update using (public.is_admin());
create policy "Seul l'admin supprime le contenu" on public.content_items
  for delete using (public.is_admin());

-- ---- QUIZ_RESULTS ----
create policy "Un utilisateur voit ses résultats" on public.quiz_results
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Un utilisateur enregistre ses résultats" on public.quiz_results
  for insert with check (auth.uid() = user_id);

-- ---- APPLICATIONS ----
create policy "Utilisateur/admin voit les candidatures" on public.applications
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Un utilisateur postule" on public.applications
  for insert with check (auth.uid() = user_id);
create policy "Admin met à jour le statut" on public.applications
  for update using (public.is_admin());

-- ---- MARKETPLACE_PRODUCTS ----
create policy "Produits visibles par tous les connectés" on public.marketplace_products
  for select using (auth.uid() is not null);
create policy "Un vendeur publie son produit" on public.marketplace_products
  for insert with check (auth.uid() = seller_id);
create policy "Vendeur ou admin modifie" on public.marketplace_products
  for update using (auth.uid() = seller_id or public.is_admin());
create policy "Vendeur ou admin supprime" on public.marketplace_products
  for delete using (auth.uid() = seller_id or public.is_admin());

-- ---- BOOST_REQUESTS ----
create policy "Utilisateur/admin voit les demandes de boost" on public.boost_requests
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Un utilisateur envoie une demande de boost" on public.boost_requests
  for insert with check (auth.uid() = user_id);
create policy "Admin traite les demandes de boost" on public.boost_requests
  for update using (public.is_admin());

-- ---- MESSAGES ----
create policy "Utilisateur/admin voit sa conversation" on public.messages
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Utilisateur/admin écrit dans la conversation" on public.messages
  for insert with check (auth.uid() = user_id or public.is_admin());

-- ---- REWARD_REQUESTS ----
create policy "Utilisateur/admin voit les demandes d'échange" on public.reward_requests
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Un utilisateur demande un échange" on public.reward_requests
  for insert with check (auth.uid() = user_id);
create policy "Admin traite les demandes d'échange" on public.reward_requests
  for update using (public.is_admin());

-- ============================================================
-- STORAGE — bucket public pour images (avatars, produits, publications)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('twc-media', 'twc-media', true)
on conflict (id) do nothing;

create policy "Lecture publique des médias" on storage.objects
  for select using (bucket_id = 'twc-media');
create policy "Utilisateurs connectés uploadent des médias" on storage.objects
  for insert with check (bucket_id = 'twc-media' and auth.uid() is not null);

-- ============================================================
-- FONCTION : traiter un parrainage (appelée par l'app après inscription)
-- Attribue 10 points au parrain de façon sécurisée (contourne les
-- restrictions RLS normales, car un nouvel utilisateur ne peut pas
-- modifier le profil d'un autre membre directement).
-- ============================================================
create or replace function public.handle_referral(p_referral_code text, p_new_user_id uuid)
returns void language plpgsql security definer as $$
declare
  referrer_id uuid;
begin
  select id into referrer_id from public.profiles where referral_code = p_referral_code;
  if referrer_id is not null and referrer_id != p_new_user_id then
    update public.profiles set referred_by = referrer_id where id = p_new_user_id;
    update public.profiles set points = coalesce(points, 0) + 10 where id = referrer_id;
  end if;
end;
$$;

-- ============================================================
-- POUR VOUS RENDRE ADMINISTRATEUR
-- ============================================================
-- Après votre première inscription dans l'app, exécutez (remplacez l'email) :
--
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'votre-email@gmail.com');
