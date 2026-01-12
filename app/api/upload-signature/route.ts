/**
 * Upload Signature API
 * 
 * POST - Generate Cloudinary upload signature (admin only)
 * 
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - 使用 lib/infrastructure/supabase/server 的 createClient
 * - Admin 驗證使用 lib/modules/auth 的 isSiteAdmin
 * - 本 route 只做 parse → validate → 呼叫 lib → return
 */

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { headers } from 'next/headers';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { SITE_URL } from '@/lib/seo/hreflang';
import type { UploadSignatureResponse } from '@/lib/types/content';

// Force Node.js runtime
export const runtime = 'nodejs';

// Derive origin from SITE_URL for proper comparison (origin = protocol + host only)
const ALLOWED_ORIGIN = new URL(SITE_URL).origin;

export async function POST() {
  // CSRF Protection: Validate Origin/Referer
  const headersList = await headers();
  const origin = headersList.get('origin');
  const referer = headersList.get('referer');
  
  const isValidOrigin = origin && (origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost'));
  const isValidReferer = referer && (referer.startsWith(SITE_URL) || referer.startsWith('http://localhost'));
  
  if (!isValidOrigin && !isValidReferer) {
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  // Check Cloudinary configuration
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 500 }
    );
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    // Check authentication using lib/infrastructure/supabase/server
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin using lib/auth
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate signature for direct upload
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'blog';
    
    // Create signature
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      apiSecret
    );

    // Return signature data without exposing API key
    // The client uses cloudName for upload URL construction
    const responseData: UploadSignatureResponse = {
      signature,
      timestamp,
      cloudName,
      folder,
    };
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Signature error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
