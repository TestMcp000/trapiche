/**
 * Shop Products Admin Write IO
 *
 * Admin-only product write operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/shop/products-write-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { ProductDbPayload, VariantDbPayload } from '@/lib/modules/shop/products-transform';

/**
 * Create a new product with variants
 * Returns the new product ID or error message
 */
export async function createProductAdmin(
  product: ProductDbPayload,
  variants: VariantDbPayload[]
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  // Insert product
  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert(product)
    .select('id')
    .single();

  if (productError || !newProduct) {
    console.error('Error creating product:', productError);
    return { error: productError?.message || 'Failed to create product' };
  }

  // Insert variants
  if (variants.length > 0) {
    const variantRows = variants.map((v) => ({
      product_id: newProduct.id,
      ...v,
    }));

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantRows);

    if (variantError) {
      console.error('Error creating variants:', variantError);
      // Rollback product creation
      await supabase.from('products').delete().eq('id', newProduct.id);
      return { error: variantError.message };
    }
  } else {
    // Create a default variant if none provided
    const { error: defaultVariantError } = await supabase
      .from('product_variants')
      .insert({
        product_id: newProduct.id,
        variant_key: 'default',
        option_values_json: {},
        sku: null,
        price_cents: 0,
        stock: 0,
        is_enabled: true,
      });

    if (defaultVariantError) {
      console.error('Error creating default variant:', defaultVariantError);
    }
  }

  return { id: newProduct.id };
}

/**
 * Update an existing product with variants
 */
export async function updateProductAdmin(
  productId: string,
  product: ProductDbPayload & { updated_at: string },
  variants: VariantDbPayload[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Update product
  const { error: productError } = await supabase
    .from('products')
    .update(product)
    .eq('id', productId);

  if (productError) {
    console.error('Error updating product:', productError);
    return { error: productError.message };
  }

  // Delete existing variants and insert new ones
  const { error: deleteError } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    console.error('Error deleting variants:', deleteError);
    return { error: deleteError.message };
  }

  if (variants.length > 0) {
    const variantRows = variants.map((v) => ({
      product_id: productId,
      ...v,
    }));

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantRows);

    if (variantError) {
      console.error('Error creating variants:', variantError);
      return { error: variantError.message };
    }
  } else {
    // Create a default variant if none provided
    await supabase.from('product_variants').insert({
      product_id: productId,
      variant_key: 'default',
      option_values_json: {},
      sku: null,
      price_cents: 0,
      stock: 0,
      is_enabled: true,
    });
  }

  return { success: true };
}

/**
 * Delete a product and its variants
 */
export async function deleteProductAdmin(
  productId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Delete variants first (foreign key constraint)
  const { error: variantError } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId);

  if (variantError) {
    console.error('Error deleting variants:', variantError);
    return { error: variantError.message };
  }

  // Delete product
  const { error: productError } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (productError) {
    console.error('Error deleting product:', productError);
    return { error: productError.message };
  }

  return { success: true };
}
