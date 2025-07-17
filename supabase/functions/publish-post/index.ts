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

    // Prepare media containers for images
    let mediaContainers: string[] = []
    
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        console.log(`Creating media container for image: ${imageUrl}`)
        
        const mediaResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'IMAGE',
            image_url: imageUrl,
            access_token: accessToken,
          }),
        })

        if (!mediaResponse.ok) {
          const errorText = await mediaResponse.text()
          console.error(`Failed to create media container: ${mediaResponse.status} ${errorText}`)
          throw new Error(`Failed to create media container: ${mediaResponse.status} ${errorText}`)
        }

        const mediaData = await mediaResponse.json()
        mediaContainers.push(mediaData.id)
      }
    }

    // Create the main post
    const postData: any = {
      media_type: 'TEXT',
      text: content,
      access_token: accessToken,
    }

    // Add media containers if any
    if (mediaContainers.length > 0) {
      postData.media_type = 'CAROUSEL'
      postData.children = mediaContainers
    }

    console.log('Creating Threads post with data:', postData)

    const createResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error(`Failed to create post: ${createResponse.status} ${errorText}`)
      throw new Error(`Failed to create post: ${createResponse.status} ${errorText}`)
    }

    const createData = await createResponse.json()
    const creationId = createData.id

    console.log(`Post created with ID: ${creationId}`)

    // Publish the post
    const publishResponse = await fetch(`https://graph.threads.net/v1.0/${creationId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    })

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text()
      console.error(`Failed to publish post: ${publishResponse.status} ${errorText}`)
      throw new Error(`Failed to publish post: ${publishResponse.status} ${errorText}`)
    }

    const publishData = await publishResponse.json()
    console.log(`Post published successfully: ${publishData.id}`)

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
            metadata: { post_id: postId, threads_id: publishData.id }
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        threadsId: publishData.id,
        message: 'Post published successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in publish-post function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to publish post',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})