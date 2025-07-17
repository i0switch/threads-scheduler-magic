import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostRequest {
  postId: string
  content: string
  images?: string[]
  accessToken: string
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

    const { postId, content, images, accessToken }: PostRequest = await req.json()

    console.log('Received request:', { postId, content: content?.substring(0, 50), hasImages: !!images?.length, hasAccessToken: !!accessToken })

    if (!postId || !content || !accessToken) {
      console.error('Missing required fields:', { postId: !!postId, content: !!content, accessToken: !!accessToken })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Publishing post ${postId} to Threads...`)

    // Create container
    const postData: any = {
      text: content,
    }

    // Add image if present
    if (images && images.length > 0) {
      if (images.length === 1) {
        // Single image
        postData.media_type = 'IMAGE'
        postData.image_url = images[0]
      } else {
        // Multiple images not supported in simple way, fall back to text only
        console.log('Multiple images detected, falling back to text-only post')
        postData.media_type = 'TEXT'
      }
    } else {
      // Text only
      postData.media_type = 'TEXT'
    }

    console.log('Creating Threads container with data:', {
      ...postData,
      text: postData.text?.substring(0, 50) + '...'
    })

    // Step 1: Create container
    const createResponse = await fetch('https://graph.threads.net/me/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        ...postData,
        access_token: accessToken,
      }),
    })

    const createResult = await createResponse.json()
    console.log('Container creation result:', createResult)

    if (!createResponse.ok) {
      console.error(`Failed to create container: ${createResponse.status}`, createResult)
      throw new Error(`Failed to create container: ${createResponse.status} ${JSON.stringify(createResult)}`)
    }

    if (!createResult.id) {
      throw new Error('No creation ID returned from Threads API')
    }

    const creationId = createResult.id
    console.log(`Container created with ID: ${creationId}`)

    // Step 2: Publish container
    const publishResponse = await fetch('https://graph.threads.net/me/threads_publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      }),
    })

    const publishResult = await publishResponse.json()
    console.log('Publish result:', publishResult)

    if (!publishResponse.ok) {
      console.error(`Failed to publish container: ${publishResponse.status}`, publishResult)
      throw new Error(`Failed to publish container: ${publishResponse.status} ${JSON.stringify(publishResult)}`)
    }

    console.log(`Post published successfully: ${publishResult.id}`)

    // Update the post status in database
    const { error: updateError } = await supabaseClient
      .from('posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Failed to update post status:', updateError)
      // Don't throw error here - post was published successfully
    }

    // Log activity
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      
      if (user) {
        await supabaseClient
          .from('activity_logs')
          .insert({
            user_id: user.id,
            action_type: 'post_published',
            description: `Post "${content.substring(0, 50)}..." published to Threads`,
            metadata: { post_id: postId, threads_id: publishResult.id }
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        threadsId: publishResult.id,
        message: 'Post published successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in publish-post function:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to publish post',
        details: error.toString(),
        errorType: error.name || 'UnknownError'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})