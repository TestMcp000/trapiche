/**
 * Payment Config IO
 *
 * IO operations for payment provider configuration.
 * Uses service role client for vault access.
 *
 * @module lib/modules/shop/payment-config-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';

export type PaymentProvider = 'stripe' | 'ecpay' | 'linepay';

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  isTestMode: boolean;
}

export interface ECPayConfig {
  hashKey: string;
  hashIv: string;
  merchantId: string;
  isTestMode: boolean;
}

export interface LinePayConfig {
  channelId: string;
  channelSecret: string;
  isTestMode: boolean;
}

/**
 * Read a secret from Supabase Vault by its vault ID.
 * Returns null if secret not found.
 */
export async function readVaultSecret(vaultId: string | null): Promise<string | null> {
  if (!vaultId) return null;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .rpc('vault_read_secret', { secret_id: vaultId });

  if (error) {
    console.error('Failed to read vault secret:', error.message);
    return null;
  }

  return data || null;
}

/**
 * Get payment provider configuration from database.
 * Returns only the fields needed for webhook verification.
 * Secrets are read from Supabase Vault.
 */
export async function getPaymentProviderConfig(
  provider: 'stripe'
): Promise<{ success: true; config: StripeConfig } | { success: false; error: string }>;
export async function getPaymentProviderConfig(
  provider: 'ecpay'
): Promise<{ success: true; config: ECPayConfig } | { success: false; error: string }>;
export async function getPaymentProviderConfig(
  provider: 'linepay'
): Promise<{ success: true; config: LinePayConfig } | { success: false; error: string }>;
export async function getPaymentProviderConfig(
  provider: PaymentProvider
): Promise<
  { success: true; config: StripeConfig | ECPayConfig | LinePayConfig } | { success: false; error: string }
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || !data.is_enabled) {
    return { success: false, error: `${provider} is not configured or not enabled` };
  }

  if (provider === 'stripe') {
    const secretKey = await readVaultSecret(data.stripe_secret_key_vault_id);
    const webhookSecret = await readVaultSecret(data.stripe_webhook_secret_vault_id);

    if (!secretKey || !webhookSecret) {
      return { success: false, error: 'Stripe secrets not found in vault' };
    }

    const config: StripeConfig = {
      publishableKey: data.stripe_publishable_key || '',
      secretKey,
      webhookSecret,
      isTestMode: data.is_test_mode || false,
    };
    return { success: true, config };
  }

  if (provider === 'ecpay') {
    const hashKey = await readVaultSecret(data.ecpay_hash_key_vault_id);
    const hashIv = await readVaultSecret(data.ecpay_hash_iv_vault_id);

    if (!hashKey || !hashIv) {
      return { success: false, error: 'ECPay secrets not found in vault' };
    }

    const config: ECPayConfig = {
      hashKey,
      hashIv,
      merchantId: data.ecpay_merchant_id || '',
      isTestMode: data.is_test_mode || false,
    };
    return { success: true, config };
  }

  if (provider === 'linepay') {
    const channelSecret = await readVaultSecret(data.linepay_channel_secret_vault_id);

    if (!channelSecret) {
      return { success: false, error: 'LinePay secret not found in vault' };
    }

    const config: LinePayConfig = {
      channelId: data.linepay_channel_id || '',
      channelSecret,
      isTestMode: data.is_test_mode || false,
    };
    return { success: true, config };
  }

  return { success: false, error: `Unknown provider: ${provider}` };
}
