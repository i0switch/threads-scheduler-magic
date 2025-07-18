import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://*.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileRequest {
  personaId: string
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

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { personaId }: ProfileRequest = await req.json()

    if (!personaId) {
      return new Response(
        JSON.stringify({ error: 'Missing persona ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching Threads profile for persona ${personaId}`)

    // Get persona with access token and verify ownership
    const { data: persona, error: personaError } = await supabaseClient
      .from('personas')
      .select('threads_access_token, threads_username, user_id')
      .eq('id', personaId)
      .eq('user_id', user.id)
      .single()

    if (personaError || !persona) {
      throw new Error('Persona not found')
    }

    if (!persona.threads_access_token) {
      throw new Error('Persona not connected to Threads')
    }

    // Fetch profile from Threads API
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${persona.threads_access_token}`
    )

    const profileData = await profileResponse.json()

    if (!profileResponse.ok || profileData.error) {
      console.error('Profile fetch failed:', profileData)
      throw new Error('Failed to fetch profile from Threads')
    }

    // Update persona with latest profile info
    const { error: updateError } = await supabaseClient
      .from('personas')
      .update({
        threads_username: profileData.username,
        avatar_url: profileData.threads_profile_picture_url || null
      })
      .eq('id', personaId)

    if (updateError) {
      console.error('Failed to update persona:', updateError)
    }

    console.log(`Successfully fetched profile for @${profileData.username}`)

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profileData.id,
          username: profileData.username,
          name: profileData.name,
          avatar_url: profileData.threads_profile_picture_url,
          biography: profileData.threads_biography
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-threads-profile:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})