-- Phase 2: Fix Security Definer Views
-- Remove the security definer property from views

-- Check if personas_secure view exists and recreate it without security definer
DROP VIEW IF EXISTS public.personas_secure;

-- Create a secure view for personas that hides sensitive data
-- This view should NOT be security definer to avoid the security warning
CREATE VIEW public.personas_secure AS
SELECT 
  id,
  user_id,
  name,
  age,
  personality,
  expertise,
  tone_of_voice,
  avatar_url,
  threads_username,
  threads_app_id,
  threads_app_secret,
  webhook_verify_token,
  is_active,
  ai_auto_reply_enabled,
  auto_reply_enabled,
  auto_reply_delay_minutes,
  created_at,
  updated_at
  -- Deliberately excluding threads_access_token for security
FROM public.personas;

-- Enable RLS on the view
ALTER VIEW public.personas_secure SET (security_invoker = true);

-- Grant select permission to authenticated users
GRANT SELECT ON public.personas_secure TO authenticated;