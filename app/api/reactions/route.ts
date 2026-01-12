/**
 * Reactions API
 * 
 * POST - Toggle like/unlike for a target (gallery_item or comment)
 * 
 * Uses anonymous ID cookie for tracking likes without requiring login.
 * Implements rate limiting to prevent abuse.
 * 
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - API types 定義於 lib/types/reactions.ts
 * - IO 邏輯集中於 lib/reactions/io.ts
 * - 本 route 只做 parse → validate → 呼叫 lib → return
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClientIP, hashIP } from '@/lib/security/ip';
import { ANON_ID_COOKIE_NAME, isValidAnonId, generateAnonId } from '@/lib/utils/anon-id';
import { checkReactionRateLimit, toggleReaction } from '@/lib/reactions/io';
import { isGalleryEnabled } from '@/lib/features/io';
import { validateReactionToggleRequest } from '@/lib/validators/reactions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // P0-6: Use centralized validator
    const validation = validateReactionToggleRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error! },
        { status: 400 }
      );
    }

    const { targetType, targetId } = validation.data!;

    // Feature gate: check if the corresponding feature is enabled
    if (targetType === 'gallery_item') {
      const galleryEnabled = await isGalleryEnabled();
      if (!galleryEnabled) {
        return NextResponse.json(
          { error: 'Gallery feature is not available' },
          { status: 404 }
        );
      }
    }
    // Note: 'comment' reactions are allowed regardless of feature status
    // since comments can exist on blog posts (which has its own feature check on UI level)

    // Get or generate anon_id
    const cookieStore = await cookies();
    let anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;
    let shouldSetCookie = false;

    if (!anonId || !isValidAnonId(anonId)) {
      anonId = generateAnonId();
      shouldSetCookie = true;
    }

    // Calculate IP hash for rate limiting
    const clientIP = getClientIP(request.headers);
    const ipHash = hashIP(clientIP);

    // Check rate limit (using lib/reactions/io)
    const isRateLimited = await checkReactionRateLimit(ipHash);
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Toggle reaction (using lib/reactions/io)
    const { liked, likeCount } = await toggleReaction(targetType, targetId, anonId);

    // Build response
    const response = NextResponse.json({
      liked,
      likeCount,
    });

    // Set cookie if needed
    if (shouldSetCookie) {
      response.cookies.set(ANON_ID_COOKIE_NAME, anonId, {
        httpOnly: false, // Allow client-side reading for optimistic updates
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Error in reactions API:', error);
    return NextResponse.json(
      { error: 'Failed to process reaction' },
      { status: 500 }
    );
  }
}
