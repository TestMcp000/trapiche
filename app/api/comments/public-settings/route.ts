/**
 * Public Comment Settings API
 * 
 * GET - Fetch public comment settings (no auth required)
 * 
 * This endpoint exposes minimal settings needed by the frontend UI,
 * such as whether reCAPTCHA is enabled, without requiring authentication.
 */

import { NextResponse } from 'next/server';
import { getCommentPublicSettings } from '@/lib/modules/comment/io';

export async function GET() {
  try {
    const settings = await getCommentPublicSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in public-settings API:', error);
    return NextResponse.json({ 
      enable_recaptcha: false,
      max_content_length: 4000 
    });
  }
}
