import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Syncing analytics data...')

    // Get all active personas with Threads access
    const { data: personas, error: personasError } = await supabaseClient
      .from('personas')
      .select('*')
      .eq('is_active', true)
      .not('threads_access_token', 'is', null)

    if (personasError) {
      throw personasError
    }

    console.log(`Found ${personas?.length || 0} personas to sync analytics for`)

    let syncedCount = 0

    if (personas && personas.length > 0) {
      for (const persona of personas) {
        try {
          console.log(`Syncing analytics for persona: ${persona.name}`)

          // Get insights from Threads API
          const insightsResponse = await fetch(`https://graph.threads.net/v1.0/me/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${persona.threads_access_token}`)
          
          if (!insightsResponse.ok) {
            console.log(`Failed to get insights for ${persona.name}: ${insightsResponse.status}`)
            continue
          }

          const insightsData = await insightsResponse.json()
          
          // Process insights data
          const today = new Date().toISOString().split('T')[0]
          let totalViews = 0
          let totalLikes = 0
          let totalReplies = 0
          let totalReposts = 0
          let totalQuotes = 0

          if (insightsData.data) {
            for (const insight of insightsData.data) {
              switch (insight.name) {
                case 'views':
                  totalViews += insight.values?.[0]?.value || 0
                  break
                case 'likes':
                  totalLikes += insight.values?.[0]?.value || 0
                  break
                case 'replies':
                  totalReplies += insight.values?.[0]?.value || 0
                  break
                case 'reposts':
                  totalReposts += insight.values?.[0]?.value || 0
                  break
                case 'quotes':
                  totalQuotes += insight.values?.[0]?.value || 0
                  break
              }
            }
          }

          // Get posts count for today
          const { data: todayPosts } = await supabaseClient
            .from('posts')
            .select('id')
            .eq('persona_id', persona.id)
            .eq('status', 'published')
            .gte('published_at', `${today}T00:00:00Z`)
            .lt('published_at', `${today}T23:59:59Z`)

          const postsCount = todayPosts?.length || 0

          // Calculate engagement rate
          const totalEngagements = totalLikes + totalReplies + totalReposts + totalQuotes
          const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0

          // Upsert analytics data
          const { error: analyticsError } = await supabaseClient
            .from('analytics')
            .upsert({
              user_id: persona.user_id,
              persona_id: persona.id,
              date: today,
              posts_count: postsCount,
              replies_count: totalReplies,
              likes_count: totalLikes,
              comments_count: totalReplies, // Comments are replies in Threads
              shares_count: totalReposts + totalQuotes,
              engagement_rate: parseFloat(engagementRate.toFixed(2))
            }, {
              onConflict: 'user_id,persona_id,date'
            })

          if (analyticsError) {
            console.error(`Failed to save analytics for ${persona.name}:`, analyticsError)
          } else {
            syncedCount++
            console.log(`Analytics synced for ${persona.name}`)
          }

        } catch (error) {
          console.error(`Error syncing analytics for persona ${persona.name}:`, error)
        }
      }
    }

    // Clean up old analytics data (keep last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { error: cleanupError } = await supabaseClient
      .from('analytics')
      .delete()
      .lt('date', ninetyDaysAgo.toISOString().split('T')[0])

    if (cleanupError) {
      console.error('Failed to cleanup old analytics:', cleanupError)
    } else {
      console.log('Old analytics data cleaned up')
    }

    const summary = {
      timestamp: new Date().toISOString(),
      personasChecked: personas?.length || 0,
      analyticsSynced: syncedCount
    }

    console.log('Analytics sync completed:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        summary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in analytics-sync function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to sync analytics',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
