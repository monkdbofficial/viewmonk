import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = {
  default:
    'inline-flex items-center rounded-full border border-transparent bg-gray-900 text-gray-50 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-gray-900/80 dark:bg-gray-50 dark:text-gray-900',
  secondary:
    'inline-flex items-center rounded-full border border-transparent bg-gray-100 text-gray-900 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50',
  destructive:
    'inline-flex items-center rounded-full border border-transparent bg-red-500 text-gray-50 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-red-500/80 dark:bg-red-900 dark:text-gray-50',
  outline:
    'inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-semibold transition-colors dark:border-gray-800',
  success:
    'inline-flex items-center rounded-full border border-transparent bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-semibold transition-colors dark:bg-green-900/30 dark:text-green-400',
  warning:
    'inline-flex items-center rounded-full border border-transparent bg-yellow-100 text-yellow-700 px-2.5 py-0.5 text-xs font-semibold transition-colors dark:bg-yellow-900/30 dark:text-yellow-400',
  danger:
    'inline-flex items-center rounded-full border border-transparent bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-semibold transition-colors dark:bg-red-900/30 dark:text-red-400',
  info:
    'inline-flex items-center rounded-full border border-transparent bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-semibold transition-colors dark:bg-blue-900/30 dark:text-blue-400',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants[variant], className)} {...props} />
  );
}

export { Badge, badgeVariants };
