/**
 * Judge Preprocessing Edge Function
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 * @see uiux_refactor.md §6.4.2
 *
 * Supabase Edge Function for LLM-as-a-Judge quality scoring.
 * Uses GPT-4o-mini to evaluate chunk coherence and semantic quality.
 *
 * IMPORTANT: This is ONE OF ONLY TWO locations where OpenAI SDK is allowed.
 * The other is generate-embedding/index.ts.
 *
 * Runtime: Deno (Supabase Edge Functions)
 */

// Deno imports (Supabase Edge Functions runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface JudgeRequest {
  chunkContent: string;
  title?: string;
  category?: string;
  targetType?: 'post' | 'gallery_item' | 'comment';
}

interface JudgeResponse {
  success: boolean;
  score?: number; // 0-1
  standalone?: boolean;
  reason?: string;
  model?: string;
  error?: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const JUDGE_MODEL = 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────────────────────────
// Authentication (Cost hardening)
// ─────────────────────────────────────────────────────────────────────────────

function decodeBase64Url(input: string): string {
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

/**
 * Coherence evaluation prompt.
 * @see DATA_PREPROCESSING.md §5.3
 */
const COHERENCE_PROMPT = `你是一個內容品質評估員。請評估以下切片內容的語義品質。

標題：{title}
分類：{category}
切片內容：{chunk_content}

請評估：
1. 相關性分數（0-1，1 為完全相關且高品質）
2. 這個切片是否能獨立被讀者理解？（yes/no）
3. 簡短說明原因（20 字內）

評分標準：
- 0.9-1.0：完全相關、語意完整、無雜訊
- 0.7-0.9：大致相關、可理解、少量雜訊
- 0.5-0.7：部分相關、需上下文、中等雜訊
- 0.0-0.5：不相關、難以理解、大量雜訊

請只回傳 JSON 格式（不要 markdown code block）：
{"score": 0.85, "standalone": true, "reason": "內容與標題主題一致"}`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  };
}

function jsonResponse(data: JudgeResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function parseJudgeResult(content: string): { score: number; standalone: boolean; reason: string } | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate fields
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0.5;
    const standalone = parsed.standalone === true || parsed.standalone === 'yes';
    const reason = typeof parsed.reason === 'string' ? parsed.reason.slice(0, 100) : 'No reason provided';
    
    return { score, standalone, reason };
  } catch {
    console.error('Failed to parse judge result:', content);
    return null;
  }
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
    const body: JudgeRequest = await req.json();
    const { chunkContent, title = '', category = '' } = body;

    // 3. Validate required fields
    if (!chunkContent || chunkContent.trim().length === 0) {
      return jsonResponse(
        { success: false, error: 'Missing required field: chunkContent' },
        400
      );
    }

    // 4. Build prompt
    const prompt = COHERENCE_PROMPT
      .replace('{title}', title || '(無標題)')
      .replace('{category}', category || '(無分類)')
      .replace('{chunk_content}', chunkContent.slice(0, 2000)); // Limit content length

    // 5. Call OpenAI Chat API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for consistent scoring
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      return jsonResponse(
        { success: false, error: `OpenAI API error: ${openaiResponse.status}` },
        502
      );
    }

    const openaiData: OpenAIChatResponse = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      return jsonResponse(
        { success: false, error: 'No response from OpenAI' },
        502
      );
    }

    // 6. Parse result
    const result = parseJudgeResult(content);
    if (!result) {
      // Fallback to moderate score if parsing fails
      return jsonResponse({
        success: true,
        score: 0.6,
        standalone: true,
        reason: 'Unable to parse LLM response',
        model: openaiData.model,
      });
    }

    // 7. Return success
    return jsonResponse({
      success: true,
      score: result.score,
      standalone: result.standalone,
      reason: result.reason,
      model: openaiData.model,
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
