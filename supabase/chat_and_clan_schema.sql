-- ==============================================================================
-- SQUADUP - SQL COMPLETO: RICERCA OPERATORI, DIRECT MESSAGES, CHAT CLAN E RUOLI
-- Esegui questo script nel SQL Editor della dashboard di Supabase.
-- È idempotente (usa IF NOT EXISTS e DO block sicuri per le policy).
-- ==============================================================================

-- 1. ESTENSIONI NECESSARIE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Per ricerche veloci con ILIKE su operatori e clan

-- ==============================================================================
-- 2. TABELLA PROFILES (Ricerca Operatori)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  clan_tag TEXT,
  activision_id TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assicuriamoci che tutte le colonne utilizzate esistano anche se la tabella era già creata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clan_tag TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activision_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Indici per ricerca rapida operatori
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_activision_id_trgm ON public.profiles USING gin (activision_id gin_trgm_ops);

-- RLS Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'I profili sono visibili a tutti gli utenti autenticati') THEN
    CREATE POLICY "I profili sono visibili a tutti gli utenti autenticati" 
      ON public.profiles FOR SELECT 
      TO authenticated, anon 
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Ogni utente può modificare il proprio profilo') THEN
    CREATE POLICY "Ogni utente può modificare il proprio profilo" 
      ON public.profiles FOR ALL 
      TO authenticated 
      USING (auth.uid() = id) 
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;


-- ==============================================================================
-- 3. TABELLA CLANS (Ricerca Clan e Gestione Squadre)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  game_mode TEXT DEFAULT 'Warzone',
  region TEXT DEFAULT 'EU',
  avatar_url TEXT,
  banner_url TEXT,
  clan_frame_url TEXT,
  clan_banner_url TEXT,
  tier TEXT DEFAULT 'base',
  subscription_tier TEXT DEFAULT 'free',
  subscription_months INTEGER DEFAULT 1,
  subscription_expires_at TIMESTAMPTZ,
  is_recruiting BOOLEAN DEFAULT true,
  tournaments_won INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  clan_treasury_sc NUMERIC DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Colonne di sicurezza
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'base';
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT true;
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS tournaments_won INTEGER DEFAULT 0;
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Indici per ricerca rapida clan
CREATE INDEX IF NOT EXISTS idx_clans_name_trgm ON public.clans USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clans_tag_trgm ON public.clans USING gin (tag gin_trgm_ops);

-- RLS Clans
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clans' AND policyname = 'I clan sono visibili a tutti') THEN
    CREATE POLICY "I clan sono visibili a tutti" 
      ON public.clans FOR SELECT 
      TO authenticated, anon 
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clans' AND policyname = 'Utenti autenticati possono creare un clan') THEN
    CREATE POLICY "Utenti autenticati possono creare un clan" 
      ON public.clans FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clans' AND policyname = 'I proprietari possono aggiornare il loro clan') THEN
    CREATE POLICY "I proprietari possono aggiornare il loro clan" 
      ON public.clans FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = owner_id);
  END IF;
END $$;


