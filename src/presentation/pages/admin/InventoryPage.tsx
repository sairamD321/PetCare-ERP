import { Badge, Button, Card, Group, Table, Text } from '@mantine/core';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/domain/catalog/settings';
import { stockLevel, type Product } from '@/domain/catalog/product';
import { productEmoji } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { notify } from '../../hooks/feedback';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

const LEVEL = {
  out: { label: 'Out', color: 'red' },
  low: { label: 'Low', color: 'yellow' },
  ok: { label: 'OK', color: 'green' },
} as const;

export function InventoryPage() {
  const { products, settings } = useServices();
  const { data, error, reload, setData } = useAsync(() => products.list(), [products]);
  const { data: threshold = DEFAULT_LOW_STOCK_THRESHOLD } = useAsync(
    () => settings.get().then((s) => s.lowStockThreshold).catch(() => DEFAULT_LOW_STOCK_THRESHOLD),
    [settings],
  );

  const adjust = async (p: Product, delta: number) => {
    const stock = Math.max(0, p.stock + delta);
    try {
      await products.update(p.id, { stock });
      setData((list) => (list ?? []).map((x) => (x.id === p.id ? { ...x, stock } : x)));
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <>
      <PageHeader title="Inventory" />
      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}
      <Card p={0}>
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Adjust</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {!data && !error && <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm">Loading…</Text></Table.Td></Table.Tr>}
              {data?.length === 0 && (
                <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm">No products yet. Add some on the Products page.</Text></Table.Td></Table.Tr>
              )}
              {data?.map((p) => {
                const level = LEVEL[stockLevel(p.stock, threshold)];
                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap"><span aria-hidden="true">{productEmoji(p)}</span>{p.name}</Group>
                    </Table.Td>
                    <Table.Td>{p.category}</Table.Td>
                    <Table.Td>{p.stock}</Table.Td>
                    <Table.Td><Badge color={level.color} variant="light">{level.label}</Badge></Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Button size="compact-sm" variant="default" onClick={() => adjust(p, -1)} disabled={p.stock <= 0}>−1</Button>
                        <Button size="compact-sm" variant="default" onClick={() => adjust(p, 1)}>+1</Button>
                        <Button size="compact-sm" variant="default" onClick={() => adjust(p, 10)}>+10</Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
}
