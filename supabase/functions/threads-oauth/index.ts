
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthRequest {
  personaId: string
  authCode: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== CORS preflight request ===')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Threads OAuth Request Started ===')
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // This should be the persona ID
    const error = url.searchParams.get('error')

    console.log('URL parameters:', { 
      code: code ? `${code.substring(0, 10)}...` : null, 
      state, 
      error,
      allParams: Object.fromEntries(url.searchParams.entries())
    })

    if (error) {
      console.error('OAuth error from URL:', error)
      const errorDescription = url.searchParams.get('error_description')
      console.error('Error description:', errorDescription)
      // Redirect to frontend with error
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`, 302)
    }

    if (!code || !state) {
      console.error('Missing required URL parameters:', { code: !!code, state: !!state })
      // Redirect to frontend with error
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=missing_parameters`, 302)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing OAuth for persona ${state}`)

    // Get persona details
    const { data: persona, error: personaError } = await supabaseClient
      .from('personas')
      .select('*')
      .eq('id', state)
      .single()

    if (personaError || !persona) {
      console.error('Persona fetch error:', personaError)
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=persona_not_found`, 302)
    }

    console.log(`Found persona: ${persona.name}`)

    // Environment variables check
    const threadsAppId = Deno.env.get('THREADS_APP_ID')
    const threadsAppSecret = Deno.env.get('THREADS_APP_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    console.log('Environment check:', {
      hasAppId: !!threadsAppId,
      hasAppSecret: !!threadsAppSecret,
      hasSupabaseUrl: !!supabaseUrl,
      appIdLength: threadsAppId?.length || 0,
      appId: threadsAppId ? `${threadsAppId.substring(0, 6)}...` : 'missing'
    })

    if (!threadsAppId || !threadsAppSecret || !supabaseUrl) {
      console.error('Missing required environment variables for Threads API')
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=missing_env_variables`, 302)
    }

    // Use the correct redirect URI that matches what we sent in the authorization URL
    const redirectUri = `${supabaseUrl}/functions/v1/threads-oauth`
    console.log(`Using redirect URI: ${redirectUri}`)

    // Exchange authorization code for access token
    const tokenRequestBody = new URLSearchParams({
      'client_id': threadsAppId,
      'client_secret': threadsAppSecret,
      'grant_type': 'authorization_code',
      'redirect_uri': redirectUri,
      'code': code
    })

    console.log('Token exchange request params:', {
      client_id: threadsAppId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_length: code.length,
      code_preview: `${code.substring(0, 20)}...`
    })

    console.log('Making token exchange request to:', 'https://graph.threads.net/oauth/access_token')

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()))
    console.log('Token response data:', JSON.stringify(tokenData, null, 2))

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData
      })
      const errorMessage = tokenData.error_description || tokenData.error?.message || tokenData.error || 'Failed to exchange authorization code'
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=${encodeURIComponent(errorMessage)}&state=${state}`, 302)
    }

    console.log('Token exchange successful, access token received')

    // Get user info from Threads
    const userInfoUrl = `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${tokenData.access_token}`
    console.log('Fetching user info from:', userInfoUrl.replace(tokenData.access_token, '[REDACTED]'))

    const userResponse = await fetch(userInfoUrl)
    const userData = await userResponse.json()

    console.log('User response status:', userResponse.status)
    console.log('User data:', JSON.stringify(userData, null, 2))

    if (!userResponse.ok || userData.error) {
      console.error('User info fetch failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        error: userData
      })
      const errorMessage = userData.error?.message || 'Failed to fetch user information'
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=${encodeURIComponent(errorMessage)}&state=${state}`, 302)
    }

    console.log(`Successfully fetched user info for @${userData.username}`)

    // Update persona with access token and user info
    const { error: updateError } = await supabaseClient
      .from('personas')
      .update({
        threads_access_token: tokenData.access_token,
        threads_username: userData.username,
        is_active: true
      })
      .eq('id', state)

    if (updateError) {
      console.error('Persona update error:', updateError)
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=database_update_failed&state=${state}`, 302)
    }

    console.log(`Successfully connected persona ${state} to Threads user @${userData.username}`)

    // Redirect to success page
    return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?code=${code}&state=${state}`, 302)

  } catch (error) {
    console.error('=== Error in threads-oauth ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Extract state from URL if possible for redirect
    try {
      const url = new URL(req.url)
      const state = url.searchParams.get('state')
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=${encodeURIComponent(error.message)}&state=${state || ''}`, 302)
    } catch {
      return Response.redirect(`https://13e3d28d-3641-439c-a146-3815ef2cdded.lovableproject.com/auth/callback?error=${encodeURIComponent(error.message)}`, 302)
    }
  }
})
