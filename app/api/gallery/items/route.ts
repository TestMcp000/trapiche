/**
 * Gallery Items API
 * 
 * GET - Get paginated gallery items with filtering and sorting
 * 
 * Supports infinite scroll with likedByMe status from anon_id cookie.
 * 
 * 遵循 ARCHITECTURE.md §3.6 & §3.7：
 * - API types 定義於 lib/types/gallery.ts
 * - IO 邏輯使用 lib/modules/gallery/io.ts 和 lib/reactions/io.ts
 * - 本 route 只做 parse → validate → 呼叫 lib → return
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ANON_ID_COOKIE_NAME, isValidAnonId } from '@/lib/utils/anon-id';
import { getGalleryItemsPage } from '@/lib/modules/gallery/io';
import { getAnonLikedItemIds } from '@/lib/reactions/io';
import { isGalleryEnabled } from '@/lib/features/io';
import { validateGalleryItemsQuery } from '@/lib/validators/gallery-api';
import type { GalleryItemsApiResponse, GalleryItemWithLikedByMe } from '@/lib/types/gallery';

export async function GET(request: NextRequest): Promise<NextResponse<GalleryItemsApiResponse | { error: string }>> {
  try {
    // Feature gate: return 404 if gallery is disabled
    const galleryEnabled = await isGalleryEnabled();
    if (!galleryEnabled) {
      return NextResponse.json(
        { error: 'Gallery feature is not available' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // P0-6: Use centralized validator
    const validation = validateGalleryItemsQuery(searchParams);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error! },
        { status: 400 }
      );
    }
    
    const { limit, offset, categorySlug, q, tag, sort } = validation.data!;
    
    // Use lib/modules/gallery/io for gallery items
    const { items, total } = await getGalleryItemsPage({
      limit,
      offset,
      categorySlug,
      q,
      tag,
      sort,
    });
    
    // Get liked status using lib/reactions/io
    const cookieStore = await cookies();
    const anonId = cookieStore.get(ANON_ID_COOKIE_NAME)?.value;
    const validAnonId = anonId && isValidAnonId(anonId) ? anonId : undefined;
    const likedItemIds = await getAnonLikedItemIds(
      validAnonId, 
      'gallery_item',
      items.map(item => item.id)
    );
    
    // Add likedByMe to each item
    const itemsWithLikedByMe: GalleryItemWithLikedByMe[] = items.map(item => ({
      ...item,
      likedByMe: likedItemIds.has(item.id),
    }));
    
    // Calculate pagination info
    const nextOffset = (offset ?? 0) + (limit ?? 24);
    const hasMore = nextOffset < total;
    
    return NextResponse.json({
      items: itemsWithLikedByMe,
      nextOffset,
      hasMore,
      total,
    });
  } catch (error) {
    console.error('Error in gallery items API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery items' },
      { status: 500 }
    );
  }
}
