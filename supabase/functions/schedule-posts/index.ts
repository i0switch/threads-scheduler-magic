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

    console.log('Running scheduled posts check...')

    // Get posts that are scheduled and due for publishing
    const now = new Date()
    const { data: duePosts, error: postsError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        personas (
          id,
          name,
          threads_access_token,
          threads_username,
          user_id
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
      .not('personas', 'is', null)

    if (postsError) {
      throw postsError
    }

    console.log(`Found ${duePosts?.length || 0} posts due for publishing`)

    let publishedCount = 0
    let failedCount = 0

    if (duePosts && duePosts.length > 0) {
      for (const post of duePosts) {
        try {
          if (!post.personas?.threads_access_token) {
            console.log(`Skipping post ${post.id}: No Threads access token`)
            continue
          }

          console.log(`Publishing post ${post.id}: "${post.content.substring(0, 50)}..."`)

          // Call the publish-post function
          const publishResponse = await supabaseClient.functions.invoke('publish-post', {
            body: {
              postId: post.id,
              content: post.content,
              images: post.images,
              accessToken: post.personas.threads_access_token
            }
          })

          if (publishResponse.error) {
            throw publishResponse.error
          }

          publishedCount++
          console.log(`Successfully published post ${post.id}`)

          // Log activity
          await supabaseClient
            .from('activity_logs')
            .insert({
              user_id: post.personas.user_id,
              persona_id: post.persona_id,
              action_type: 'scheduled_post_published',
              description: `Scheduled post "${post.content.substring(0, 50)}..." published automatically`,
              metadata: { post_id: post.id }
            })

        } catch (error) {
          console.error(`Failed to publish post ${post.id}:`, error)
          failedCount++

          // Update post status to failed and increment retry count
          const retryCount = (post.retry_count || 0) + 1
          const maxRetries = post.max_retries || 3

          if (retryCount >= maxRetries) {
            // Mark as failed if max retries reached
            await supabaseClient
              .from('posts')
              .update({
                status: 'failed',
                retry_count: retryCount,
                last_retry_at: new Date().toISOString()
              })
              .eq('id', post.id)

            console.log(`Post ${post.id} marked as failed after ${retryCount} attempts`)
          } else {
            // Schedule for retry in 1 hour
            const nextRetry = new Date(now.getTime() + 60 * 60 * 1000)
            await supabaseClient
              .from('posts')
              .update({
                retry_count: retryCount,
                last_retry_at: new Date().toISOString(),
                scheduled_for: nextRetry.toISOString()
              })
              .eq('id', post.id)

            console.log(`Post ${post.id} scheduled for retry at ${nextRetry.toISOString()}`)
          }

          // Log the failure
          await supabaseClient
            .from('activity_logs')
            .insert({
              user_id: post.personas.user_id,
              persona_id: post.persona_id,
              action_type: 'post_publish_failed',
              description: `Failed to publish scheduled post (attempt ${retryCount}/${maxRetries})`,
              metadata: { post_id: post.id, error: error.message }
            })
        }
      }
    }

    // Also check for posts that need auto-scheduling
    const { data: autoSchedulePosts, error: autoError } = await supabaseClient
      .from('posts')
      .select(`
        *,
        personas (
          id,
          name,
          user_id
        )
      `)
      .eq('status', 'draft')
      .eq('auto_schedule', true)
      .is('scheduled_for', null)

    if (autoError) {
      console.error('Error fetching auto-schedule posts:', autoError)
    } else if (autoSchedulePosts && autoSchedulePosts.length > 0) {
      console.log(`Found ${autoSchedulePosts.length} posts for auto-scheduling`)

      for (const post of autoSchedulePosts) {
        try {
          // Get scheduling settings for the persona
          const { data: settings } = await supabaseClient
            .from('scheduling_settings')
            .select('*')
            .eq('persona_id', post.persona_id)
            .single()

          if (settings && settings.auto_schedule_enabled) {
            const optimalHours = settings.optimal_hours || [9, 12, 15, 18, 21]
            const timezone = settings.timezone || 'Asia/Tokyo'
            
            // Calculate next optimal time
            const nextOptimalTime = getNextOptimalTime(optimalHours, timezone)

            await supabaseClient
              .from('posts')
              .update({
                scheduled_for: nextOptimalTime.toISOString(),
                status: 'scheduled'
              })
              .eq('id', post.id)

            console.log(`Auto-scheduled post ${post.id} for ${nextOptimalTime.toISOString()}`)

            // Log activity
            await supabaseClient
              .from('activity_logs')
              .insert({
                user_id: post.personas.user_id,
                persona_id: post.persona_id,
                action_type: 'post_auto_scheduled',
                description: `Post auto-scheduled for ${nextOptimalTime.toLocaleString()}`,
                metadata: { post_id: post.id, scheduled_for: nextOptimalTime.toISOString() }
              })
          }
        } catch (error) {
          console.error(`Failed to auto-schedule post ${post.id}:`, error)
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      postsChecked: duePosts?.length || 0,
      published: publishedCount,
      failed: failedCount,
      autoScheduled: autoSchedulePosts?.length || 0
    }

    console.log('Scheduling check completed:', summary)

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
    console.error('Error in schedule-posts function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process scheduled posts',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getNextOptimalTime(optimalHours: number[], timezone: string): Date {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  // Find the next optimal hour today
  for (const hour of optimalHours.sort()) {
    const candidate = new Date(now)
    candidate.setHours(hour, 0, 0, 0)
    
    if (candidate > now) {
      return candidate
    }
  }
  
  // If no optimal time today, use first optimal hour tomorrow
  const nextDay = new Date(tomorrow)
  nextDay.setHours(optimalHours[0], 0, 0, 0)
  return nextDay
}