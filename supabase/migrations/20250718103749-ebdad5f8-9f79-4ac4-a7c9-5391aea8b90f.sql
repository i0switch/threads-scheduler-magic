-- Add encryption functions for access tokens
CREATE OR REPLACE FUNCTION public.encrypt_access_token(token TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_access_token(encrypted_token TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a secure view for personas that automatically decrypts access tokens
CREATE OR REPLACE VIEW public.personas_secure AS
SELECT 
  id,
  user_id,
  name,
  is_active,
  created_at,
  updated_at,
  auto_reply_enabled,
  ai_auto_reply_enabled,
  auto_reply_delay_minutes,
  age,
  personality,
  expertise,
  tone_of_voice,
  avatar_url,
  threads_app_id,
  threads_app_secret,
  webhook_verify_token,
  threads_username,
  -- Decrypt access token only for the row owner or admin
  CASE 
    WHEN auth.uid() = user_id OR is_admin(auth.uid()) THEN
      public.decrypt_access_token(threads_access_token)
    ELSE NULL
  END as threads_access_token
FROM public.personas;

-- Enable RLS on the view (security barrier)
ALTER VIEW public.personas_secure SET (security_barrier = true);

-- Grant permissions to authenticated users
GRANT SELECT ON public.personas_secure TO authenticated;

COMMENT ON VIEW public.personas_secure IS 'Secure view of personas table with encrypted access token decryption';
COMMENT ON FUNCTION public.encrypt_access_token(TEXT) IS 'Encrypts access tokens using Supabase vault encryption';
COMMENT ON FUNCTION public.decrypt_access_token(TEXT) IS 'Decrypts access tokens using Supabase vault encryption';