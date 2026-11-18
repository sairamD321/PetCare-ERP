import { Badge, Box, Button, Card, Center, Group, Paper, Select, SimpleGrid, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight, IconBowl, IconBox, IconCalendar, IconHeart, IconPaw, IconPill, IconShoppingCart, IconUsers } from '@/presentation/components/icons';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemCount } from '@/domain/catalog/order';
import { computeDashboardStats, DATE_RANGES, type Kpi } from '@/domain/dashboard/dashboardStats';
import { categoryEmoji, inr, orderCode, plural, productEmoji } from '@/domain/shared/format';
import { ErrorAlert } from '../../components/PageState';
import { ScreenButton, ScreenLink } from '../../components/ScreenLink';
import { Sparkline } from '../../components/Sparkline';
import { useAsync } from '../../hooks/useAsync';
import { useCurrentUser } from '../../providers/AuthProvider';
import { useScreenPath } from '../../providers/MenuProvider';
import { useServices } from '../../providers/ServicesProvider';
import { STATUS_COLOR } from '../statusColor';

const CATEGORY_COPY = {
  Food: { tagline: 'Nutritious & Delicious', color: 'brand' },
  Medicine: { tagline: 'Health First', color: 'green' },
  Accessories: { tagline: 'Stylish & Useful', color: 'orange' },
} as const;

function KpiCard({ color, icon, value, label, kpi }: { color: string; icon: ReactNode; value: string; label: string; kpi: Kpi }) {
  return (
    <Card>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group wrap="nowrap" gap="md">
          <ThemeIcon size={52} radius="lg" variant="light" color={color}>{icon}</ThemeIcon>
          <div>
            <Text fz={24} fw={800} lh={1.1}>{value}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
            {kpi.trend != null && (
              <Group gap={2} c={kpi.trend < 0 ? 'red' : 'green'} fz="xs" fw={700}>
                {kpi.trend < 0 ? <IconArrowDownRight size={14} /> : <IconArrowUpRight size={14} />}
                {Math.abs(kpi.trend)}%
              </Group>
            )}
          </div>
        </Group>
        <Box visibleFrom="lg"><Sparkline values={kpi.series} color={`var(--mantine-color-${color}-6)`} /></Box>
      </Group>
    </Card>
  );
}

