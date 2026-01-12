/**
 * reCAPTCHA v3 integration for bot detection
 * 
 * reCAPTCHA v3 runs invisibly in the background and returns a score
 * from 0.0 (likely bot) to 1.0 (likely human).
 * 
 * @see https://developers.google.com/recaptcha/docs/v3
 */

import 'server-only';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export interface RecaptchaResult {
  success: boolean;
  score: number;      // 0.0 (bot) to 1.0 (human)
  action?: string;    // The action name passed from frontend
  error?: string;
  errorCodes?: string[];
}

/**
 * Verify a reCAPTCHA token from the frontend
 * 
 * @param token - The reCAPTCHA token from grecaptcha.execute()
 * @param expectedAction - Optional action name to verify
 * @returns Verification result with score
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction?: string
): Promise<RecaptchaResult> {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY is not configured');
    return { success: false, score: 0, error: 'not_configured' };
  }

  if (!token) {
    return { success: false, score: 0, error: 'No token provided' };
  }

  try {
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        }).toString(),
      }
    );

    const data = await response.json();

    // Verify the action matches if specified
    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        score: data.score || 0,
        action: data.action,
        error: `Action mismatch: expected ${expectedAction}, got ${data.action}`,
      };
    }

    return {
      success: data.success,
      score: data.score || 0,
      action: data.action,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return { success: false, score: 0, error: 'Request failed' };
  }
}

/**
 * Check if a reCAPTCHA score passes the threshold
 * 
 * @param score - The reCAPTCHA score (0.0 - 1.0)
 * @param threshold - Minimum score to pass (default: 0.5)
 * @returns True if score meets or exceeds threshold
 */
export function isHuman(score: number, threshold: number = 0.5): boolean {
  return score >= threshold;
}

/**
 * Get reCAPTCHA threshold from settings or default
 */
export function getDefaultThreshold(): number {
  return 0.5;
}
