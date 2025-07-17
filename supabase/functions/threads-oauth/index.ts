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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { personaId, authCode }: OAuthRequest = await req.json()

    if (!personaId || !authCode) {
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
      throw new Error('Persona not found')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'client_id': Deno.env.get('THREADS_APP_ID') ?? '',
        'client_secret': Deno.env.get('THREADS_APP_SECRET') ?? '',
        'grant_type': 'authorization_code',
        'redirect_uri': `${Deno.env.get('SUPABASE_URL')}/auth/callback`,
        'code': authCode
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData)
      throw new Error(tokenData.error_description || 'Failed to exchange authorization code')
    }

    // Get user info from Threads
    const userResponse = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${tokenData.access_token}`)
    const userData = await userResponse.json()

    if (!userResponse.ok || userData.error) {
      console.error('User info fetch failed:', userData)
      throw new Error('Failed to fetch user information')
    }

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
    console.error('Error in threads-oauth:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})