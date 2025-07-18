import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://*.lovableproject.com, https://localhost:8080, http://localhost:8080',
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

    // Authentication check - CRITICAL: Verify user is authenticated
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

    const { postId, content, images, accessToken }: PostRequest = await req.json()

    console.log('Received request:', { postId, content: content?.substring(0, 50), hasImages: !!images?.length, hasAccessToken: !!accessToken, userId: user.id })

    if (!postId || !content || !accessToken) {
      console.error('Missing required fields:', { postId: !!postId, content: !!content, accessToken: !!accessToken })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify post ownership - SECURITY: Ensure user owns the post
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single()

    if (postError || !post || post.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Post not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Publishing post ${postId} to Threads...`)

    let creationId: string

    // Handle different media types
    if (images && images.length > 0) {
      if (images.length === 1) {
        // Single image
        console.log('Creating single image post')
        const postData = {
          text: content,
          media_type: 'IMAGE',
          image_url: images[0],
          access_token: accessToken,
        }

        console.log('Creating Threads container with data:', {
          ...postData,
          text: postData.text?.substring(0, 50) + '...',
          access_token: '[REDACTED]'
        })

        const createResponse = await fetch('https://graph.threads.net/me/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(postData),
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

        creationId = createResult.id
        console.log(`Container created with ID: ${creationId}`)
      } else {
        // Multiple images - create carousel
        console.log(`Creating carousel post with ${images.length} images`)
        
        // First, create child containers for each image
        const childIds: string[] = []
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i]
          console.log(`Creating child container ${i + 1}/${images.length}`)
          
          const childResponse = await fetch('https://graph.threads.net/me/threads', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              media_type: 'IMAGE',
              image_url: imageUrl,
              access_token: accessToken,
            }),
          })

          const childResult = await childResponse.json()
          console.log(`Child container ${i + 1} result:`, childResult)

          if (!childResponse.ok) {
            console.error(`Failed to create child container ${i + 1}: ${childResponse.status}`, childResult)
            throw new Error(`Failed to create child container ${i + 1}: ${childResponse.status} ${JSON.stringify(childResult)}`)
          }

          if (!childResult.id) {
            throw new Error(`No creation ID returned for child container ${i + 1}`)
          }

          childIds.push(childResult.id)
        }

        // Create main carousel container
        const carouselData = {
          text: content,
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          access_token: accessToken,
        }

        console.log('Creating carousel container with data:', {
          ...carouselData,
          text: carouselData.text?.substring(0, 50) + '...',
          access_token: '[REDACTED]'
        })

        const createResponse = await fetch('https://graph.threads.net/me/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(carouselData),
        })

        const createResult = await createResponse.json()
        console.log('Carousel container creation result:', createResult)

        if (!createResponse.ok) {
          console.error(`Failed to create carousel container: ${createResponse.status}`, createResult)
          throw new Error(`Failed to create carousel container: ${createResponse.status} ${JSON.stringify(createResult)}`)
        }

        if (!createResult.id) {
          throw new Error('No creation ID returned from Threads API')
        }

        creationId = createResult.id
        console.log(`Carousel container created with ID: ${creationId}`)
      }
    } else {
      // Text only
      console.log('Creating text-only post')
      const postData = {
        text: content,
        media_type: 'TEXT',
        access_token: accessToken,
      }

      console.log('Creating Threads container with data:', {
        ...postData,
        text: postData.text?.substring(0, 50) + '...',
        access_token: '[REDACTED]'
      })

      const createResponse = await fetch('https://graph.threads.net/me/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData),
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

      creationId = createResult.id
      console.log(`Container created with ID: ${creationId}`)
    }

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

    // Log activity - user is already authenticated at this point
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'post_published',
        description: `Post "${content.substring(0, 50)}..." published to Threads`,
        metadata: { post_id: postId, threads_id: publishResult.id }
      })

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
    
    // SECURITY: Don't expose sensitive error details in production
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development'
    
    if (isDevelopment) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      })
    }
    
    return new Response(
      JSON.stringify({ 
        error: isDevelopment ? error.message : 'Internal server error',
        errorType: isDevelopment ? (error.name || 'UnknownError') : 'ServerError'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})