-- ============================================================
-- NOTIFICATIONS EN BASE + AUTO-MISE À JOUR — À exécuter dans Supabase
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Un utilisateur voit ses notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Un utilisateur marque ses notifications comme lues" on public.notifications
  for update using (auth.uid() = user_id);

-- Remplit la table notifications à chaque nouvelle publication (pour les abonnés)
create or replace function public.notify_new_post()
returns trigger language plpgsql as $$
declare follower record;
begin
  for follower in select follower_id from public.follows where followed_id = new.author_id loop
    insert into public.notifications (user_id, title, body)
    values (follower.follower_id, 'Nouvelle publication', left(new.content, 100));
  end loop;

  perform net.http_post(
    url := 'https://ibrddtwiycnbekclnfhh.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_txhVW1ANC82yvo2g52uA3A_IS5x0uej"}'::jsonb,
    body := jsonb_build_object('table', 'posts', 'record', row_to_json(new))
  );
  return new;
end;
$$;

-- Remplit la table notifications pour tout le monde à chaque contenu officiel
create or replace function public.notify_new_content()
returns trigger language plpgsql as $$
declare member record;
begin
  for member in select id from public.profiles loop
    insert into public.notifications (user_id, title, body)
    values (member.id, 'Together We Can ✅', coalesce(new.title, 'Nouveau contenu publié'));
  end loop;

  perform net.http_post(
    url := 'https://ibrddtwiycnbekclnfhh.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_txhVW1ANC82yvo2g52uA3A_IS5x0uej"}'::jsonb,
    body := jsonb_build_object('table', 'content_items', 'record', row_to_json(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_post on public.posts;
create trigger trg_notify_new_post
  after insert on public.posts
  for each row execute procedure public.notify_new_post();

drop trigger if exists trg_notify_new_content on public.content_items;
create trigger trg_notify_new_content
  after insert on public.content_items
  for each row execute procedure public.notify_new_content();
