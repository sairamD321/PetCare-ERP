import { Badge, Button, Card, Center, Group, Stack, Text, Title } from '@mantine/core';
import { useTimeout } from '@mantine/hooks';
import { useState } from 'react';
import { productBadge, type Product } from '@/domain/catalog/product';
import { inr, productEmoji } from '@/domain/shared/format';

// Storefront product card. `heading` adds a section title inside the card ("Pet Medicine").
export function ProductCard({ product, onAdd, heading }: { product: Product; onAdd?: (p: Product) => void; heading?: string }) {
  const [added, setAdded] = useState(false);
  const { start } = useTimeout(() => setAdded(false), 1200);
  const outOfStock = product.stock <= 0;
  const badge = productBadge(product);

  return (
    <Card bg="var(--pc-store-surface)" style={{ borderColor: 'var(--pc-store-line)' }}>
      <Stack gap="sm" h="100%">
        {heading && <Title order={3} size="h4">{heading}</Title>}
        <Center h={120} fz={56} bg="orange.0" style={{ borderRadius: 'var(--mantine-radius-md)' }} aria-hidden="true">
          {productEmoji(product)}
        </Center>
        <Group gap="xs">
          {badge && <Badge color={badge.tone} variant="light">{badge.label}</Badge>}
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{product.category}</Text>
        </Group>
        <Text fw={600} lineClamp={2} style={{ flex: 1 }}>
          {product.name}
          {product.variant ? ` (${product.variant})` : ''}
        </Text>
        <Group justify="space-between" align="flex-end">
          <div>
            <Text size="xs" c="dimmed">Price</Text>
            <Text fw={700} size="lg">{inr(product.price)}</Text>
          </div>
          {onAdd && (
            <Button
              color="navy.9"
              disabled={outOfStock}
              onClick={() => {
                onAdd(product);
                setAdded(true);
                start();
              }}
            >
              {outOfStock ? 'Sold out' : added ? 'Added ✓' : 'Add to Cart'}
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
