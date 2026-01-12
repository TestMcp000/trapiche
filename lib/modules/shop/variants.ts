/**
 * Variant Matrix Module (Pure)
 *
 * 遵循 refactor.md：
 * - Pure module：可單測、不可 IO、不可 import Next/React/Supabase
 * - 命名：camelCase
 *
 * 功能：
 * - 正規化 options（trim/dedupe/保持順序）
 * - 自動生成所有組合（deterministic order）
 * - 產生穩定 key（用於 DB/UI 對齊）
 * - 與既有 matrix 合併（保留 admin 手動覆寫）
 */

// =============================================================================
// Types
// =============================================================================

/** 單一 option 軸（例如「顏色」有 [紅, 藍, 綠]） */
export interface OptionAxis {
  name: string;
  values: string[];
}

/** 正規化後的 option 組合（key: option name, value: selected value） */
export type OptionValues = Record<string, string>;

/** 變體行（對應 product_variants 表） */
export interface VariantRow {
  variantKey: string;
  optionValues: OptionValues;
  sku: string;
  priceCents: number;
  stock: number;
  enabled: boolean;
}

/** Admin 可覆寫的欄位 */
export interface VariantOverride {
  sku?: string;
  priceCents?: number;
  stock?: number;
  enabled?: boolean;
}

// =============================================================================
// Normalize Options
// =============================================================================

/**
 * 正規化 options：trim、dedupe、移除空值、保持順序
 */
export function normalizeOptions(axes: OptionAxis[]): OptionAxis[] {
  return axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: dedupePreserveOrder(
        axis.values.map((v) => v.trim()).filter((v) => v.length > 0)
      ),
    }))
    .filter((axis) => axis.name.length > 0 && axis.values.length > 0);
}

/**
 * 去重並保持原始順序
 */
function dedupePreserveOrder(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// =============================================================================
// Generate Combinations
// =============================================================================

/**
 * 生成所有 option 組合（deterministic order：按軸順序 × 值順序）
 *
 * 例如：
 * - axes = [{ name: '顏色', values: ['紅', '藍'] }, { name: '尺寸', values: ['S', 'M'] }]
 * - 輸出 = [{ 顏色: '紅', 尺寸: 'S' }, { 顏色: '紅', 尺寸: 'M' }, { 顏色: '藍', 尺寸: 'S' }, { 顏色: '藍', 尺寸: 'M' }]
 */
export function generateCombinations(axes: OptionAxis[]): OptionValues[] {
  const normalized = normalizeOptions(axes);

  if (normalized.length === 0) {
    return [];
  }

  // 使用 reduce 進行笛卡爾積
  return normalized.reduce<OptionValues[]>(
    (combinations, axis) => {
      if (combinations.length === 0) {
        // 第一個軸：直接生成初始組合
        return axis.values.map((value) => ({ [axis.name]: value }));
      }
      // 後續軸：擴展每個現有組合
      const expanded: OptionValues[] = [];
      for (const combo of combinations) {
        for (const value of axis.values) {
          expanded.push({ ...combo, [axis.name]: value });
        }
      }
      return expanded;
    },
    []
  );
}

// =============================================================================
// Stable Key Generation
// =============================================================================

/**
 * 為組合生成穩定 key（用於 DB/UI 對齊）
 *
 * 規則：
 * - 按 axis name 排序（deterministic）
 * - 格式：name1:value1|name2:value2|...
 * - 值中的特殊字元會被編碼
 */
export function generateVariantKey(optionValues: OptionValues): string {
  const sortedKeys = Object.keys(optionValues).sort();
  return sortedKeys
    .map((key) => `${encodeKeyPart(key)}:${encodeKeyPart(optionValues[key])}`)
    .join('|');
}

/**
 * 編碼 key 中的特殊字元（: | 用於分隔）
 */
function encodeKeyPart(str: string): string {
  return str.replace(/[:|\\]/g, (char) => `\\${char}`);
}

/**
 * 解碼 key 部分
 */
export function decodeKeyPart(str: string): string {
  return str.replace(/\\([:|\\])/g, '$1');
}

/**
 * 從 variantKey 解析回 optionValues
 */
export function parseVariantKey(key: string): OptionValues {
  if (!key) return {};

  const result: OptionValues = {};
  // 分割時需處理轉義的 |
  const parts = key.split(/(?<!\\)\|/);

  for (const part of parts) {
    // 分割時需處理轉義的 :
    const colonIndex = part.search(/(?<!\\):/);
    if (colonIndex === -1) continue;

    const name = decodeKeyPart(part.slice(0, colonIndex));
    const value = decodeKeyPart(part.slice(colonIndex + 1));
    result[name] = value;
  }

  return result;
}

// =============================================================================
// Build Variant Matrix
// =============================================================================

/**
 * 從 options 生成完整 variant matrix
 *
 * @param axes - option 軸定義
 * @param defaultPriceCents - 預設價格（cents）
 * @param defaultStock - 預設庫存
 */
export function buildVariantMatrix(
  axes: OptionAxis[],
  defaultPriceCents: number = 0,
  defaultStock: number = 0
): VariantRow[] {
  const combinations = generateCombinations(axes);

  return combinations.map((optionValues) => ({
    variantKey: generateVariantKey(optionValues),
    optionValues,
    sku: '',
    priceCents: defaultPriceCents,
    stock: defaultStock,
    enabled: true,
  }));
}

// =============================================================================
// Merge with Existing Matrix
// =============================================================================

/**
 * 將新生成的 matrix 與既有 matrix 合併（保留 admin 手動覆寫）
 *
 * 規則：
 * - 用 variantKey 對齊
 * - 若既有 row 存在，保留其 sku/priceCents/stock/enabled
 * - 若既有 row 不在新組合中，會被移除（回傳不包含）
 *
 * @param newMatrix - 新生成的 matrix
 * @param existingRows - 既有的 variant rows
 */
export function mergeVariantMatrix(
  newMatrix: VariantRow[],
  existingRows: VariantRow[]
): VariantRow[] {
  // 建立既有 row 的 lookup map
  const existingMap = new Map<string, VariantRow>();
  for (const row of existingRows) {
    existingMap.set(row.variantKey, row);
  }

  // 合併：新 matrix 的每一行，若既有存在則保留覆寫值
  return newMatrix.map((newRow) => {
    const existing = existingMap.get(newRow.variantKey);
    if (existing) {
      return {
        ...newRow,
        sku: existing.sku,
        priceCents: existing.priceCents,
        stock: existing.stock,
        enabled: existing.enabled,
      };
    }
    return newRow;
  });
}

/**
 * 套用單一 override 到 row
 */
export function applyOverride(
  row: VariantRow,
  override: VariantOverride
): VariantRow {
  return {
    ...row,
    ...(override.sku !== undefined && { sku: override.sku }),
    ...(override.priceCents !== undefined && { priceCents: override.priceCents }),
    ...(override.stock !== undefined && { stock: override.stock }),
    ...(override.enabled !== undefined && { enabled: override.enabled }),
  };
}
