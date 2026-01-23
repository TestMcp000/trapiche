import assert from 'node:assert/strict';
import test from 'node:test';

import {
    transformDirectoryToSummary,
    transformDirectoryRowsToSummaries,
    type UserDirectoryWithProfileRow,
} from '../lib/modules/user/users-list-transform.js';

// =============================================================================
// transformDirectoryToSummary
// =============================================================================

test('transformDirectoryToSummary transforms row to summary with shortId', () => {
    const row = {
        user_id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-16T12:00:00Z',
    };

    const result = transformDirectoryToSummary(row, 'C1');

    assert.deepEqual(result, {
        userId: 'user-123',
        email: 'test@example.com',
        shortId: 'C1',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T12:00:00Z',
    });
});

test('transformDirectoryToSummary handles null email', () => {
    const row = {
        user_id: 'user-456',
        email: null,
        created_at: '2024-02-01T08:00:00Z',
        updated_at: '2024-02-02T09:00:00Z',
    };

    const result = transformDirectoryToSummary(row, 'C2');

    assert.equal(result.userId, 'user-456');
    assert.equal(result.email, null);
    assert.equal(result.shortId, 'C2');
});

test('transformDirectoryToSummary handles undefined shortId', () => {
    const row = {
        user_id: 'user-789',
        email: 'another@example.com',
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    };

    const result = transformDirectoryToSummary(row);

    assert.equal(result.shortId, null);
});

test('transformDirectoryToSummary handles null shortId', () => {
    const row = {
        user_id: 'user-abc',
        email: 'abc@example.com',
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
    };

    const result = transformDirectoryToSummary(row, null);

    assert.equal(result.shortId, null);
});

// =============================================================================
// transformDirectoryRowsToSummaries
// =============================================================================

test('transformDirectoryRowsToSummaries transforms array of rows', () => {
    const rows: UserDirectoryWithProfileRow[] = [
        {
            user_id: 'user-1',
            email: 'user1@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            customer_profiles: { short_id: 'C1' },
        },
        {
            user_id: 'user-2',
            email: 'user2@example.com',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
            customer_profiles: { short_id: 'C2' },
        },
    ];

    const result = transformDirectoryRowsToSummaries(rows);

    assert.equal(result.length, 2);
    assert.equal(result[0].userId, 'user-1');
    assert.equal(result[0].shortId, 'C1');
    assert.equal(result[1].userId, 'user-2');
    assert.equal(result[1].shortId, 'C2');
});

test('transformDirectoryRowsToSummaries handles null customer_profiles', () => {
    const rows: UserDirectoryWithProfileRow[] = [
        {
            user_id: 'user-no-profile',
            email: 'noprofile@example.com',
            created_at: '2024-05-01T00:00:00Z',
            updated_at: '2024-05-01T00:00:00Z',
            customer_profiles: null,
        },
    ];

    const result = transformDirectoryRowsToSummaries(rows);

    assert.equal(result.length, 1);
    assert.equal(result[0].shortId, null);
});

test('transformDirectoryRowsToSummaries handles empty array', () => {
    const result = transformDirectoryRowsToSummaries([]);

    assert.deepEqual(result, []);
});

test('transformDirectoryRowsToSummaries handles mixed profiles', () => {
    const rows: UserDirectoryWithProfileRow[] = [
        {
            user_id: 'user-with',
            email: 'with@example.com',
            created_at: '2024-06-01T00:00:00Z',
            updated_at: '2024-06-01T00:00:00Z',
            customer_profiles: { short_id: 'C99' },
        },
        {
            user_id: 'user-without',
            email: 'without@example.com',
            created_at: '2024-06-02T00:00:00Z',
            updated_at: '2024-06-02T00:00:00Z',
            customer_profiles: null,
        },
    ];

    const result = transformDirectoryRowsToSummaries(rows);

    assert.equal(result[0].shortId, 'C99');
    assert.equal(result[1].shortId, null);
});

// =============================================================================
// Edge cases
// =============================================================================

test('transformDirectoryToSummary preserves exact timestamp strings', () => {
    const isoString = '2024-12-31T23:59:59.999Z';
    const row = {
        user_id: 'user-time',
        email: 'time@example.com',
        created_at: isoString,
        updated_at: isoString,
    };

    const result = transformDirectoryToSummary(row, 'C100');

    assert.equal(result.createdAt, isoString);
    assert.equal(result.updatedAt, isoString);
});

test('transformDirectoryToSummary handles empty string email differently from null', () => {
    // Note: DB may store empty string vs null differently
    const row = {
        user_id: 'user-empty',
        email: '' as string | null,
        created_at: '2024-07-01T00:00:00Z',
        updated_at: '2024-07-01T00:00:00Z',
    };

    const result = transformDirectoryToSummary(row, null);

    // Empty string is preserved (not converted to null)
    assert.equal(result.email, '');
});
