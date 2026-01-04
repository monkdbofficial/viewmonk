'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Enterprise-grade Select component with consistent styling
 *
 * Features:
 * - Consistent design system across the application
 * - Support for error, disabled, and fullWidth states
 * - Dark mode compatibility
 * - Accessibility-first design with proper ARIA attributes
 * - Focus states with ring indicators
 * - Optional label and helper text
 * - Custom chevron icon for better UX
 *
 * @example
 * ```tsx
 * <Select
 *   label="Database"
 *   value={database}
 *   onChange={(e) => setDatabase(e.target.value)}
 *   error={errorMessage}
 *   fullWidth
 * >
 *   <option value="">Select database...</option>
 *   <option value="doc">doc</option>
 *   <option value="sys">sys</option>
 * </Select>
 * ```
 */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Display label above the select */
  label?: string;
  /** Error message to display below the select */
  error?: string;
  /** Helper text to display below the select */
  helperText?: string;
  /** Whether the select should take full width */
  fullWidth?: boolean;
  /** Custom className to override or extend styles */
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      disabled = false,
      required = false,
      children,
      ...props
    },
    ref
  ) => {
    // Build the select classes based on state
    const selectClasses = [
      // Base styles
      'appearance-none rounded-lg border px-3 py-2 pr-10 text-sm transition-colors',
      'bg-white dark:bg-gray-700',
      'text-gray-900 dark:text-white',

      // Border states
      error
        ? 'border-red-300 dark:border-red-700'
        : 'border-gray-300 dark:border-gray-600',

      // Focus states
      !error && 'focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
      error && 'focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20',

      // Disabled state
      disabled && 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-800',

      // Hover state (only when not disabled)
      !disabled && 'hover:border-gray-400 dark:hover:border-gray-500',

      // Width
      fullWidth ? 'w-full' : '',

      // Custom className
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {/* Label */}
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        {/* Select Container with Icon */}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            required={required}
            className={selectClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id || 'select'}-error`
                : helperText
                ? `${props.id || 'select'}-helper`
                : undefined
            }
            {...props}
          >
            {children}
          </select>

          {/* Chevron Icon */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronDown
              className={`h-4 w-4 transition-colors ${
                error
                  ? 'text-red-500 dark:text-red-400'
                  : disabled
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${props.id || 'select'}-error`}
            className="mt-1 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p
            id={`${props.id || 'select'}-helper`}
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
