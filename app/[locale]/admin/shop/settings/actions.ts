'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { validateJsonSchema } from '@/lib/modules/shop/invoice-schema';
import { updateShopSettingsAdmin } from '@/lib/modules/shop/admin-io';
import type { InvoiceConfigMode, InvoiceToggles } from '@/lib/types/shop';

export interface SettingsInput {
  reservedTtlMinutes: number;
  invoiceConfigMode: InvoiceConfigMode;
  invoiceTogglesJson?: InvoiceToggles;
  invoiceJsonSchema?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function saveShopSettings(settings: SettingsInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate JSON Schema if in jsonSchema mode
    if (settings.invoiceConfigMode === 'jsonSchema' && settings.invoiceJsonSchema) {
      const schemaError = validateJsonSchema(settings.invoiceJsonSchema);
      if (schemaError) {
        return { success: false, error: `Invalid JSON Schema: ${schemaError.path ? `${schemaError.path}: ` : ''}${schemaError.message}` };
      }
    }

    // Validate TTL
    if (settings.reservedTtlMinutes < 5 || settings.reservedTtlMinutes > 120) {
      return { success: false, error: 'Reserved TTL must be between 5 and 120 minutes' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Update settings via lib
    const result = await updateShopSettingsAdmin(
      {
        reserved_ttl_minutes: settings.reservedTtlMinutes,
        invoice_config_mode: settings.invoiceConfigMode,
        invoice_toggles_json: settings.invoiceTogglesJson || null,
        invoice_json_schema: settings.invoiceJsonSchema || null,
      },
      user?.id || null
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    revalidateTag('shop', { expire: 0 });
    revalidatePath('/sitemap.xml');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in saveShopSettings:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
