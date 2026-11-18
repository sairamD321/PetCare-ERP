import { Card, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { salesReport } from '@/domain/catalog/reports';
import { inr } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

export function ReportsPage() {
  const { orders } = useServices();
  const { data, error, reload } = useAsync(async () => salesReport(await orders.list()), [orders]);

  if (error) return <ErrorAlert onRetry={reload}>{error}</ErrorAlert>;
  if (!data) return <Text c="dimmed">Loading…</Text>;

  return (
    <>
      <PageHeader title="Reports" />
      <Card maw={320} mb="lg">
        <Text c="dimmed" size="sm">Total revenue</Text>
        <Text fz={32} fw={800}>{inr(data.revenue)}</Text>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card>
          <Title order={3} size="h4" mb="sm">Orders by status</Title>
          <Table>
            <Table.Tbody>
              {Object.keys(data.byStatus).length === 0 && <Table.Tr><Table.Td><Text c="dimmed" size="sm">No orders yet.</Text></Table.Td></Table.Tr>}
              {Object.entries(data.byStatus).map(([status, count]) => (
                <Table.Tr key={status}><Table.Td>{status}</Table.Td><Table.Td ta="right">{count}</Table.Td></Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
        <Card>
          <Title order={3} size="h4" mb="sm">Top-selling products</Title>
          <Table>
            <Table.Tbody>
              {data.topProducts.length === 0 && <Table.Tr><Table.Td><Text c="dimmed" size="sm">No sales yet.</Text></Table.Td></Table.Tr>}
              {data.topProducts.map((p) => (
                <Table.Tr key={p.id}><Table.Td>{p.name}</Table.Td><Table.Td ta="right">{p.qty} sold</Table.Td></Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </>
  );
}
