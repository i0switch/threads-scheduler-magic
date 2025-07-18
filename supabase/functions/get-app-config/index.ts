import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://*.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching app configuration')

    const config = {
      threads_app_id: Deno.env.get('THREADS_APP_ID') ?? null
    }

    if (!config.threads_app_id) {
      return new Response(
        JSON.stringify({ error: 'Configuration not available' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
          } 
        }
      )
    }

    return new Response(
      JSON.stringify(config),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        } 
      }
    )

  } catch (error) {
    console.error('Error in get-app-config:', error)
    
    // Don't expose sensitive error details in production
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development'
    
    return new Response(
      JSON.stringify({ 
        error: isDevelopment ? error.message : 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        } 
      }
    )
  }
})