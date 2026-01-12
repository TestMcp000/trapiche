/**
 * Comment Settings API
 * 
 * GET - Fetch comment settings
 * PATCH - Update settings
 * 
 * Blacklist management:
 * POST - Add blacklist item
 * DELETE - Remove blacklist item
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { validateCommentSettingsPatch } from '@/lib/validators/comment-settings';
import {
  getCommentSettingsAndBlacklist,
  updateCommentSettings,
  addCommentBlacklistItem,
  removeCommentBlacklistItem,
} from '@/lib/modules/comment/admin-io';

/**
 * Verify admin access via DB site_admins
 * Returns status codes: 503 for connection errors, 401 for unauthorized, 403 for forbidden
 */
async function verifyAdmin(): Promise<{
  authorized: boolean;
  error?: string;
  status?: number;
  user?: unknown;
}> {
  let supabase;
  
  try {
    supabase = await createClient();
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { authorized: false, error: 'Service Unavailable', status: 503 };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      // Check if it's a connection error vs auth error
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return { authorized: false, error: 'Service Unavailable', status: 503 };
      }
      return { authorized: false, error: 'Unauthorized', status: 401 };
    }
    
    if (!user) {
      return { authorized: false, error: 'Unauthorized', status: 401 };
    }

    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { authorized: false, error: 'Forbidden', status: 403 };
    }

    return { authorized: true, user };
  } catch (err) {
    console.error('Auth verification error:', err);
    return { authorized: false, error: 'Service Unavailable', status: 503 };
  }
}

export async function GET() {
  const { authorized, error, status } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const result = await getCommentSettingsAndBlacklist();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized, error, status } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const body = await request.json();
    const { settings } = body;

    // Use shared validator for consistent client/server validation
    const validation = validateCommentSettingsPatch(settings);
    if (!validation.valid) {
      // Return first error for backward compatibility
      const firstError = Object.values(validation.errors)[0] || 'Invalid settings';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const result = await updateCommentSettings(validation.validatedSettings!);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const { authorized, error, status } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const body = await request.json();
    const { type, value, reason } = body;

    if (!type || !value) {
      return NextResponse.json({ error: 'type and value are required' }, { status: 400 });
    }

    const validTypes = ['keyword', 'ip', 'email', 'domain'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const result = await addCommentBlacklistItem({ type, value, reason });
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: result.item });
  } catch (error) {
    console.error('Error adding blacklist item:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized, error, status } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await removeCommentBlacklistItem(id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blacklist item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
