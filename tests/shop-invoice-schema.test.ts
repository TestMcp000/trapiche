/**
 * Shop Invoice Schema Module Tests
 *
 * 測試 lib/modules/shop/invoice-schema.ts 的 pure functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  togglesToSchema,
  validateJsonSchema,
  jsonSchemaToInternalSchema,
  configToSchema,
  validateInvoiceInput,
  createEmptyToggles,
  createDefaultInvoiceConfig,
} from '../lib/modules/shop/invoice-schema';
import type { InvoiceToggles, InvoiceConfig } from '../lib/types/shop';

describe('togglesToSchema', () => {
  it('generates schema for enabled toggles', () => {
    const toggles: InvoiceToggles = {
      taxId: true,
      mobileCarrier: false,
      citizenCert: true,
    };
    const schema = togglesToSchema(toggles);
    assert.equal(schema.length, 2);
    assert.equal(schema[0].key, 'taxId');
    assert.equal(schema[1].key, 'citizenCert');
  });

  it('returns empty array when all toggles are off', () => {
    const toggles = createEmptyToggles();
    const schema = togglesToSchema(toggles);
    assert.equal(schema.length, 0);
  });

  it('sets required based on allRequired parameter', () => {
    const toggles: InvoiceToggles = {
      taxId: true,
      mobileCarrier: false,
      citizenCert: false,
    };
    const schemaNotRequired = togglesToSchema(toggles, false);
    const schemaRequired = togglesToSchema(toggles, true);

    assert.equal(schemaNotRequired[0].required, false);
    assert.equal(schemaRequired[0].required, true);
  });

  it('includes pattern for taxId', () => {
    const toggles: InvoiceToggles = {
      taxId: true,
      mobileCarrier: false,
      citizenCert: false,
    };
    const schema = togglesToSchema(toggles);
    assert.ok(schema[0].pattern);
    assert.equal(schema[0].pattern, '^[0-9]{8}$');
  });
});

describe('validateJsonSchema', () => {
  it('returns null for valid schema', () => {
    const schema = {
      type: 'object',
      properties: {
        companyName: { type: 'string', title: 'Company Name' },
      },
    };
    assert.equal(validateJsonSchema(schema), null);
  });

  it('rejects non-object type', () => {
    const schema = {
      type: 'array',
      properties: {},
    };
    const error = validateJsonSchema(schema);
    assert.equal(error?.code, 'invalid_type');
  });

  it('rejects missing properties', () => {
    const schema = {
      type: 'object',
    };
    const error = validateJsonSchema(schema);
    assert.equal(error?.code, 'missing_properties');
  });

  it('rejects non-string property types', () => {
    const schema = {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    };
    const error = validateJsonSchema(schema);
    assert.equal(error?.code, 'unsupported_type');
    assert.equal(error?.path, 'count');
  });
});

describe('jsonSchemaToInternalSchema', () => {
  it('converts valid JSON Schema to internal schema', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        companyName: { type: 'string', title: 'Company Name' },
        taxId: { type: 'string', title: '統一編號', pattern: '^[0-9]{8}$' },
      },
      required: ['taxId'],
    };
    const schema = jsonSchemaToInternalSchema(jsonSchema);

    assert.ok(schema);
    assert.equal(schema.length, 2);

    const taxIdField = schema.find((f) => f.key === 'taxId');
    assert.ok(taxIdField);
    assert.equal(taxIdField.required, true);
    assert.equal(taxIdField.pattern, '^[0-9]{8}$');
    assert.equal(taxIdField.label, '統一編號');

    const companyField = schema.find((f) => f.key === 'companyName');
    assert.ok(companyField);
    assert.equal(companyField.required, false);
  });

  it('returns null for invalid schema', () => {
    const invalidSchema = { type: 'array' };
    assert.equal(jsonSchemaToInternalSchema(invalidSchema), null);
  });

  it('uses key as label when title is missing', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        customField: { type: 'string' },
      },
    };
    const schema = jsonSchemaToInternalSchema(jsonSchema);
    assert.ok(schema);
    assert.equal(schema[0].label, 'customField');
  });
});

describe('configToSchema', () => {
  it('handles toggles mode', () => {
    const config: InvoiceConfig = {
      mode: 'toggles',
      toggles: { taxId: true, mobileCarrier: false, citizenCert: false },
    };
    const schema = configToSchema(config);
    assert.equal(schema.length, 1);
    assert.equal(schema[0].key, 'taxId');
  });

  it('handles jsonSchema mode', () => {
    const config: InvoiceConfig = {
      mode: 'jsonSchema',
      jsonSchema: {
        type: 'object',
        properties: {
          customField: { type: 'string', title: 'Custom' },
        },
      },
    };
    const schema = configToSchema(config);
    assert.equal(schema.length, 1);
    assert.equal(schema[0].key, 'customField');
  });

  it('returns empty array for missing config data', () => {
    const config: InvoiceConfig = { mode: 'toggles' };
    const schema = configToSchema(config);
    assert.equal(schema.length, 0);
  });
});

describe('validateInvoiceInput', () => {
  it('passes valid input', () => {
    const schema = togglesToSchema(
      { taxId: true, mobileCarrier: false, citizenCert: false },
      true
    );
    const input = { taxId: '12345678' };
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 0);
  });

  it('returns error for missing required field', () => {
    const schema = togglesToSchema(
      { taxId: true, mobileCarrier: false, citizenCert: false },
      true
    );
    const input = {};
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'required');
    assert.equal(errors[0].key, 'taxId');
  });

  it('returns error for pattern mismatch', () => {
    const schema = togglesToSchema(
      { taxId: true, mobileCarrier: false, citizenCert: false },
      false
    );
    const input = { taxId: '1234' }; // Too short
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'pattern_mismatch');
  });

  it('skips empty optional fields', () => {
    const schema = togglesToSchema(
      { taxId: true, mobileCarrier: false, citizenCert: false },
      false
    );
    const input = { taxId: '' };
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 0);
  });

  it('validates multiple fields', () => {
    const schema = togglesToSchema(
      { taxId: true, mobileCarrier: true, citizenCert: false },
      true
    );
    const input = { taxId: '12345678' }; // Missing mobileCarrier
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].key, 'mobileCarrier');
  });
});

describe('mobileCarrier pattern validation', () => {
  it('passes valid mobileCarrier format', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: true, citizenCert: false },
      false
    );
    const input = { mobileCarrier: '/ABC+123' };
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 0);
  });

  it('fails mobileCarrier without leading slash', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: true, citizenCert: false },
      false
    );
    const input = { mobileCarrier: 'ABC+1234' };
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'pattern_mismatch');
  });

  it('fails mobileCarrier with wrong length', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: true, citizenCert: false },
      false
    );
    const input = { mobileCarrier: '/AB12' }; // Too short (5 chars after slash, needs 7)
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'pattern_mismatch');
  });
});

describe('citizenCert pattern validation', () => {
  it('passes valid citizenCert format', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: false, citizenCert: true },
      false
    );
    const input = { citizenCert: 'AB12345678901234' }; // 2 uppercase + 14 digits
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 0);
  });

  it('fails citizenCert with lowercase letters', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: false, citizenCert: true },
      false
    );
    const input = { citizenCert: 'ab12345678901234' };
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'pattern_mismatch');
  });

  it('fails citizenCert with wrong prefix length', () => {
    const schema = togglesToSchema(
      { taxId: false, mobileCarrier: false, citizenCert: true },
      false
    );
    const input = { citizenCert: 'A1234567890123456' }; // Only 1 uppercase letter
    const errors = validateInvoiceInput(schema, input);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'pattern_mismatch');
  });
});

describe('validateJsonSchema invalid_property case', () => {
  it('rejects property that is not an object', () => {
    const schema = {
      type: 'object',
      properties: {
        invalidField: 'not an object', // Should be an object
      },
    };
    const error = validateJsonSchema(schema);
    assert.equal(error?.code, 'invalid_property');
    assert.equal(error?.path, 'invalidField');
  });

  it('rejects null property value', () => {
    const schema = {
      type: 'object',
      properties: {
        nullField: null,
      },
    };
    const error = validateJsonSchema(schema);
    assert.equal(error?.code, 'invalid_property');
    assert.equal(error?.path, 'nullField');
  });
});

describe('helper functions', () => {
  it('createEmptyToggles returns all false', () => {
    const toggles = createEmptyToggles();
    assert.equal(toggles.taxId, false);
    assert.equal(toggles.mobileCarrier, false);
    assert.equal(toggles.citizenCert, false);
  });

  it('createDefaultInvoiceConfig returns toggles mode with empty toggles', () => {
    const config = createDefaultInvoiceConfig();
    assert.equal(config.mode, 'toggles');
    assert.ok(config.toggles);
    assert.equal(config.toggles.taxId, false);
  });
});
