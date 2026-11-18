import {
  ActionIcon,
  Alert,
  AppShell,
  Burger,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Indicator,
  Menu,
  Popover,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLogout, IconMinus, IconPlus, IconSearch, IconShoppingCart, IconTrash, IconUser } from '@/presentation/components/icons';
import { useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '@/assets/petcare-logo.png';
import logoMark from '@/assets/petcare-mark.png';
import { isItemActive, type MenuItem } from '@/domain/menu/menu';
import { errorMessage } from '@/domain/shared/errors';
import { inr, plural, productEmoji } from '@/domain/shared/format';
import { useAuth, useCurrentUser } from '../providers/AuthProvider';
import { CartProvider, useCart } from '../providers/CartProvider';
import { useMenu, useScreenPath } from '../providers/MenuProvider';
import { STORE_ACCENT } from '../theme/theme';

// Customer-facing storefront shell: top navigation bar instead of the admin sidebar.
export function StoreLayout() {
  const user = useCurrentUser();
  const [navOpened, { toggle, close }] = useDisclosure(false);

  return (
    <CartProvider key={user.id}>
      <AppShell
        header={{ height: 72 }}
        navbar={{ width: 260, breakpoint: 'md', collapsed: { desktop: true, mobile: !navOpened } }}
        bg="var(--pc-store-bg)"
      >
        <AppShell.Header bg="var(--pc-store-surface)" style={{ borderColor: 'var(--pc-store-line)' }}>
          <StoreHeader navOpened={navOpened} onToggleNav={toggle} onNavigate={close} />
        </AppShell.Header>
        <AppShell.Navbar p="md" bg="var(--pc-store-surface)">
          <StoreNav vertical onNavigate={close} />
        </AppShell.Navbar>
        <AppShell.Main>
          <Container size="xl" py="lg">
            <Outlet />
          </Container>
          <Center py="lg" c="var(--pc-store-muted)" fz="sm">
            <Group gap={8}>
              <img src={logoMark} alt="" width={22} height={22} /> PetCare · Happy Pets. Healthy Lives.
            </Group>
          </Center>
        </AppShell.Main>
      </AppShell>
    </CartProvider>
  );
}

// Navigation comes entirely from GetMenuLinks (GET /users/api/menulinks).
function StoreNav({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate(): void }) {
  const { menus, loading, error } = useMenu();
  const { pathname, search } = useLocation();
  const items = menus.flatMap((m) => m.items);
  const Wrapper = vertical ? Stack : Group;

  return (
    <Wrapper gap={vertical ? 4 : 2} aria-busy={loading} component="nav" aria-label="Main menu">
      {loading && [0, 1, 2].map((n) => <Skeleton key={n} h={30} w={80} radius="xl" />)}
      {!loading && error && <Text size="sm" c="dimmed">Menu unavailable</Text>}
      {items.map((item) => (
        <StoreNavLink key={`${item.menuCode}/${item.code}`} item={item} active={isItemActive(item, pathname, search)} onClick={onNavigate} fullWidth={vertical} />
      ))}
    </Wrapper>
  );
}

function StoreNavLink({ item, active, onClick, fullWidth }: { item: MenuItem; active: boolean; onClick(): void; fullWidth: boolean }) {
  const label = item.name.trim().toLowerCase() === 'medicine' ? 'Pharmacy' : item.name;
  const props = {
    variant: active ? 'light' : 'subtle',
    color: active ? STORE_ACCENT : 'dark',
    radius: 'xl',
    fullWidth,
    justify: fullWidth ? ('flex-start' as const) : undefined,
    onClick,
    children: label,
  };
  return item.external
    ? <Button {...props} component="a" href={item.href} target="_blank" rel="noreferrer" />
    : <Button {...props} component={Link} to={item.href} />;
}

function StoreHeader({ navOpened, onToggleNav, onNavigate }: { navOpened: boolean; onToggleNav(): void; onNavigate(): void }) {
  const { user, logout } = useAuth();
  const shopPath = useScreenPath('shop');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!shopPath) return;
    const q = query.trim();
    navigate(q ? `${shopPath}?q=${encodeURIComponent(q)}` : shopPath);
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Container size="xl" h="100%">
      <Group h="100%" justify="space-between" wrap="nowrap" gap="md">
        <Group gap="sm" wrap="nowrap">
          <Burger opened={navOpened} onClick={onToggleNav} hiddenFrom="md" size="sm" aria-label="Menu" />
          <UnstyledButton component={Link} to="/" onClick={onNavigate}>
            <img src={logo} alt="PetCare" height={44} style={{ display: 'block' }} />
          </UnstyledButton>
        </Group>

        <Group visibleFrom="md" gap={2} wrap="nowrap">
          <StoreNav onNavigate={onNavigate} />
        </Group>

        <Group gap="xs" wrap="nowrap">
          <form onSubmit={submitSearch} role="search">
            <TextInput
              placeholder="Search for food, toys, medicine…"
              aria-label="Search products"
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="xl"
              visibleFrom="sm"
              w={260}
            />
          </form>

          <Menu position="bottom-end" width={220} shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" aria-label="Account">
                <IconUser size={22} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text fw={600} c="dark">{user?.name}</Text>
                <Text size="xs" c="dimmed">{user?.email}</Text>
              </Menu.Label>
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>Logout</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <CartButton />
        </Group>
      </Group>
    </Container>
  );
}

