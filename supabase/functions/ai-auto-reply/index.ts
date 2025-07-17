import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReplyRequest {
  personaId: string
  originalPostId: string
  replyText: string
  replyAuthor: string
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

    const { personaId, originalPostId, replyText, replyAuthor }: ReplyRequest = await req.json()

    if (!personaId || !originalPostId || !replyText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing auto-reply for persona ${personaId}`)

    // Get persona details
    const { data: persona, error: personaError } = await supabaseClient
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single()

    if (personaError || !persona) {
      throw new Error('Persona not found')
    }

    // Check if auto-reply is enabled
    if (!persona.ai_auto_reply_enabled) {
      return new Response(
        JSON.stringify({ message: 'Auto-reply not enabled for this persona' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check auto-reply settings
    const { data: autoReplies } = await supabaseClient
      .from('auto_replies')
      .select('*')
      .eq('persona_id', personaId)
      .eq('is_active', true)

    let shouldReply = false
    let replyTemplate = ''

    // Check if reply contains trigger keywords
    if (autoReplies && autoReplies.length > 0) {
      for (const autoReply of autoReplies) {
        if (autoReply.trigger_keywords) {
          const keywords = autoReply.trigger_keywords
          const hasKeyword = keywords.some((keyword: string) => 
            replyText.toLowerCase().includes(keyword.toLowerCase())
          )
          
          if (hasKeyword) {
            shouldReply = true
            replyTemplate = autoReply.response_template
            break
          }
        }
      }
    }

    if (!shouldReply) {
      // Use AI to determine if we should reply
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not configured')
      }

      const aiPrompt = `
        You are ${persona.name}, a ${persona.age || 'young'} person with the following characteristics:
        - Personality: ${persona.personality || 'friendly and helpful'}
        - Expertise: ${persona.expertise?.join(', ') || 'general topics'}
        - Tone of voice: ${persona.tone_of_voice || 'casual and friendly'}
        
        Someone replied to your post: "${replyText}"
        Author: ${replyAuthor}
        
        Should you reply to this message? Consider:
        1. Is it a question or request that needs a response?
        2. Is it a meaningful comment that warrants engagement?
        3. Does it relate to your expertise or interests?
        4. Is it spam or inappropriate content?
        
        Respond with exactly "YES" if you should reply, or "NO" if you shouldn't.
        If YES, also provide a suitable reply that matches your persona.
        
        Format: YES|Your reply here OR NO
      `

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      })

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response')
      }

      const aiData = await aiResponse.json()
      const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

      console.log('AI response:', aiText)

      if (aiText.startsWith('YES|')) {
        shouldReply = true
        replyTemplate = aiText.substring(4).trim()
      } else if (!aiText.startsWith('NO')) {
        // Fallback: if response doesn't start with YES| or NO, don't reply
        shouldReply = false
      }
    }

    if (!shouldReply) {
      return new Response(
        JSON.stringify({ message: 'No reply needed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send reply using Threads API
    if (persona.threads_access_token && replyTemplate) {
      console.log(`Sending auto-reply: ${replyTemplate}`)

      const replyResponse = await fetch('https://graph.threads.net/v1.0/me/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: replyTemplate,
          reply_to_id: originalPostId,
          access_token: persona.threads_access_token,
        }),
      })

      if (replyResponse.ok) {
        const replyData = await replyResponse.json()
        
        // Publish the reply
        await fetch(`https://graph.threads.net/v1.0/${replyData.id}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: persona.threads_access_token,
          }),
        })

        console.log('Auto-reply sent successfully')
      } else {
        console.error('Failed to send auto-reply')
      }
    }

    // Log the reply in database
    await supabaseClient
      .from('thread_replies')
      .update({ auto_reply_sent: true })
      .eq('original_post_id', originalPostId)
      .eq('reply_author_id', replyAuthor)

    // Log activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: persona.user_id,
        persona_id: personaId,
        action_type: 'auto_reply_sent',
        description: `Auto-reply sent to ${replyAuthor}`,
        metadata: { original_post_id: originalPostId, reply_text: replyTemplate }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        replied: shouldReply,
        replyText: replyTemplate,
        message: shouldReply ? 'Auto-reply sent' : 'No reply needed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in ai-auto-reply function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process auto-reply',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})