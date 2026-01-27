'use client';

/**
 * Nav Validation Errors Component
 *
 * Displays validation errors with JSON path highlighting.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavValidationErrors
 */

import { useTranslations } from 'next-intl';

interface NavValidationErrorsProps {
  errors: Array<{ path: string; message: string }>;
}

export default function NavValidationErrors({ errors }: NavValidationErrorsProps) {
  const t = useTranslations('admin.navigation');

  if (errors.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
        {t('validationErrors')} ({errors.length})
      </h3>
      <ul className="space-y-2">
        {errors.map((err, idx) => (
          <li key={idx} className="text-sm">
            <code className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-mono text-xs">
              {err.path || '(root)'}
            </code>
            <span className="ml-2 text-red-600 dark:text-red-400">{err.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
