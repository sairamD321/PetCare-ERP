import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/domain/shared/errors';

// Toasts and confirmations used across screens.
export const notify = {
  success: (message: string) => notifications.show({ color: 'green', message }),
  error: (error: unknown, title?: string) => notifications.show({ color: 'red', title, message: errorMessage(error) }),
};

// Resolves true when the user confirms.
export function confirmDanger(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
  return new Promise((resolve) => {
    modals.openConfirmModal({
      title,
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: confirmLabel, cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
      onClose: () => resolve(false),
    });
  });
}
