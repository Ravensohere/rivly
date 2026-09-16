import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rating, feedback, userEmail, userName } = await req.json()

    if (!feedback) {
      return new Response(
        JSON.stringify({ error: 'Feedback is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return new Response(
        JSON.stringify({ success: true, message: 'Feedback logged (Email skipped - set RESEND_API_KEY to enable)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate star rating display
    const starDisplay = rating ? '⭐'.repeat(rating) + '☆'.repeat(5 - rating) : 'No rating';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'feedback@rivly.in',
        to: ['ravenso.here@gmail.com'], 
        reply_to: userEmail || undefined,
        subject: `New Feedback from ${userName || 'User'} - ${rating ? `${rating}⭐` : 'No Rating'}`,
        html: `
          <h3>New Feedback Received</h3>
          <p><strong>From:</strong> ${userName || 'Unknown'} (${userEmail || 'No Email'})</p>
          <p><strong>Rating:</strong> ${starDisplay} (${rating || 0}/5)</p>
          <p><strong>Feedback:</strong></p>
          <p style="white-space: pre-wrap;">${feedback}</p>
          <hr />
          <p><small>Sent from Rivly App at ${new Date().toLocaleString()}</small></p>
        `,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