export function AdminDashboardPage() {
  const user = useCurrentUser();
  const { products, pets, orders, accounts } = useServices();
  const navigate = useNavigate();
  const ordersPath = useScreenPath('orders');
  const [range, setRange] = useState(30);

  const { data, error, reload } = useAsync(async () => {
    const [p, pt, o, u] = await Promise.all([products.list(), pets.list(), orders.list(), accounts.list()]);
    return { products: p, pets: pt, orders: o, users: u };
  }, [products, pets, orders, accounts]);

  const stats = useMemo(() => data && computeDashboardStats(data, range), [data, range]);
  const userName = (id: string) => data?.users.find((u) => u.id === id)?.name ?? '—';
  const productById = (id?: string) => data?.products.find((p) => p.id === id);

  if (error) return <ErrorAlert title="Couldn't load the dashboard" onRetry={reload}>{error}</ErrorAlert>;
  if (!stats) return <Text c="dimmed">Loading…</Text>;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1} size="h2">Welcome back, {user.name.split(' ')[0]}!</Title>
          <Text c="dimmed">Here's what's happening with your PetCare business today.</Text>
        </div>
        <Select
          aria-label="Date range"
          leftSection={<IconCalendar size={16} />}
          data={DATE_RANGES.map((r) => ({ value: String(r.value), label: r.label }))}
          value={String(range)}
          onChange={(v) => v != null && setRange(Number(v))}
          allowDeselect={false}
          description={stats.label}
          w={220}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
        <KpiCard color="brand" icon={<IconPaw size={26} />} value={stats.pets.value.toLocaleString('en-IN')} label="Total Pets" kpi={stats.pets} />
        <KpiCard color="green" icon={<IconShoppingCart size={26} />} value={stats.orders.value.toLocaleString('en-IN')} label="Total Orders" kpi={stats.orders} />
        <KpiCard color="orange" icon={<IconBox size={26} />} value={inr(stats.revenue.value)} label="Total Revenue" kpi={stats.revenue} />
        <KpiCard color="violet" icon={<IconUsers size={26} />} value={stats.customers.value.toLocaleString('en-IN')} label="Active Customers" kpi={stats.customers} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper p="xl" radius="lg" bg="brand.0" style={{ position: 'relative', overflow: 'hidden' }}>
          <Stack gap="sm" maw={340} style={{ position: 'relative', zIndex: 1 }}>
            <Title order={2} size="h3">Complete Care<br />for Your Furry Friends</Title>
            <Text c="dimmed">Premium Food, Trusted Medicines &amp; Stylish Accessories</Text>
            <ScreenButton screen="products" color="navy.9" rightSection={<IconArrowRight size={16} />} w="fit-content">
              Manage Catalog
            </ScreenButton>
          </Stack>
          <Group pos="absolute" right={24} bottom={16} gap={0} fz={64} aria-hidden="true" visibleFrom="sm">
            <span>🐕</span>
            <span>🐈</span>
            <IconHeart size={30} color="var(--mantine-color-red-5)" />
          </Group>
        </Paper>

        <Card>
          <Title order={3} size="h4" mb="md">Quick Actions</Title>
          <SimpleGrid cols={2}>
            <QuickAction screen="products" query="new=1" color="orange" icon={<IconBowl size={28} />} label="Add Product" />
            <QuickAction screen="products" query="new=1&category=Medicine" color="green" icon={<IconPill size={28} />} label="Record Medicine" />
            <QuickAction screen="pets" color="violet" icon={<IconPaw size={28} />} label="Add Pet" />
            <QuickAction screen="orders" query="new=1" color="brand" icon={<IconShoppingCart size={28} />} label="Create Order" />
          </SimpleGrid>
        </Card>
      </SimpleGrid>

      <section>
        <Group justify="space-between" mb="md">
          <Title order={2} size="h3">Shop by Category</Title>
          <ScreenLink screen="products">View All Categories →</ScreenLink>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          {stats.categories.map((c) => (
            <Card key={c.name} bg={`${CATEGORY_COPY[c.name].color}.0`} withBorder={false}>
              <Group wrap="nowrap" align="flex-start">
                <Text fz={44} aria-hidden="true">{categoryEmoji[c.name]}</Text>
                <Stack gap={4}>
                  <Title order={3} size="h4">{c.name}</Title>
                  <Text size="sm" c="dimmed">{CATEGORY_COPY[c.name].tagline}</Text>
                  <Text size="xs" c="dimmed">{plural(c.count, 'product')}</Text>
                  <ScreenButton screen="products" query={`category=${c.name}`} size="xs" color="navy.9" rightSection={<IconArrowRight size={14} />} w="fit-content" mt={4}>
                    Explore
                  </ScreenButton>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </section>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card>
          <Group justify="space-between" mb="sm">
            <Title order={3} size="h4">Recent Orders</Title>
            <ScreenLink screen="orders">View All →</ScreenLink>
          </Group>
          <Table.ScrollContainer minWidth={520}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Order ID</Table.Th>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stats.recent.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" size="sm">No orders yet. <ScreenLink screen="orders" query="new=1">Create the first one</ScreenLink></Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {stats.recent.map((o) => {
                  const first = productById(o.items[0]?.productId);
                  return (
                    <Table.Tr key={o.id} style={{ cursor: ordersPath ? 'pointer' : undefined }} onClick={() => ordersPath && navigate(ordersPath)}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <span aria-hidden="true">{first ? productEmoji(first) : '📦'}</span>
                          {orderCode(o.id)}
                        </Group>
                      </Table.Td>
                      <Table.Td>{userName(o.userId)}</Table.Td>
                      <Table.Td>{plural(itemCount(o), 'Item')}</Table.Td>
                      <Table.Td>{inr(o.total)}</Table.Td>
                      <Table.Td><Badge color={STATUS_COLOR[o.status]} variant="light">{o.status}</Badge></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <Card>
          <Group justify="space-between" mb="sm">
            <Title order={3} size="h4">Popular Products</Title>
            <ScreenLink screen="products">View All →</ScreenLink>
          </Group>
          {stats.popular.length === 0 && (
            <Text c="dimmed" size="sm">No products yet. <ScreenLink screen="products" query="new=1">Add your first product</ScreenLink></Text>
          )}
          <SimpleGrid cols={{ base: 2, sm: 4, lg: 2, xl: 4 }}>
            {stats.popular.map((p) => (
              <Stack key={p.id} gap={4}>
                <Center h={72} fz={36} bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }} aria-hidden="true">{productEmoji(p)}</Center>
                <Text size="sm" fw={600} lineClamp={1}>{p.name}</Text>
                {p.variant && <Text size="xs" c="dimmed">({p.variant})</Text>}
                <Group justify="space-between" gap={4}>
                  <Text size="sm" fw={700}>{inr(p.price)}</Text>
                  <Text size="xs" c="dimmed">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</Text>
                </Group>
                {p.stock > 0
                  ? <ScreenButton screen="orders" query={`new=1&product=${p.id}`} size="xs" variant="light">Add to Order</ScreenButton>
                  : <Button size="xs" variant="light" disabled>Out of Stock</Button>}
              </Stack>
            ))}
          </SimpleGrid>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function QuickAction({ screen, query, color, icon, label }: { screen: 'products' | 'pets' | 'orders'; query?: string; color: string; icon: ReactNode; label: string }) {
  return (
    <ScreenButton screen={screen} query={query} variant="light" color={color} h={88} radius="lg" styles={{ label: { flexDirection: 'column', gap: 6 } }}>
      {icon}
      <Text span fw={600} size="sm">{label}</Text>
    </ScreenButton>
  );
}
