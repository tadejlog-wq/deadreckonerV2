// ============================================================
// Deadreckoner — shared rate limiter.
// Backed by the public.rate_limits table (see backend/ratelimit.sql).
// Fails OPEN on infrastructure error so a limiter outage never
// takes the product down, but fails CLOSED on an exceeded quota.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface LimitResult { allowed: boolean; retryAfter?: number }

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<LimitResult> {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: key,
      p_max: maxRequests,
      p_window_seconds: windowSeconds
    });
    if (error) {
      console.warn('rate limit check failed, allowing:', error.message);
      return { allowed: true };
    }
    if (data === true) return { allowed: true };
    return { allowed: false, retryAfter: windowSeconds };
  } catch (e) {
    console.warn('rate limit exception, allowing:', e);
    return { allowed: true };
  }
}

export function tooManyRequests(retryAfter = 60, corsHeaders: Record<string,string> = {}) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } }
  );
}
