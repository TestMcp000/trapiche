'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, getAdminRole } from '@/lib/modules/auth';
import { validateStripeConfig, validateLinePayConfig, validateECPayConfig } from '@/lib/modules/shop/payment-config';
import {
  getPaymentProviderConfigAdmin,
  upsertPaymentProviderConfigAdmin,
  storePaymentSecretAdmin,
  updatePaymentSecretAdmin,
  type PaymentProviderConfigDbPayload,
} from '@/lib/modules/shop/admin-io';
import type { PaymentGateway } from '@/lib/types/shop';

export interface PaymentConfigInput {
  gateway: PaymentGateway;
  isEnabled: boolean;
  isTestMode: boolean;
  config: Record<string, string>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  validationStatus?: 'valid' | 'invalid' | 'pending';
}

// =============================================================================
// Validate Gateway Config
// =============================================================================

export async function validateGatewayConfig(
  gateway: PaymentGateway,
  config: Record<string, string>,
  isTestMode: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const role = await getAdminRole(supabase);
    if (role !== 'owner') {
      return { success: false, error: 'Only Owner can manage payment configuration' };
    }

    let validation;
    switch (gateway) {
      case 'stripe':
        validation = validateStripeConfig({
          publishableKey: config.stripe_publishable_key || '',
          secretKey: config.stripe_secret_key || '',
          webhookSecret: config.stripe_webhook_secret || '',
          testMode: isTestMode,
        });
        break;
      case 'linepay':
        validation = validateLinePayConfig({
          channelId: config.linepay_channel_id || '',
          channelSecret: config.linepay_channel_secret || '',
          testMode: isTestMode,
        });
        break;
      case 'ecpay':
        validation = validateECPayConfig({
          merchantId: config.ecpay_merchant_id || '',
          hashKey: config.ecpay_hash_key || '',
          hashIv: config.ecpay_hash_iv || '',
          testMode: isTestMode,
        });
        break;
      default:
        return { success: false, error: 'Unknown gateway' };
    }

    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => e.message).join('; ');
      return { success: false, error: errorMessages, validationStatus: 'invalid' };
    }

    // For Stripe, we could do a real API validation here
    // For now, format validation passed
    return { success: true, validationStatus: 'valid' };
  } catch (error) {
    console.error('Unexpected error in validateGatewayConfig:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Save Gateway Config
// =============================================================================

export async function saveGatewayConfig(input: PaymentConfigInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const role = await getAdminRole(supabase);
    if (role !== 'owner') {
      return { success: false, error: 'Only Owner can manage payment configuration' };
    }

    // Validate first
    const validationResult = await validateGatewayConfig(
      input.gateway,
      input.config,
      input.isTestMode
    );

    if (!validationResult.success) {
      return validationResult;
    }

    // Check for masked values - don't save if only masked values are provided
    const hasMaskedOnly = Object.values(input.config).every(
      (v) => !v || v.includes('••••')
    );
    
    if (hasMaskedOnly && input.isEnabled) {
      return { success: false, error: 'Please enter actual credentials, not masked values' };
    }

    // Get existing config to check for existing vault IDs
    const existingConfig = await getPaymentProviderConfigAdmin(input.gateway);

    // Build config object based on gateway
    const configData: PaymentProviderConfigDbPayload = {
      gateway: input.gateway,
      is_enabled: input.isEnabled,
      is_test_mode: input.isTestMode,
      validation_status: validationResult.validationStatus || 'pending',
    };

    // Process secrets for each gateway - store in Vault
    if (input.gateway === 'stripe') {
      // Non-sensitive: publishable key
      if (input.config.stripe_publishable_key && !input.config.stripe_publishable_key.includes('••••')) {
        configData.stripe_publishable_key = input.config.stripe_publishable_key;
      }
      
      // Sensitive: secret key
      if (input.config.stripe_secret_key && !input.config.stripe_secret_key.includes('••••')) {
        if (existingConfig?.stripe_secret_key_vault_id) {
          await updatePaymentSecretAdmin(existingConfig.stripe_secret_key_vault_id, input.config.stripe_secret_key);
        } else {
          const vaultId = await storePaymentSecretAdmin(
            `stripe_secret_key_${input.gateway}`,
            input.config.stripe_secret_key,
            'Stripe Secret Key'
          );
          if (vaultId) configData.stripe_secret_key_vault_id = vaultId;
        }
      }
      
      // Sensitive: webhook secret
      if (input.config.stripe_webhook_secret && !input.config.stripe_webhook_secret.includes('••••')) {
        if (existingConfig?.stripe_webhook_secret_vault_id) {
          await updatePaymentSecretAdmin(existingConfig.stripe_webhook_secret_vault_id, input.config.stripe_webhook_secret);
        } else {
          const vaultId = await storePaymentSecretAdmin(
            `stripe_webhook_secret_${input.gateway}`,
            input.config.stripe_webhook_secret,
            'Stripe Webhook Secret'
          );
          if (vaultId) configData.stripe_webhook_secret_vault_id = vaultId;
        }
      }
    }
    
    if (input.gateway === 'linepay') {
      // Non-sensitive: channel ID
      if (input.config.linepay_channel_id && !input.config.linepay_channel_id.includes('••••')) {
        configData.linepay_channel_id = input.config.linepay_channel_id;
      }
      
      // Sensitive: channel secret
      if (input.config.linepay_channel_secret && !input.config.linepay_channel_secret.includes('••••')) {
        if (existingConfig?.linepay_channel_secret_vault_id) {
          await updatePaymentSecretAdmin(existingConfig.linepay_channel_secret_vault_id, input.config.linepay_channel_secret);
        } else {
          const vaultId = await storePaymentSecretAdmin(
            `linepay_channel_secret_${input.gateway}`,
            input.config.linepay_channel_secret,
            'LINE Pay Channel Secret'
          );
          if (vaultId) configData.linepay_channel_secret_vault_id = vaultId;
        }
      }
    }
    
    if (input.gateway === 'ecpay') {
      // Non-sensitive: merchant ID
      if (input.config.ecpay_merchant_id && !input.config.ecpay_merchant_id.includes('••••')) {
        configData.ecpay_merchant_id = input.config.ecpay_merchant_id;
      }
      
      // Sensitive: hash key
      if (input.config.ecpay_hash_key && !input.config.ecpay_hash_key.includes('••••')) {
        if (existingConfig?.ecpay_hash_key_vault_id) {
          await updatePaymentSecretAdmin(existingConfig.ecpay_hash_key_vault_id, input.config.ecpay_hash_key);
        } else {
          const vaultId = await storePaymentSecretAdmin(
            `ecpay_hash_key_${input.gateway}`,
            input.config.ecpay_hash_key,
            'ECPay Hash Key'
          );
          if (vaultId) configData.ecpay_hash_key_vault_id = vaultId;
        }
      }
      
      // Sensitive: hash IV
      if (input.config.ecpay_hash_iv && !input.config.ecpay_hash_iv.includes('••••')) {
        if (existingConfig?.ecpay_hash_iv_vault_id) {
          await updatePaymentSecretAdmin(existingConfig.ecpay_hash_iv_vault_id, input.config.ecpay_hash_iv);
        } else {
          const vaultId = await storePaymentSecretAdmin(
            `ecpay_hash_iv_${input.gateway}`,
            input.config.ecpay_hash_iv,
            'ECPay Hash IV'
          );
          if (vaultId) configData.ecpay_hash_iv_vault_id = vaultId;
        }
      }
    }

    // Upsert payment config via lib
    const result = await upsertPaymentProviderConfigAdmin(configData);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    revalidateTag('shop', { expire: 0 });
    return { success: true, validationStatus: 'valid' };
  } catch (error) {
    console.error('Unexpected error in saveGatewayConfig:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