-- ==============================================================================
-- 4. TABELLA CLAN_MEMBERS & CLAN_CUSTOM_ROLES (Ruoli e Permessi Clan Chat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clan_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#06B6D4',
  can_publish BOOLEAN DEFAULT false,
  can_moderate BOOLEAN DEFAULT false,
  can_manage_clan_chat BOOLEAN DEFAULT false, -- << Permesso per leggere e rispondere per conto del Clan
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assicuriamoci che la colonna del permesso esista anche su installazioni esistenti
ALTER TABLE public.clan_custom_roles ADD COLUMN IF NOT EXISTS can_manage_clan_chat BOOLEAN DEFAULT false;
ALTER TABLE public.clan_custom_roles ADD COLUMN IF NOT EXISTS can_publish BOOLEAN DEFAULT false;
ALTER TABLE public.clan_custom_roles ADD COLUMN IF NOT EXISTS can_moderate BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clan_custom_roles_clan ON public.clan_custom_roles(clan_id);

-- RLS Clan Custom Roles
ALTER TABLE public.clan_custom_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_custom_roles' AND policyname = 'I ruoli del clan sono visibili a tutti gli autenticati') THEN
    CREATE POLICY "I ruoli del clan sono visibili a tutti gli autenticati" 
      ON public.clan_custom_roles FOR SELECT 
      TO authenticated 
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_custom_roles' AND policyname = 'Il leader del clan gestisce i ruoli personalizzati') THEN
    CREATE POLICY "Il leader del clan gestisce i ruoli personalizzati" 
      ON public.clan_custom_roles FOR ALL 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM public.clans 
          WHERE clans.id = clan_custom_roles.clan_id 
          AND clans.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.clans 
          WHERE clans.id = clan_custom_roles.clan_id 
          AND clans.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Tabella Clan Members
CREATE TABLE IF NOT EXISTS public.clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Membro', -- 'founder', 'admin', 'Membro'
  status TEXT DEFAULT 'active',
  custom_role_id UUID REFERENCES public.clan_custom_roles(id) ON DELETE SET NULL,
  custom_role_title TEXT,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(clan_id, user_id)
);

ALTER TABLE public.clan_members ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.clan_custom_roles(id) ON DELETE SET NULL;
ALTER TABLE public.clan_members ADD COLUMN IF NOT EXISTS custom_role_title TEXT;

CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON public.clan_members(user_id);

-- RLS Clan Members
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_members' AND policyname = 'Membri visibili a tutti gli autenticati') THEN
    CREATE POLICY "Membri visibili a tutti gli autenticati" 
      ON public.clan_members FOR SELECT 
      TO authenticated, anon 
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_members' AND policyname = 'I leader possono aggiornare e assegnare ruoli ai membri') THEN
    CREATE POLICY "I leader possono aggiornare e assegnare ruoli ai membri" 
      ON public.clan_members FOR ALL 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM public.clans 
          WHERE clans.id = clan_members.clan_id 
          AND clans.owner_id = auth.uid()
        )
        OR user_id = auth.uid()
      );
  END IF;
END $$;


-- ==============================================================================
-- 5. TABELLA DIRECT_MESSAGES (Messaggi Diretti 1-a-1 tra Operatori)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL, -- Può essere user_id o clan_id
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_is_read ON public.direct_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON public.direct_messages(created_at DESC);

