import { Card, Table, Text } from '@mantine/core';
import { summarizeCustomers } from '@/domain/catalog/customer';
import { inr } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

export function CustomersPage() {
  const { accounts, pets, orders } = useServices();
  const { data, error, reload } = useAsync(async () => {
    const [u, p, o] = await Promise.all([accounts.list(), pets.list(), orders.list()]);
    return summarizeCustomers(u, p, o);
  }, [accounts, pets, orders]);

  return (
    <>
      <PageHeader title="Customers" />
      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}
      <Card p={0}>
        <Table.ScrollContainer minWidth={600}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Pets</Table.Th>
                <Table.Th>Orders</Table.Th>
                <Table.Th>Total spent</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.length === 0 && (
                <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm">No customers yet. They appear here after registering.</Text></Table.Td></Table.Tr>
              )}
              {data?.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.name}</Table.Td>
                  <Table.Td>{c.email}</Table.Td>
                  <Table.Td>{c.pets}</Table.Td>
                  <Table.Td>{c.orders}</Table.Td>
                  <Table.Td>{inr(c.spent)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
}
