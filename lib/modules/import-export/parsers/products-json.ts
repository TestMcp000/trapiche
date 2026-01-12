/**
 * Products JSON Parser (Pure)
 *
 * Parses JSON import data for products with variants.
 * Following PRD §2.5 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.5
 */

import type {
  ProductsExport,
  ProductExportData,
  ProductImportData,
  ProductVariantExportData,
  ProductVariantImportData,
  ParseResult,
} from '@/lib/types/import-export';

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid string array.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Validate a single product export data.
 *
 * @param data - The data to validate
 * @returns Array of missing/invalid field names
 */
export function validateProductFields(
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  if (!isNonEmptyString(data.slug)) missing.push('slug');
  if (!Array.isArray(data.variants)) missing.push('variants');

  return missing;
}

/**
 * Validate a single variant export data.
 *
 * @param data - The data to validate
 * @param index - The variant index (for error messages)
 * @returns Array of error messages
 */
export function validateVariantFields(
  data: Record<string, unknown>,
  index: number
): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(data.variant_key)) {
    errors.push(`variant[${index}]: variant_key is required`);
  }
  if (typeof data.price_cents !== 'number' || data.price_cents < 0) {
    errors.push(`variant[${index}]: price_cents must be a non-negative number`);
  }
  if (typeof data.stock !== 'number' || data.stock < 0) {
    errors.push(`variant[${index}]: stock must be a non-negative number`);
  }

  return errors;
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Transform parsed variant export data to import data format.
 *
 * @param data - The export data
 * @returns Import data
 */
export function transformVariantToImportData(
  data: ProductVariantExportData
): ProductVariantImportData {
  return {
    variant_key: data.variant_key,
    option_values: data.option_values ?? {},
    sku: data.sku ?? null,
    price_cents: data.price_cents,
    compare_at_price_cents: data.compare_at_price_cents ?? null,
    stock: data.stock,
    is_enabled: typeof data.is_enabled === 'boolean' ? data.is_enabled : true,
  };
}

/**
 * Transform parsed product export data to import data format.
 *
 * @param data - The export data
 * @returns Import data
 */
export function transformProductToImportData(
  data: ProductExportData
): ProductImportData {
  return {
    slug: data.slug,
    category: data.category ?? null,
    name_en: data.name_en ?? null,
    name_zh: data.name_zh ?? null,
    description_short_en: data.description_short_en ?? null,
    description_short_zh: data.description_short_zh ?? null,
    description_full_en: data.description_full_en ?? null,
    description_full_zh: data.description_full_zh ?? null,
    cover_image_url: data.cover_image_url ?? null,
    media_urls: isStringArray(data.media_urls) ? data.media_urls : [],
    tags_en: isStringArray(data.tags_en) ? data.tags_en : [],
    tags_zh: isStringArray(data.tags_zh) ? data.tags_zh : [],
    is_visible: typeof data.is_visible === 'boolean' ? data.is_visible : true,
    sort_order: typeof data.sort_order === 'number' ? data.sort_order : 0,
    variants: (data.variants ?? []).map(transformVariantToImportData),
  };
}

/**
 * Parse products JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseProductsJson(
  jsonString: string
): ParseResult<ProductImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid JSON: expected object' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'products') {
      return {
        success: false,
        error: `Invalid type: expected 'products', got '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'Invalid data: expected array' };
    }

    // Validate and transform each product
    const products: ProductImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const product = envelope.data[i] as Record<string, unknown>;
      const missing = validateProductFields(product);

      if (missing.length > 0) {
        return {
          success: false,
          error: `Product ${i + 1}: missing required fields: ${missing.join(', ')}`,
        };
      }

      // Validate variants
      const variants = product.variants as unknown[];
      for (let j = 0; j < variants.length; j++) {
        const variantErrors = validateVariantFields(variants[j] as Record<string, unknown>, j);
        if (variantErrors.length > 0) {
          return {
            success: false,
            error: `Product ${i + 1}: ${variantErrors.join('; ')}`,
          };
        }
      }

      products.push(transformProductToImportData(product as unknown as ProductExportData));
    }

    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as products export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseProductsObject(
  data: unknown
): ParseResult<ProductImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Invalid input: expected object' };
  }

  const envelope = data as ProductsExport;

  if (envelope.type !== 'products') {
    return {
      success: false,
      error: `Invalid type: expected 'products', got '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'Invalid data: expected array' };
  }

  const products: ProductImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const product = envelope.data[i];
    const missing = validateProductFields(product as unknown as Record<string, unknown>);

    if (missing.length > 0) {
      return {
        success: false,
        error: `Product ${i + 1}: missing required fields: ${missing.join(', ')}`,
      };
    }

    products.push(transformProductToImportData(product));
  }

  return { success: true, data: products };
}
