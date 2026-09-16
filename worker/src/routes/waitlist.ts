import { Hono } from 'hono';
import { Bindings, Variables, WaitlistEntry } from '../types';
import { createSupabaseClient } from '../services/supabase';

const waitlistRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /waitlist/status?email=user@example.com - Check waitlist status (Public)
waitlistRoutes.get('/status', async (c) => {
  const supabase = createSupabaseClient(c.env);
  try {
    const email = c.req.query('email')?.toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    // Check if email exists in waitlist
    const { data, error } = await supabase
      .from('waitlist')
      .select('status') // Removed created_at
      .ilike('email', email) // Case-insensitive check
      .maybeSingle();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      // User not in waitlist at all
      return c.json({
        inWaitlist: false,
        status: 'not_found',
        message: 'You need to join the waitlist to access the app'
      });
    }

    // User exists in waitlist
    return c.json({
      inWaitlist: true,
      status: data.status,
      // Removed createdAt from response
      message: 
        data.status === 'approved' 
          ? 'You have been approved! You can now access the app.'
          : data.status === 'pending'
          ? 'Your application is still pending review. We\'ll notify you once approved.'
          : 'Your application was not approved at this time.'
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /waitlist - Public waitlist submission
waitlistRoutes.post('/', async (c) => {
  const supabase = createSupabaseClient(c.env);
  try {
    const { email, motivation, user_type, phone }: WaitlistEntry = await c.req.json();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    // Use upsert to handle cases where the record already exists
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        {
          email,
          motivation,
          user_type,
          phone,
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Added to waitlist' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default waitlistRoutes;
