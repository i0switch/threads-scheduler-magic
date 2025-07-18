-- Phase 1: Critical Security Fixes for Database Functions
-- Fix search path vulnerabilities in all database functions

-- 1. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- プロフィール作成
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  -- アカウント状態作成
  INSERT INTO public.user_account_status (user_id, is_active, is_approved)
  VALUES (NEW.id, false, false);
  
  RETURN NEW;
END;
$$;

-- 2. Fix get_user_emails_for_admin function
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin()
RETURNS TABLE(user_id uuid, email character varying)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins to execute this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au;
END;
$$;

-- 3. Fix encrypt_access_token function
CREATE OR REPLACE FUNCTION public.encrypt_access_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use Supabase's built-in encryption with ENCRYPTION_KEY secret
  RETURN CASE 
    WHEN token IS NULL OR token = '' THEN NULL
    ELSE encode(
      encrypt(
        token::bytea,
        decode(vault.secrets('ENCRYPTION_KEY'), 'base64'),
        'aes'
      ),
      'base64'
    )
  END;
END;
$$;

-- 4. Fix decrypt_access_token function
CREATE OR REPLACE FUNCTION public.decrypt_access_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrypt the access token
  RETURN CASE 
    WHEN encrypted_token IS NULL OR encrypted_token = '' THEN NULL
    ELSE convert_from(
      decrypt(
        decode(encrypted_token, 'base64'),
        decode(vault.secrets('ENCRYPTION_KEY'), 'base64'),
        'aes'
      ),
      'UTF8'
    )
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (backward compatibility)
    RETURN NULL;
END;
$$;

-- 5. Fix check_persona_limit function
CREATE OR REPLACE FUNCTION public.check_persona_limit(user_id_param uuid)
RETURNS TABLE(current_count bigint, persona_limit integer, can_create boolean)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(p.id) as current_count,
    COALESCE(uas.persona_limit, 1) as persona_limit,
    (COUNT(p.id) < COALESCE(uas.persona_limit, 1)) as can_create
  FROM public.personas p
  RIGHT JOIN (
    SELECT DISTINCT ON (user_id) user_id, persona_limit
    FROM public.user_account_status 
    WHERE user_id = user_id_param
    ORDER BY user_id, updated_at DESC
  ) uas ON uas.user_id = user_id_param
  WHERE p.user_id = user_id_param OR p.user_id IS NULL
  GROUP BY uas.persona_limit;
END;
$$;

-- 6. Fix check_login_attempts function
CREATE OR REPLACE FUNCTION public.check_login_attempts(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_failures integer;
BEGIN
  -- 過去15分間の失敗回数をカウント
  SELECT COUNT(*) INTO recent_failures
  FROM security_events
  WHERE event_type = 'login_failed'
    AND details->>'email' = user_email
    AND created_at > now() - interval '15 minutes';
  
  -- 5回以上の失敗でブロック
  RETURN recent_failures < 5;
END;
$$;

-- 7. Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_ip_address text DEFAULT NULL::text, 
  p_user_agent text DEFAULT NULL::text, 
  p_details jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_event_type,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_details
  );
EXCEPTION
  WHEN OTHERS THEN
    -- セキュリティログの失敗は他の処理をブロックしない
    NULL;
END;
$$;

-- 8. Fix validate_password_strength function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb := '{"valid": true, "errors": []}'::jsonb;
  errors text[] := '{}';
BEGIN
  -- 長さチェック
  IF length(password) < 8 THEN
    errors := array_append(errors, 'パスワードは8文字以上である必要があります');
  END IF;
  
  -- 大文字チェック
  IF password !~ '[A-Z]' THEN
    errors := array_append(errors, '大文字を含む必要があります');
  END IF;
  
  -- 小文字チェック
  IF password !~ '[a-z]' THEN
    errors := array_append(errors, '小文字を含む必要があります');
  END IF;
  
  -- 数字チェック
  IF password !~ '[0-9]' THEN
    errors := array_append(errors, '数字を含む必要があります');
  END IF;
  
  -- 特殊文字チェック
  IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
    errors := array_append(errors, '特殊文字を含む必要があります');
  END IF;
  
  -- 結果を構築
  IF array_length(errors, 1) > 0 THEN
    result := jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors)
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 9. Fix get_user_stats function
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE(total_users bigint, approved_users bigint, pending_users bigint, active_subscriptions bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(p.user_id) AS total_users,
    COUNT(uas.user_id) FILTER (WHERE uas.is_approved = true) AS approved_users,
    COUNT(p.user_id) - COUNT(uas.user_id) FILTER (WHERE uas.is_approved = true) AS pending_users,
    COUNT(uas.user_id) FILTER (WHERE uas.subscription_status IS NOT NULL AND uas.subscription_status <> 'free') AS active_subscriptions
  FROM public.profiles p
  LEFT JOIN public.user_account_status uas ON p.user_id = uas.user_id;
END;
$$;

-- 10. Fix has_role function  
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 12. Fix authenticate_service_request function
CREATE OR REPLACE FUNCTION public.authenticate_service_request(request_headers jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_header text;
  token text;
BEGIN
  -- Extract authorization header
  auth_header := request_headers ->> 'authorization';
  
  -- Check if header exists and starts with 'Bearer '
  IF auth_header IS NULL OR NOT auth_header LIKE 'Bearer %' THEN
    RETURN false;
  END IF;
  
  -- Extract token
  token := substring(auth_header from 8);
  
  -- Verify token format (basic JWT structure check)
  IF token IS NULL OR length(token) < 20 OR NOT token LIKE '%.%.%' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 13. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 14. Fix handle_new_user_account_status function
CREATE OR REPLACE FUNCTION public.handle_new_user_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_account_status (user_id, is_active, is_approved)
  VALUES (NEW.id, false, false);
  RETURN NEW;
END;
$$;