function CartButton() {
  const { count } = useCart();
  const [opened, { close, toggle }] = useDisclosure(false);

  return (
    <Popover opened={opened} onChange={(o) => !o && close()} position="bottom-end" width={360} shadow="lg" trapFocus>
      <Popover.Target>
        <Indicator label={count} size={18} color={STORE_ACCENT} disabled={count === 0} offset={4}>
          <ActionIcon variant="subtle" color="dark" size="lg" radius="xl" onClick={toggle} aria-label={`Cart, ${count} items`}>
            <IconShoppingCart size={22} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p="md">
        <CartPanel onClose={close} />
      </Popover.Dropdown>
    </Popover>
  );
}

function CartPanel({ onClose }: { onClose(): void }) {
  const { lines, count, subtotal, setQty, remove, checkout } = useCart();
  const ordersPath = useScreenPath('my-orders');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const proceed = async () => {
    setBusy(true);
    setError('');
    try {
      await checkout();
      onClose();
      if (ordersPath) navigate(ordersPath);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Stack gap="sm" role="dialog" aria-label="Your cart">
      <Title order={2} size="h4">
        Your Cart <Text span c="dimmed" fw={500}>({plural(count, 'item')})</Text>
      </Title>

      {lines.length === 0 ? (
        <Text c="dimmed" py="md" ta="center">Your cart is empty.</Text>
      ) : (
        <>
          <ScrollArea.Autosize mah={320}>
            <Stack gap="sm">
              {lines.map((l) => (
                <Group key={l.productId} wrap="nowrap" align="flex-start" gap="sm">
                  <Center w={44} h={44} fz={24} bg="orange.0" style={{ borderRadius: 10, flexShrink: 0 }} aria-hidden="true">
                    {productEmoji(l)}
                  </Center>
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={2}>
                      {l.name}
                      {l.variant ? ` (${l.variant})` : ''}
                    </Text>
                    <Text size="sm" fw={700}>{inr(l.price)}</Text>
                    <Group gap={6}>
                      <ActionIcon size="sm" variant="default" onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease quantity">
                        <IconMinus size={14} />
                      </ActionIcon>
                      <Text size="sm" w={20} ta="center">{l.qty}</Text>
                      <ActionIcon size="sm" variant="default" onClick={() => setQty(l.productId, l.qty + 1)} disabled={l.qty >= l.stock} aria-label="Increase quantity">
                        <IconPlus size={14} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                  <ActionIcon variant="subtle" color="red" onClick={() => remove(l.productId)} aria-label={`Remove ${l.name}`}>
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
          <Divider />
          <Group justify="space-between">
            <Text c="dimmed">Subtotal:</Text>
            <Text fw={700}>{inr(subtotal)}</Text>
          </Group>
          {error && <Alert color="red" variant="light" p="xs">{error}</Alert>}
          <Button color={STORE_ACCENT} radius="xl" fullWidth onClick={proceed} loading={busy}>
            Proceed to Checkout
          </Button>
        </>
      )}
    </Stack>
  );
}
