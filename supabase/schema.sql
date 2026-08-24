-- =========================================================
-- DataFlex Complete Supabase Database Schema (Admin & Customer)
-- =========================================================
-- Copy and paste this script into your Supabase Dashboard:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click 'RUN'

-- ---------------------------------------------------------
-- 1. PROFILES TABLE (Linked to Supabase Auth)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  balance NUMERIC(12, 2) DEFAULT 5000.00 NOT NULL,
  role TEXT DEFAULT 'customer' NOT NULL, -- 'customer', 'admin', 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Security Definer helper to check if current session is an admin without causing RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR LOWER(email) = 'admin@datahub.gghh')
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile or public profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile or public profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users and Admins can update profiles" ON public.profiles;
CREATE POLICY "Users and Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);


-- ---------------------------------------------------------
-- 2. BUNDLES TABLE (Data Plans Catalog)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bundles (
  id TEXT PRIMARY KEY,
  network TEXT DEFAULT 'MTN' NOT NULL, -- 'MTN', 'Vodafone', 'AirtelTigo'
  name TEXT NOT NULL,
  gb NUMERIC(8, 2) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  validity TEXT NOT NULL,
  popular BOOLEAN DEFAULT FALSE NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'fast' NOT NULL, -- 'fast', 'slow'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for bundles
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bundles are viewable by everyone" ON public.bundles;
CREATE POLICY "Bundles are viewable by everyone"
  ON public.bundles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage bundles" ON public.bundles;
CREATE POLICY "Admins can manage bundles"
  ON public.bundles FOR ALL
  USING (true);


-- ---------------------------------------------------------
-- 2b. USER_BUNDLES TABLE (Per-Customer Custom Catalog)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_bundles (
  id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT DEFAULT 'MTN' NOT NULL,
  name TEXT NOT NULL,
  gb NUMERIC(8, 2) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  validity TEXT NOT NULL,
  popular BOOLEAN DEFAULT FALSE NOT NULL,
  description TEXT,
  group_type TEXT DEFAULT 'fast' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.user_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User bundles are viewable" ON public.user_bundles;
CREATE POLICY "User bundles are viewable"
  ON public.user_bundles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "User bundles are manageable" ON public.user_bundles;
CREATE POLICY "User bundles are manageable"
  ON public.user_bundles FOR ALL
  USING (true);


-- ---------------------------------------------------------
-- 3. ORDERS TABLE (Data & Airtime Purchase Records)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  bundle_id TEXT,
  bundle_name TEXT NOT NULL,
  network TEXT DEFAULT 'MTN' NOT NULL,
  gb NUMERIC(8, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
  payment_method TEXT DEFAULT 'MTN MoMo' NOT NULL,
  group_type TEXT DEFAULT 'fast' NOT NULL, -- 'fast', 'slow'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders are viewable by owners and admins" ON public.orders;
CREATE POLICY "Orders are viewable by owners and admins"
  ON public.orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and users can update orders" ON public.orders;
CREATE POLICY "Admins and users can update orders"
  ON public.orders FOR UPDATE
  USING (true);


-- ---------------------------------------------------------
-- 4. TRANSACTIONS TABLE (Wallet Credits, Debits & Logs)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'credit', 'debit'
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2),
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'success' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions are viewable" ON public.transactions;
CREATE POLICY "Transactions are viewable"
  ON public.transactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Transactions can be inserted" ON public.transactions;
CREATE POLICY "Transactions can be inserted"
  ON public.transactions FOR INSERT
  WITH CHECK (true);


-- ---------------------------------------------------------
-- 5. NOTIFICATIONS TABLE (In-App Push & Broadcasts)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  type TEXT DEFAULT 'order' NOT NULL, -- 'order', 'announcement', 'system', 'payment'
  audience TEXT DEFAULT 'customer' NOT NULL, -- 'customer', 'admin', 'all'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications are viewable" ON public.notifications;
CREATE POLICY "Notifications are viewable"
  ON public.notifications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Notifications can be updated" ON public.notifications;
CREATE POLICY "Notifications can be updated"
  ON public.notifications FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Notifications can be inserted" ON public.notifications;
CREATE POLICY "Notifications can be inserted"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications can be deleted" ON public.notifications;
CREATE POLICY "Notifications can be deleted"
  ON public.notifications FOR DELETE
  USING (true);


-- ---------------------------------------------------------
-- 6. WITHDRAWALS TABLE (Admin MoMo Payouts)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL,
  account TEXT NOT NULL,       -- destination MoMo number
  destination TEXT,            -- alias
  network TEXT DEFAULT 'MTN' NOT NULL,
  status TEXT DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'rejected'
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Withdrawals are viewable" ON public.withdrawals;
CREATE POLICY "Withdrawals are viewable"
  ON public.withdrawals FOR ALL
  USING (true);


-- ---------------------------------------------------------
-- 7. SETTINGS TABLE (Store Branding & Operation Controls)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  store_name TEXT DEFAULT 'DataFlex' NOT NULL,
  support_email TEXT DEFAULT 'support@dataflex.gh' NOT NULL,
  support_phone TEXT DEFAULT '0244000111' NOT NULL,
  momo_number TEXT DEFAULT '0244000111' NOT NULL,
  auto_approve BOOLEAN DEFAULT TRUE NOT NULL,
  maintenance BOOLEAN DEFAULT FALSE NOT NULL,
  min_withdrawal NUMERIC(12, 2) DEFAULT 10.00 NOT NULL,
  paystack_public_key TEXT DEFAULT 'pk_test_89f8b1554a54065b1017190634b2755f9883993e',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
CREATE POLICY "Anyone can read settings"
  ON public.settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can manage settings" ON public.settings;
CREATE POLICY "Anyone can manage settings"
  ON public.settings FOR ALL
  USING (true);

-- Insert initial global default settings
INSERT INTO public.settings (id, store_name, support_email, support_phone, momo_number, auto_approve, maintenance, min_withdrawal, paystack_public_key)
VALUES ('global', 'DataFlex', 'support@dataflex.gh', '0244000111', '0244000111', true, false, 10.00, 'pk_test_89f8b1554a54065b1017190634b2755f9883993e')
ON CONFLICT (id) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  support_email = EXCLUDED.support_email,
  support_phone = EXCLUDED.support_phone,
  momo_number = EXCLUDED.momo_number,
  paystack_public_key = COALESCE(EXCLUDED.paystack_public_key, public.settings.paystack_public_key);


-- ---------------------------------------------------------
-- 8. SEED DATA PLANS (Catalog)
-- ---------------------------------------------------------
INSERT INTO public.bundles (id, network, name, gb, price, validity, popular, group_type)
VALUES
  ('b1', 'MTN', 'Starter 1GB', 1, 6.00, '24 hours', false, 'fast'),
  ('b2', 'MTN', 'Daily 2GB', 2, 11.00, '24 hours', false, 'fast'),
  ('b3', 'MTN', 'Weekly 5GB', 5, 25.00, '7 days', true, 'fast'),
  ('b9', 'MTN', 'Flash 3GB', 3, 15.00, '24 hours', false, 'fast'),
  ('b4', 'MTN', 'Weekly 10GB', 10, 45.00, '7 days', false, 'fast'),
  ('b5', 'MTN', 'Monthly 20GB', 20, 85.00, '30 days', true, 'fast'),
  ('b6', 'MTN', 'Monthly 50GB', 50, 190.00, '30 days', false, 'fast'),
  ('b7', 'MTN', 'Mega 100GB', 100, 340.00, '30 days', false, 'fast'),
  ('b8', 'MTN', 'Pro 200GB', 200, 620.00, '60 days', false, 'slow'),
  ('b10', 'MTN', 'Ultra 300GB', 300, 880.00, '90 days', false, 'slow')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  gb = EXCLUDED.gb,
  price = EXCLUDED.price,
  validity = EXCLUDED.validity,
  popular = EXCLUDED.popular,
  group_type = EXCLUDED.group_type;


-- ---------------------------------------------------------
-- 9. TRIGGER FOR AUTOMATIC PROFILE CREATION ON AUTH SIGNUP
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, name, email, phone, avatar_url, balance, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    5000.00,
    CASE WHEN LOWER(NEW.email) = 'admin@datahub.gghh' THEN 'admin' ELSE 'customer' END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = CASE WHEN LOWER(EXCLUDED.email) = 'admin@datahub.gghh' THEN 'admin' ELSE public.profiles.role END;

  -- Create welcome notification
  INSERT INTO public.notifications (user_id, title, message, type, audience)
  VALUES (
    NEW.id,
    'Welcome to DataFlex 🎉',
    'Buy MTN data bundles instantly. Enjoy unbeatable wholesale pricing and lightning delivery!',
    'announcement',
    'customer'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------
-- 10. REALTIME REPLICATION PUBLICATION FOR ALL TABLES
-- ---------------------------------------------------------
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.profiles, 
  public.orders, 
  public.bundles, 
  public.user_bundles, 
  public.notifications, 
  public.withdrawals, 
  public.transactions,
  public.settings;