-- RLS Direct Messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'direct_messages' AND policyname = 'Gli utenti possono leggere i propri messaggi inviati o ricevuti') THEN
    CREATE POLICY "Gli utenti possono leggere i propri messaggi inviati o ricevuti" 
      ON public.direct_messages FOR SELECT 
      TO authenticated 
      USING (
        auth.uid() = sender_id 
        OR auth.uid() = receiver_id
        OR EXISTS (
          SELECT 1 FROM public.clans c
          WHERE c.id = direct_messages.receiver_id 
          AND (
            c.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.clan_members cm
              JOIN public.clan_custom_roles cr ON cm.custom_role_id = cr.id
              WHERE cm.clan_id = c.id 
              AND cm.user_id = auth.uid() 
              AND cr.can_manage_clan_chat = true
            )
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'direct_messages' AND policyname = 'Gli utenti autenticati possono inviare messaggi') THEN
    CREATE POLICY "Gli utenti autenticati possono inviare messaggi" 
      ON public.direct_messages FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;


-- ==============================================================================
-- 6. TABELLA CLAN_DIRECT_MESSAGES (Casella Messaggi Diretti del Clan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clan_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  sender_clan_tag TEXT,
  sender_role_title TEXT,
  receiver_id UUID NOT NULL, -- ID utente operatore o altro Clan
  receiver_name TEXT NOT NULL,
  receiver_avatar TEXT,
  receiver_clan_tag TEXT,
  receiver_is_clan BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  is_from_clan BOOLEAN DEFAULT false, -- True se inviato a nome del clan
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clan_direct_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clan_dm_clan ON public.clan_direct_messages(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_dm_sender ON public.clan_direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_clan_dm_receiver ON public.clan_direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_clan_dm_is_read ON public.clan_direct_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_clan_dm_created_at ON public.clan_direct_messages(created_at DESC);

-- RLS Clan Direct Messages
ALTER TABLE public.clan_direct_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_direct_messages' AND policyname = 'Visualizzazione autorizzata messaggi direct clan') THEN
    CREATE POLICY "Visualizzazione autorizzata messaggi direct clan" 
      ON public.clan_direct_messages FOR SELECT 
      TO authenticated 
      USING (
        -- Il mittente/destinatario è l'utente
        sender_id = auth.uid() 
        OR receiver_id = auth.uid()
        -- Oppure l'utente è leader del clan ricevente/mittente
        OR EXISTS (
          SELECT 1 FROM public.clans c 
          WHERE (c.id = clan_direct_messages.clan_id OR c.id = clan_direct_messages.receiver_id)
          AND c.owner_id = auth.uid()
        )
        -- Oppure possiede il ruolo delegato per la chat del clan
        OR EXISTS (
          SELECT 1 FROM public.clan_members cm
          JOIN public.clan_custom_roles cr ON cm.custom_role_id = cr.id
          WHERE (cm.clan_id = clan_direct_messages.clan_id OR cm.clan_id = clan_direct_messages.receiver_id)
          AND cm.user_id = auth.uid()
          AND cr.can_manage_clan_chat = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_direct_messages' AND policyname = 'Invio messaggi direct clan autorizzato') THEN
    CREATE POLICY "Invio messaggi direct clan autorizzato" 
      ON public.clan_direct_messages FOR INSERT 
      TO authenticated 
      WITH CHECK (sender_id = auth.uid());
  END IF;
END $$;


-- ==============================================================================
-- 7. TABELLA CLAN_MESSAGES (Chat Interna tra membri del Clan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clan_messages_clan_id ON public.clan_messages(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_messages_created_at ON public.clan_messages(created_at ASC);

ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_messages' AND policyname = 'I membri del clan possono leggere la chat interna') THEN
    CREATE POLICY "I membri del clan possono leggere la chat interna" 
      ON public.clan_messages FOR SELECT 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM public.clan_members 
          WHERE clan_members.clan_id = clan_messages.clan_id 
          AND clan_members.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.clans 
          WHERE clans.id = clan_messages.clan_id 
          AND clans.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clan_messages' AND policyname = 'I membri possono scrivere nella chat interna') THEN
    CREATE POLICY "I membri possono scrivere nella chat interna" 
      ON public.clan_messages FOR INSERT 
      TO authenticated 
      WITH CHECK (
        author_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.clan_members 
            WHERE clan_members.clan_id = clan_messages.clan_id 
            AND clan_members.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.clans 
            WHERE clans.id = clan_messages.clan_id 
            AND clans.owner_id = auth.uid()
          )
        )
      );
  END IF;
END $$;


-- ==============================================================================
-- 8. ABILITAZIONE SUPABASE REALTIME (Per notifiche e messaggi live istantanei)
-- ==============================================================================
DO $$ BEGIN
  -- Aggiunge le tabelle alla pubblicazione Realtime solo se non già presenti
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'clan_direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_direct_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'clan_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_messages;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- In caso supabase_realtime non sia ancora inizializzata
    NULL;
END $$;

-- ==============================================================================
-- 9. MODERAZIONE IA AUTOMATICA (Google Gemini 2.5 Flash)
-- Colonna moderation_status per approvazione preventiva dei contenuti
-- ==============================================================================
ALTER TABLE IF EXISTS public.posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.stories ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.comments ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.clan_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.direct_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.clan_direct_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.tournament_chat_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE IF EXISTS public.tournament_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';

-- Indice rapido per query filtrate su moderation_status se necessario
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON public.posts(moderation_status);

-- Fine Script
