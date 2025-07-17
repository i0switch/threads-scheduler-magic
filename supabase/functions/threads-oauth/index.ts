
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Threads OAuth Request Started ===')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { personaId, authCode }: OAuthRequest = await req.json()
    console.log(`Received request - Persona ID: ${personaId}, Auth Code length: ${authCode?.length || 0}`)

    if (!personaId || !authCode) {
      console.error('Missing required fields:', { personaId: !!personaId, authCode: !!authCode })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing OAuth for persona ${personaId}`)

    // Get persona details
    const { data: persona, error: personaError } = await supabaseClient
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single()

    if (personaError || !persona) {
      console.error('Persona fetch error:', personaError)
      throw new Error('Persona not found')
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
      appIdLength: threadsAppId?.length || 0
    })

    if (!threadsAppId || !threadsAppSecret || !supabaseUrl) {
      throw new Error('Missing required environment variables for Threads API')
    }

    // Construct redirect URI
    const redirectUri = `${supabaseUrl.replace('//', '//').replace(/\/$/, '')}/functions/v1/threads-oauth-callback`
    console.log(`Using redirect URI: ${redirectUri}`)

    // Exchange authorization code for access token
    const tokenRequestBody = new URLSearchParams({
      'client_id': threadsAppId,
      'client_secret': threadsAppSecret,
      'grant_type': 'authorization_code',
      'redirect_uri': redirectUri,
      'code': authCode
    })

    console.log('Token exchange request params:', {
      client_id: threadsAppId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_length: authCode.length
    })

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response data:', JSON.stringify(tokenData, null, 2))

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData
      })
      throw new Error(tokenData.error_description || tokenData.error?.message || 'Failed to exchange authorization code')
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
      throw new Error(userData.error?.message || 'Failed to fetch user information')
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
      .eq('id', personaId)

    if (updateError) {
      console.error('Persona update error:', updateError)
      throw updateError
    }

    console.log(`Successfully connected persona ${personaId} to Threads user @${userData.username}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        username: userData.username,
        name: userData.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('=== Error in threads-oauth ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
