/**
 * Generate Embedding Edge Function
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Supabase Edge Function for generating vector embeddings via OpenAI API.
 *
 * IMPORTANT: This is the ONLY location where OpenAI SDK is allowed.
 * API keys are stored in Supabase Secrets, NOT in environment variables.
 *
 * Runtime: Deno (Supabase Edge Functions)
 */

// Deno imports (Supabase Edge Functions runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EmbeddingRequest {
  content: string;
  targetType: 'post' | 'gallery_item' | 'comment' | 'safety_slang' | 'safety_case';
  targetId: string;
  chunkIndex?: number;
  chunkTotal?: number;
  contentHash?: string;
  /**
   * When false, generate and return the embedding without persisting to `public.embeddings`.
   * Useful for semantic-search query embeddings to avoid polluting stats/results.
   * Defaults to true.
   */
  store?: boolean;
}

interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  model?: string;
  dimensions?: number;
  contentHash?: string;
  error?: string;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

// ─────────────────────────────────────────────────────────────────────────────
// Authentication (Cost hardening)
// ─────────────────────────────────────────────────────────────────────────────

function decodeBase64Url(input: string): string {
  // Convert base64url → base64
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  return atob(padded);
}

function extractJwtToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1];
  }

  // Supabase functions invoke typically includes `apikey` as well.
  const apiKey = req.headers.get('apikey') ?? req.headers.get('x-api-key');
  return apiKey ?? null;
}

function getJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const role = payload['role'];
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  };
}

function jsonResponse(data: EmbeddingResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

async function generateSha256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Cost hardening: Require service_role token (reject anon/authenticated).
  // Rationale: anon key is public; without this, anyone can trigger OpenAI calls.
  const token = extractJwtToken(req);
  const role = token ? getJwtRole(token) : null;
  if (role !== 'service_role') {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // 1. Get API key from Supabase Secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured in Supabase Secrets');
      return jsonResponse(
        { success: false, error: 'OpenAI API key not configured' },
        500
      );
    }

    // 2. Parse request body
    let body: EmbeddingRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const {
      content,
      targetType,
      targetId,
      chunkIndex = 0,
      chunkTotal = 1,
      store = true,
    } = body;

    // 3. Validate required fields
    if (!content || !targetType || !targetId) {
      return jsonResponse(
        { success: false, error: 'Missing required fields: content, targetType, targetId' },
        400
      );
    }

    if (!['post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'].includes(targetType)) {
      return jsonResponse(
        { success: false, error: 'Invalid targetType' },
        400
      );
    }

    // 4. Get Supabase credentials for DB write (optional)
    let supabaseUrl: string | undefined;
    let supabaseServiceKey: string | undefined;
    if (store) {
      supabaseUrl = Deno.env.get('SUPABASE_URL');
      supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase credentials not configured');
        return jsonResponse(
          { success: false, error: 'Supabase credentials not configured' },
          500
        );
      }
    }

    // 5. Generate content hash for change detection
    const contentHash = body.contentHash || await generateSha256Hash(content);

    // 6. Call OpenAI embeddings API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: EMBEDDING_MODEL,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      return jsonResponse(
        {
          success: false,
          error: `OpenAI API error: ${openaiResponse.status}`,
        },
        502
      );
    }

    const openaiData: OpenAIEmbeddingResponse = await openaiResponse.json();
    const embedding = openaiData.data[0]?.embedding;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      return jsonResponse(
        { success: false, error: 'Invalid embedding response from OpenAI' },
        502
      );
    }

    // 7. Store result in DB (upsert to handle re-generation)
    if (store) {
      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

      const { error: upsertError } = await supabase
        .from('embeddings')
        .upsert(
          {
            target_type: targetType,
            target_id: targetId,
            chunk_index: chunkIndex,
            chunk_total: chunkTotal,
            embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
            content_hash: contentHash,
            chunk_content: content.slice(0, 2000), // Store first 2000 chars for debug
            quality_status: 'passed',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'target_type,target_id,chunk_index',
          }
        );

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        return jsonResponse(
          { success: false, error: `Database error: ${upsertError.message}` },
          500
        );
      }
    }

    // 8. Return success with embedding
    return jsonResponse({
      success: true,
      embedding,
      model: openaiData.model,
      dimensions: EMBEDDING_DIMENSIONS,
      contentHash,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge Function error:', errorMessage);
    return jsonResponse(
      { success: false, error: errorMessage },
      500
    );
  }
});
