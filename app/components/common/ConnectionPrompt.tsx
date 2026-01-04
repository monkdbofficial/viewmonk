'use client';

import { Database, ArrowRight } from 'lucide-react';

interface ConnectionPromptProps {
  /**
   * Callback function when user clicks the connect button
   */
  onConnect: () => void;
  /**
   * Optional custom title
   * @default "No Active Connection"
   */
  title?: string;
  /**
   * Optional custom message
   * @default "Please connect to a MonkDB database to continue."
   */
  message?: string;
  /**
   * Optional custom button text
   * @default "Connect to Database"
   */
  buttonText?: string;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Enterprise-grade connection prompt component
 *
 * Displays when user attempts to access features without an active database connection.
 * Provides clear call-to-action and professional appearance.
 *
 * @example
 * ```tsx
 * if (!activeConnection) {
 *   return <ConnectionPrompt onConnect={() => router.push('/connections')} />;
 * }
 * ```
 */
export default function ConnectionPrompt({
  onConnect,
  title = 'No Active Connection',
  message = 'Please connect to a MonkDB database to continue.',
  buttonText = 'Connect to Database',
  className = '',
}: ConnectionPromptProps) {
  return (
    <div className={`flex h-full items-center justify-center p-8 ${className}`}>
      <div className="max-w-md rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-12 text-center dark:border-blue-700 dark:bg-blue-900/20">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Database className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Title */}
        <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Message */}
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>

        {/* Connect Button */}
        <button
          onClick={onConnect}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          aria-label={buttonText}
        >
          <span>{buttonText}</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Additional Help Text */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
          You can manage connections from the Connections page
        </p>
      </div>
    </div>
  );
}
