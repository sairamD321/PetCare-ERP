import { Anchor, BackgroundImage, Box, Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import heroPets from '@/assets/welcome-pets.jpg';
import { featuredIn, type Product } from '@/domain/catalog/product';
import { categoryEmoji } from '@/domain/shared/format';
import { ProductCard } from '../../components/ProductCard';
import { ScreenLink } from '../../components/ScreenLink';
import { useAsync } from '../../hooks/useAsync';
import { useCurrentUser } from '../../providers/AuthProvider';
import { useCart } from '../../providers/CartProvider';
import { useScreenPath } from '../../providers/MenuProvider';
import { useServices } from '../../providers/ServicesProvider';
import { STORE_ACCENT } from '../../theme/theme';

const FEATURED = [
  { category: 'Food', heading: 'Premium Pet Food' },
  { category: 'Medicine', heading: 'Pet Medicine' },
  { category: 'Accessories', heading: 'Accessories' },
] as const;

const CATEGORY_BUBBLES = [
  { label: 'Dogs', icon: '🐶', query: 'q=dog' },
  { label: 'Cats', icon: '🐱', query: 'q=cat' },
  { label: 'Accessories', icon: categoryEmoji.Accessories, query: 'category=Accessories' },
  { label: 'All', icon: '🛍️', query: '' },
];

const orEmpty = <T,>(p: Promise<T[]>) => p.catch((): T[] => []);

// Customer home page (storefront).
export function CustomerDashboardPage() {
  const user = useCurrentUser();
  const { products, pets, orders } = useServices();
  const { add } = useCart();
  const shopPath = useScreenPath('shop');

  const { data } = useAsync(
    async () => {
      const [productList, petList, orderList] = await Promise.all([
        orEmpty<Product>(products.list()),
        orEmpty(pets.list(user.id)),
        orEmpty(orders.list(user.id)),
      ]);
      return { products: productList, pets: petList, orders: orderList };
    },
    [user.id, products, pets, orders],
  );

  const firstName = (user.name ?? '').split(' ')[0];
  const featured = data
    ? FEATURED.map((f) => ({ ...f, product: featuredIn(data.products, f.category) })).filter((f) => f.product)
    : [];

  return (
    <Stack gap="xl">
      <Paper radius="xl" style={{ overflow: 'hidden' }} withBorder>
        <BackgroundImage src={heroPets} aria-label="A smiling black and tan dog beside a curious tabby kitten">
          <Box
            p={{ base: 'lg', md: 48 }}
            mih={340}
            style={{ background: 'linear-gradient(90deg, rgba(251,246,236,.96) 0%, rgba(251,246,236,.85) 45%, rgba(251,246,236,0) 75%)' }}
          >
            <Stack gap="md" maw={480}>
              {firstName && <Text fw={600} c="orange.7">Welcome back, {firstName} 👋</Text>}
              <Title order={1} size="h1" c="var(--pc-ink)">Happier Pets, Healthier Lives</Title>
              <Text fs="italic" c="dimmed">
                “Every pet deserves a lifetime of love, good health and happy tail wags.”
                <Text span display="block" size="sm" mt={4}>— The PetCare Promise</Text>
              </Text>
              {shopPath && (
                <Group>
                  <Button component={Link} to={shopPath} color={STORE_ACCENT} radius="xl" size="md">Shop Now</Button>
                </Group>
              )}
              {shopPath && (
                <Group gap="xs" component="nav" aria-label="Shop by category">
                  {CATEGORY_BUBBLES.map((c) => (
                    <Button
                      key={c.label}
                      component={Link}
                      to={c.query ? `${shopPath}?${c.query}` : shopPath}
                      variant="white"
                      color="dark"
                      radius="xl"
                      leftSection={<span aria-hidden="true">{c.icon}</span>}
                    >
                      {c.label}
                    </Button>
                  ))}
                </Group>
              )}
            </Stack>
          </Box>
        </BackgroundImage>
      </Paper>

      <section>
        <Group justify="space-between" mb="md">
          <Title order={2} size="h3">Featured for your pets</Title>
          {shopPath && <Anchor component={Link} to={shopPath} c="orange.7" fw={600}>View all products →</Anchor>}
        </Group>
        {!data && <Text c="dimmed">Loading…</Text>}
        {data && featured.length === 0 && <Text c="dimmed">No products available yet.</Text>}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {featured.map((f) => (
            <ProductCard key={f.category} heading={f.heading} product={f.product!} onAdd={add} />
          ))}
        </SimpleGrid>
      </section>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card bg="var(--pc-store-surface)">
          <Text fz={32} fw={800}>{data?.pets.length ?? 0}</Text>
          <Text c="dimmed">{data?.pets.length === 1 ? 'pet' : 'pets'} registered</Text>
          {data && data.pets.length > 0 && <Text size="sm" mt={4}>{data.pets.map((p) => p.name).join(', ')}</Text>}
        </Card>
        <Card bg="var(--pc-store-surface)">
          <Text fz={32} fw={800}>{data?.orders.length ?? 0}</Text>
          <Text c="dimmed">{data?.orders.length === 1 ? 'order' : 'orders'} placed</Text>
          <ScreenLink screen="my-orders" c="orange.7" mt={4}>View my orders →</ScreenLink>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
