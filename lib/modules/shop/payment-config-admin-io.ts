/**
 * Payment Provider Config Admin IO
 *
 * Admin-only payment provider configuration operations.
 * Uses service role (createAdminClient) for Vault access.
 *
 * @module lib/modules/shop/payment-config-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';

// =============================================================================
// Types
// =============================================================================

/** Payment provider configuration row from database */
export interface PaymentProviderConfigRow {
  gateway: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  validation_status: string;
  // Stripe fields
  stripe_publishable_key?: string | null;
  stripe_secret_key_vault_id?: string | null;
  stripe_webhook_secret_vault_id?: string | null;
  // LinePay fields
  linepay_channel_id?: string | null;
  linepay_channel_secret_vault_id?: string | null;
  // ECPay fields
  ecpay_merchant_id?: string | null;
  ecpay_hash_key_vault_id?: string | null;
  ecpay_hash_iv_vault_id?: string | null;
  updated_at: string;
}

/** DB payload for payment provider config upsert */
export interface PaymentProviderConfigDbPayload {
  gateway: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  validation_status: string;
  stripe_publishable_key?: string;
  stripe_secret_key_vault_id?: string;
  stripe_webhook_secret_vault_id?: string;
  linepay_channel_id?: string;
  linepay_channel_secret_vault_id?: string;
  ecpay_merchant_id?: string;
  ecpay_hash_key_vault_id?: string;
  ecpay_hash_iv_vault_id?: string;
}

// =============================================================================
// Payment Provider Config Read Operations
// =============================================================================

/**
 * Get payment provider config by gateway (using admin client for vault access)
 */
export async function getPaymentProviderConfigAdmin(
  gateway: string
): Promise<PaymentProviderConfigRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('payment_provider_configs')
    .select('*')
    .eq('gateway', gateway)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching payment config:', error);
    return null;
  }

  return data as PaymentProviderConfigRow | null;
}

/**
 * Get all payment provider configs (for admin payments page)
 */
export async function getAllPaymentProviderConfigsAdmin(): Promise<PaymentProviderConfigRow[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('payment_provider_configs')
    .select('*');

  if (error) {
    console.error('Error fetching payment configs:', error);
    return [];
  }

  return (data || []) as PaymentProviderConfigRow[];
}

// =============================================================================
// Payment Provider Config Write Operations
// =============================================================================

/**
 * Upsert payment provider config (using admin client for vault access)
 */
export async function upsertPaymentProviderConfigAdmin(
  config: PaymentProviderConfigDbPayload
): Promise<{ success: true } | { error: string }> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin.from('payment_provider_configs').upsert(
    {
      ...config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'gateway' }
  );

  if (error) {
    console.error('Error saving payment config:', error);
    return { error: error.message };
  }

  return { success: true };
}

// =============================================================================
// Vault Secret Operations
// =============================================================================

/**
 * Store a secret in Supabase Vault and return the vault ID.
 */
export async function storePaymentSecretAdmin(
  name: string,
  secret: string,
  description?: string
): Promise<string | null> {
  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin.rpc('store_payment_secret', {
      p_name: name,
      p_secret: secret,
      p_description: description ?? null,
    });

    if (error) {
      console.error('Error storing secret in Vault:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Error storing secret in Vault:', error);
    return null;
  }
}

/**
 * Update an existing secret in Supabase Vault.
 */
export async function updatePaymentSecretAdmin(
  vaultId: string,
  secret: string
): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  try {
    const { error } = await supabaseAdmin.rpc('update_payment_secret', {
      p_vault_id: vaultId,
      p_secret: secret,
    });

    if (error) {
      console.error('Error updating secret in Vault:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating secret in Vault:', error);
    return false;
  }
}
