import { Button, Group, Loader, Pagination, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@/presentation/components/icons';
import type { PageInfo } from '@/domain/blueprint/dataTable';

interface PagerProps {
  // Zero-based page shown now.
  index: number;
  size: number;
  rowCount: number;
  info: PageInfo;
  loading: boolean;
  onChange(index: number): void;
}

// Page controls under a blueprint grid. Numbered pages when the server reports a total; otherwise
// Previous / Next, with Next available while pages come back full.
export function Pager({ index, size, rowCount, info, loading, onChange }: PagerProps) {
  if (index === 0 && !info.hasNext) return null;

  const from = index * size + 1;
  const to = index * size + rowCount;
  const summary = info.total != null ? `Showing ${from}–${to} of ${info.total}` : `Showing ${from}–${to}`;

  return (
    <Group justify="space-between" mt="lg" gap="sm">
      <Group gap="xs">
        <Text size="sm" c="dimmed">{summary}</Text>
        {loading && <Loader size="xs" />}
      </Group>
      {info.pageCount != null ? (
        <Pagination
          total={Math.max(info.pageCount, index + 1)}
          value={index + 1}
          onChange={(page) => onChange(page - 1)}
          disabled={loading}
          radius="md"
          withEdges={info.pageCount > 5}
        />
      ) : (
        <Group gap="xs">
          <Button variant="default" leftSection={<IconChevronLeft size={16} />} disabled={loading || index === 0} onClick={() => onChange(index - 1)}>
            Previous
          </Button>
          <Text size="sm" fw={600} px="xs">Page {index + 1}</Text>
          <Button variant="default" rightSection={<IconChevronRight size={16} />} disabled={loading || !info.hasNext} onClick={() => onChange(index + 1)}>
            Next
          </Button>
        </Group>
      )}
    </Group>
  );
}
