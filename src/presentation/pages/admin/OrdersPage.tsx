import { Button, Card, CloseButton, Group, NumberInput, SegmentedControl, Select, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { IconPlus } from '@/presentation/components/icons';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customersOf, type Account } from '@/domain/catalog/customer';
import { describeItems, itemCount, newestFirst, ORDER_STATUSES, prepareOrderLines, type OrderStatus } from '@/domain/catalog/order';
import type { Product } from '@/domain/catalog/product';
import { inr, orderCode } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { notify } from '../../hooks/feedback';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';
import { STATUS_COLOR } from '../statusColor';

export function OrdersPage() {
  const { orders, products, accounts } = useServices();
  const [params, setParams] = useSearchParams();
  const creating = params.get('new') === '1';
  const initialProductId = params.get('product') ?? '';
  const [statusFilter, setStatusFilter] = useState('');

  const { data, error, reload, setData } = useAsync(async () => {
    const [o, p, u] = await Promise.all([orders.list(), products.list(), accounts.list()]);
    return { orders: o, products: p, users: u };
  }, [orders, products, accounts]);

  const setStatus = async (id: string, status: OrderStatus) => {
    try {
      const updated = await orders.setStatus(id, status);
      setData((d) => ({ ...d!, orders: d!.orders.map((o) => (o.id === id ? { ...o, ...updated, status } : o)) }));
    } catch (err) {
      notify.error(err);
    }
  };

  const closeForm = () => setParams({});
  const visible = [...(data?.orders ?? [])].filter((o) => !statusFilter || o.status === statusFilter).sort(newestFirst);
  const userName = (id: string) => data?.users.find((u) => u.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title="Orders"
        actions={!creating && <Button leftSection={<IconPlus size={16} />} onClick={() => setParams({ new: '1' })}>Create Order</Button>}
      />

      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}

      {creating && data && data.products.length === 0 && <Card mb="md"><Text c="dimmed">Add products before creating an order.</Text></Card>}
      {creating && data && data.products.length > 0 && (
        <CreateOrderForm
          key={initialProductId}
          customers={customersOf(data.users)}
          products={data.products}
          initialProductId={initialProductId}
          onCancel={closeForm}
          onDone={() => {
            closeForm();
            reload();
          }}
        />
      )}

      <SegmentedControl
        mb="md"
        radius="xl"
        value={statusFilter}
        onChange={setStatusFilter}
        data={[{ value: '', label: 'All' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
      />

      <Card p={0}>
        <Table.ScrollContainer minWidth={720}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order ID</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th w={170}>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data && visible.length === 0 && (
                <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" size="sm">No orders yet.</Text></Table.Td></Table.Tr>
              )}
              {visible.map((o) => (
                <Table.Tr key={o.id}>
                  <Table.Td>{orderCode(o.id)}</Table.Td>
                  <Table.Td>{userName(o.userId)}</Table.Td>
                  <Table.Td>{o.date}</Table.Td>
                  <Table.Td>
                    <Tooltip label={describeItems(o)} multiline maw={320}><Text size="sm" span>{itemCount(o)}</Text></Tooltip>
                  </Table.Td>
                  <Table.Td>{inr(o.total)}</Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      aria-label={`Status of order ${orderCode(o.id)}`}
                      data={[...ORDER_STATUSES]}
                      value={o.status}
                      allowDeselect={false}
                      onChange={(v) => v && v !== o.status && setStatus(o.id, v as OrderStatus)}
                      styles={{ input: { color: `var(--mantine-color-${STATUS_COLOR[o.status]}-7)`, fontWeight: 600 } }}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
}

interface CreateOrderFormProps {
  customers: Account[];
  products: Product[];
  initialProductId: string;
  onDone(): void;
  onCancel(): void;
}

function CreateOrderForm({ customers, products, initialProductId, onDone, onCancel }: CreateOrderFormProps) {
  const { orders } = useServices();
  const [userId, setUserId] = useState<string | null>(null);
  const [lines, setLines] = useState([{ productId: initialProductId, qty: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setLine = (i: number, patch: Partial<{ productId: string; qty: number }>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const product = (id: string) => products.find((p) => p.id === id);
  const total = lines.reduce((s, l) => s + (product(l.productId)?.price ?? 0) * l.qty, 0);
  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} — ${inr(p.price)} (${p.stock} in stock)`, disabled: p.stock <= 0 }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId) return setError('Select a customer');
    const cart = prepareOrderLines(lines);
    if (typeof cart === 'string') return setError(cart);
    setSaving(true);
    try {
      await orders.place(userId, cart);
      notify.success('Order placed.');
      onDone();
    } catch (err) {
      notify.error(err);
      setSaving(false);
    }
  };

  return (
    <Card component="form" onSubmit={submit} mb="md" noValidate>
      <Stack>
        <Title order={3} size="h4">Create Order</Title>
        <Select
          label="Customer"
          required
          searchable
          placeholder={customers.length ? 'Select customer' : 'No customers yet. They appear here after registering'}
          data={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` }))}
          value={userId}
          onChange={setUserId}
          maw={420}
        />
        {lines.map((l, i) => (
          <Group key={i} align="flex-end" gap="sm" wrap="nowrap">
            <Select
              label={i === 0 ? 'Product' : undefined}
              aria-label="Product"
              searchable
              placeholder="Select product"
              data={productOptions}
              value={l.productId || null}
              onChange={(v) => setLine(i, { productId: v ?? '' })}
              style={{ flex: 1 }}
            />
            <NumberInput
              label={i === 0 ? 'Qty' : undefined}
              aria-label="Quantity"
              min={1}
              max={product(l.productId)?.stock}
              allowDecimal={false}
              value={l.qty}
              onChange={(v) => setLine(i, { qty: Number(v) || 0 })}
              w={90}
            />
            {lines.length > 1 && <CloseButton mb={6} aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} />}
          </Group>
        ))}
        <Group justify="space-between">
          <Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setLines((ls) => [...ls, { productId: '', qty: 1 }])}>
            Add line
          </Button>
          <Text fw={700}>Total: {inr(total)}</Text>
        </Group>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <Group>
          <Button type="submit" loading={saving}>Place order</Button>
          <Button variant="default" onClick={onCancel}>Cancel</Button>
        </Group>
      </Stack>
    </Card>
  );
}
