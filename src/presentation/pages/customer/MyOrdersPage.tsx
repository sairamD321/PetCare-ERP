import { Badge, Card, Table, Text } from '@mantine/core';
import { describeItems, newestFirst } from '@/domain/catalog/order';
import { inr, orderCode } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { useAsync } from '../../hooks/useAsync';
import { useCurrentUser } from '../../providers/AuthProvider';
import { useServices } from '../../providers/ServicesProvider';
import { STATUS_COLOR } from '../statusColor';

export function MyOrdersPage() {
  const user = useCurrentUser();
  const { orders } = useServices();
  const { data, error, loading, reload } = useAsync(async () => (await orders.list(user.id)).sort(newestFirst), [user.id, orders]);

  return (
    <>
      <PageHeader title="My Orders" />
      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}
      {loading && !data && <Text c="dimmed">Loading…</Text>}
      {data && data.length === 0 && <Text c="dimmed">No orders yet.</Text>}
      {data && data.length > 0 && (
        <Card p={0}>
          <Table.ScrollContainer minWidth={600}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((o) => (
                  <Table.Tr key={o.id}>
                    <Table.Td>{orderCode(o.id)}</Table.Td>
                    <Table.Td>{o.date}</Table.Td>
                    <Table.Td>{describeItems(o)}</Table.Td>
                    <Table.Td>{inr(o.total)}</Table.Td>
                    <Table.Td><Badge color={STATUS_COLOR[o.status]} variant="light">{o.status}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </>
  );
}
