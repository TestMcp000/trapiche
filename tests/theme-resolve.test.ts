/**
 * Theme Resolve Module Tests
 *
 * Tests for lib/modules/theme/resolve.ts:
 * - Merge priority correctness
 * - Allowlist key validation
 * - Value validation (color/length/shadow)
 *
 * @module tests/theme-resolve
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { 
  isValidHexColor, 
  isValidCssLength, 
  isValidShadowValue,
  isValidThemeKey,
  hexToRgb,
  calculateHoverColor,
  resolveThemeKey,
  buildThemeCssVars,
} from '@/lib/modules/theme/resolve';

import { 
  isCustomizableCssVar, 
  isDerivedCssVar,
  CUSTOMIZABLE_CSS_VARS,
  BASE_CUSTOMIZABLE_VARS,
  DERIVED_CUSTOMIZABLE_VARS,
} from '@/lib/types/theme';

import type { SiteConfigRow } from '@/lib/types/theme';

// =============================================================================
// Validation Helpers Tests
// =============================================================================

describe('isValidHexColor', () => {
  test('should accept valid 6-digit hex colors', () => {
    assert.equal(isValidHexColor('#000000'), true);
    assert.equal(isValidHexColor('#FFFFFF'), true);
    assert.equal(isValidHexColor('#ff5733'), true);
    assert.equal(isValidHexColor('#0071e3'), true);
  });

  test('should reject invalid hex colors', () => {
    assert.equal(isValidHexColor('#fff'), false); // 3-digit
    assert.equal(isValidHexColor('000000'), false); // no hash
    assert.equal(isValidHexColor('#gggggg'), false); // invalid chars
    assert.equal(isValidHexColor('rgb(0,0,0)'), false); // rgb format
    assert.equal(isValidHexColor(null), false);
    assert.equal(isValidHexColor(undefined), false);
    assert.equal(isValidHexColor(123), false);
  });
});

describe('isValidCssLength', () => {
  test('should accept valid CSS length values', () => {
    assert.equal(isValidCssLength('0'), true);
    assert.equal(isValidCssLength('16px'), true);
    assert.equal(isValidCssLength('1.5rem'), true);
    assert.equal(isValidCssLength('2em'), true);
    assert.equal(isValidCssLength('-8px'), true);
    assert.equal(isValidCssLength('0.5rem'), true);
  });

  test('should reject invalid CSS length values', () => {
    assert.equal(isValidCssLength('16'), false); // no unit
    assert.equal(isValidCssLength('px'), false); // no number
    assert.equal(isValidCssLength('auto'), false); // keyword
    assert.equal(isValidCssLength('100%'), false); // percentage
    assert.equal(isValidCssLength(null), false);
    assert.equal(isValidCssLength(undefined), false);
  });
});

describe('isValidShadowValue', () => {
  test('should accept valid box-shadow values', () => {
    assert.equal(isValidShadowValue('none'), true);
    assert.equal(isValidShadowValue('0 2px 8px rgba(0, 0, 0, 0.08)'), true);
    assert.equal(isValidShadowValue('0 4px 20px rgba(0, 212, 255, 0.15)'), true);
    assert.equal(isValidShadowValue('0px 8px 24px rgba(0, 0, 0, 0.12)'), true);
  });

  test('should reject invalid box-shadow values', () => {
    assert.equal(isValidShadowValue(''), false);
    assert.equal(isValidShadowValue('auto'), false);
    assert.equal(isValidShadowValue('inherit'), false);
    assert.equal(isValidShadowValue(null), false);
  });
});

describe('isValidThemeKey', () => {
  test('should accept valid theme keys', () => {
    assert.equal(isValidThemeKey('tech-pro'), true);
    assert.equal(isValidThemeKey('japanese-airy'), true);
    assert.equal(isValidThemeKey('glassmorphism'), true);
    assert.equal(isValidThemeKey('scrollytelling'), true);
  });

  test('should reject invalid theme keys', () => {
    assert.equal(isValidThemeKey('invalid'), false);
    assert.equal(isValidThemeKey(''), false);
    assert.equal(isValidThemeKey(null), false);
    assert.equal(isValidThemeKey(undefined), false);
    assert.equal(isValidThemeKey(123), false);
  });
});

// =============================================================================
// CSS Variable Allowlist Tests
// =============================================================================

describe('isCustomizableCssVar', () => {
  test('should accept all defined customizable variables', () => {
    for (const key of CUSTOMIZABLE_CSS_VARS) {
      assert.equal(isCustomizableCssVar(key), true, `${key} should be customizable`);
    }
  });

  test('should reject arbitrary CSS variable keys', () => {
    assert.equal(isCustomizableCssVar('--arbitrary-var'), false);
    assert.equal(isCustomizableCssVar('--background'), false);
    assert.equal(isCustomizableCssVar('--primary'), false);
    assert.equal(isCustomizableCssVar('--theme-blur'), false);
    assert.equal(isCustomizableCssVar('color'), false);
  });

  test('should include all base customizable vars', () => {
    for (const key of BASE_CUSTOMIZABLE_VARS) {
      assert.equal(isCustomizableCssVar(key), true);
    }
  });

  test('should include all derived customizable vars', () => {
    for (const key of DERIVED_CUSTOMIZABLE_VARS) {
      assert.equal(isCustomizableCssVar(key), true);
    }
  });
});

describe('isDerivedCssVar', () => {
  test('should identify derived vars correctly', () => {
    assert.equal(isDerivedCssVar('--surface'), true);
    assert.equal(isDerivedCssVar('--surface-hover'), true);
    assert.equal(isDerivedCssVar('--border'), true);
    assert.equal(isDerivedCssVar('--border-light'), true);
  });

  test('should not match base vars', () => {
    assert.equal(isDerivedCssVar('--theme-bg'), false);
    assert.equal(isDerivedCssVar('--theme-accent'), false);
    assert.equal(isDerivedCssVar('--theme-radius'), false);
  });
});

// =============================================================================
// Color Utility Tests
// =============================================================================

describe('hexToRgb', () => {
  test('should parse valid hex colors', () => {
    assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 });
    assert.deepEqual(hexToRgb('#0071e3'), { r: 0, g: 113, b: 227 });
    assert.deepEqual(hexToRgb('#FF5733'), { r: 255, g: 87, b: 51 });
  });

  test('should return null for invalid hex', () => {
    assert.equal(hexToRgb('invalid'), null);
    assert.equal(hexToRgb('#fff'), null);
    assert.equal(hexToRgb(''), null);
  });
});

describe('calculateHoverColor', () => {
  test('should darken light colors', () => {
    const hover = calculateHoverColor('#ffffff');
    assert.notEqual(hover, '#ffffff');
    // Light color should be darkened
    const rgb = hexToRgb(hover);
    assert.ok(rgb && rgb.r < 255);
  });

  test('should lighten dark colors', () => {
    const _hover = calculateHoverColor('#000000');
    // Pure black stays black due to multiplication
    // Test with a dark but not black color
    const hoverDark = calculateHoverColor('#333333');
    const rgb = hexToRgb(hoverDark);
    assert.ok(rgb && rgb.r > 51);
  });

  test('should return original for invalid input', () => {
    assert.equal(calculateHoverColor('invalid'), 'invalid');
  });
});

// =============================================================================
// Theme Resolution Tests
// =============================================================================

describe('resolveThemeKey', () => {
  const createConfig = (overrides: Partial<SiteConfigRow>): SiteConfigRow => ({
    id: 1,
    global_theme: 'tech-pro',
    page_themes: {},
    theme_overrides: {},
    updated_at: new Date().toISOString(),
    updated_by: null,
    ...overrides,
  });

  test('should return page-specific theme if defined', () => {
    const config = createConfig({
      global_theme: 'tech-pro',
      page_themes: { blog: 'glassmorphism' },
    });
    assert.equal(resolveThemeKey(config, 'blog'), 'glassmorphism');
  });

  test('should fall back to global theme if no page theme', () => {
    const config = createConfig({
      global_theme: 'japanese-airy',
      page_themes: {},
    });
    assert.equal(resolveThemeKey(config, 'shop'), 'japanese-airy');
  });

  test('should fall back to default if no valid config', () => {
    assert.equal(resolveThemeKey(null, 'home'), 'tech-pro');
  });

  test('should fall back to default for invalid global theme', () => {
    const config = createConfig({
      global_theme: 'invalid-theme',
    });
    assert.equal(resolveThemeKey(config, 'home'), 'tech-pro');
  });
});

// =============================================================================
// CSS Variable Building Tests (Merge Priority)
// =============================================================================

describe('buildThemeCssVars', () => {
  test('should return preset vars when no overrides', () => {
    const vars = buildThemeCssVars({ themeKey: 'tech-pro' });
    
    // Should have preset values
    assert.equal(vars['--theme-bg'], '#ffffff');
    assert.equal(vars['--theme-accent'], '#0071e3');
    
    // Should have derived tailwind vars
    assert.ok(vars['--background']);
    assert.ok(vars['--primary']);
    assert.ok(vars['--surface']);
  });

  test('should apply theme_overrides over preset', () => {
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {
        'tech-pro': {
          '--theme-accent': '#FF0000',
        },
      },
    });
    
    assert.equal(vars['--theme-accent'], '#FF0000');
  });

  test('should not apply overrides for other themes', () => {
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {
        'glassmorphism': {
          '--theme-accent': '#FF0000',
        },
      },
    });
    
    // Should still be preset value
    assert.equal(vars['--theme-accent'], '#0071e3');
  });

  test('should have correct merge priority', () => {
    // Priority: preset → theme_overrides
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {
        'tech-pro': {
          '--theme-accent': '#FF0000',
        },
      },
    });
    
    // theme_overrides takes priority over preset
    assert.equal(vars['--theme-accent'], '#FF0000');
  });

  test('should apply derived var overrides after tailwind vars', () => {
    const customSurface = '#AABBCC';
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {
        'tech-pro': {
          '--surface': customSurface,
        },
      },
    });
    
    // Derived override should take effect
    assert.equal(vars['--surface'], customSurface);
  });

  test('should generate tailwind RGB variables', () => {
    const vars = buildThemeCssVars({ themeKey: 'tech-pro' });
    
    // Should have RGB triplet versions for Tailwind alpha utilities
    assert.ok(vars['--background-rgb']);
    assert.ok(vars['--primary-rgb']);
    assert.ok(vars['--surface-rgb']);
    
    // RGB format should be "R G B" (space separated)
    assert.match(vars['--background-rgb'], /^\d+ \d+ \d+$/);
  });

  test('should generate glass vars for glassmorphism theme', () => {
    const vars = buildThemeCssVars({ themeKey: 'glassmorphism' });
    
    assert.ok(vars['--glass-surface']);
    assert.ok(vars['--glass-border']);
    
    // Glassmorphism should have transparent glass surface
    assert.ok(vars['--glass-surface'].includes('rgba'));
  });
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe('Edge cases', () => {
  test('should handle null theme_overrides gracefully', () => {
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: null,
    });
    
    assert.ok(vars['--theme-bg']);
  });

  test('should handle empty theme_overrides', () => {
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {},
    });
    
    assert.ok(vars['--theme-bg']);
  });

  test('should skip non-CSS-var keys in overrides', () => {
    const vars = buildThemeCssVars({
      themeKey: 'tech-pro',
      themeOverrides: {
        'tech-pro': {
          'not-a-var': 'value', // Should be ignored
        },
      },
    });
    
    assert.equal(vars['not-a-var'], undefined);
  });
});
