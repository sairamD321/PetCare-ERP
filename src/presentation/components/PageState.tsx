import { Alert, Button, Center, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@/presentation/components/icons';
import type { ReactNode } from 'react';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <Center mih="60vh" role="status" aria-live="polite">
      <Group gap="sm">
        <Loader size="sm" />
        <Text c="dimmed">{label}</Text>
      </Group>
    </Center>
  );
}

export function Notice({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Paper withBorder p="xl" maw={560} mx="auto" mt="xl">
      <Stack gap="sm">
        <Title order={2}>{title}</Title>
        <Text c="dimmed">{children}</Text>
        {action && <Group>{action}</Group>}
      </Stack>
    </Paper>
  );
}

export function ErrorAlert({ children, title, onRetry }: { children: ReactNode; title?: string; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" title={title} icon={<IconAlertCircle size={18} />} role="alert">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text size="sm">{children}</Text>
        {onRetry && <Button size="xs" variant="white" color="red" onClick={onRetry}>Try again</Button>}
      </Group>
    </Alert>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="sm">
      <div>
        <Title order={1} size="h2">{title}</Title>
        {description && <Text c="dimmed" mt={4}>{description}</Text>}
      </div>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
