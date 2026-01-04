import { useNotifications } from './notification-context';

/**
 * Simplified hook for triggering notifications
 *
 * Usage:
 * ```tsx
 * const notify = useNotify();
 *
 * // Success notification
 * notify.success('Query Executed', 'Found 150 documents in 142ms');
 *
 * // Error notification
 * notify.error('Query Failed', 'Syntax error in aggregation pipeline');
 *
 * // Warning notification
 * notify.warning('High Memory Usage', 'Production database using 85% memory');
 *
 * // Info notification
 * notify.info('New Feature', 'Check out the new vector search!');
 * ```
 */
export function useNotify() {
  const { addNotification } = useNotifications();

  return {
    success: (title: string, message: string, action?: { label: string; onClick: () => void }) => {
      addNotification({ type: 'success', title, message, action });
    },
    error: (title: string, message: string, action?: { label: string; onClick: () => void }) => {
      addNotification({ type: 'error', title, message, action });
    },
    warning: (title: string, message: string, action?: { label: string; onClick: () => void }) => {
      addNotification({ type: 'warning', title, message, action });
    },
    info: (title: string, message: string, action?: { label: string; onClick: () => void }) => {
      addNotification({ type: 'info', title, message, action });
    },
  };
}
