import {
  AppShell,
  Autocomplete,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconExternalLink, IconLogout, IconSearch, IconUser } from '@/presentation/components/icons';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoMark from '@/assets/petcare-mark.png';
import { isItemActive, type MenuItem } from '@/domain/menu/menu';
import { initials } from '@/domain/shared/format';
import { MenuIcon } from '../components/MenuIcon';
import { useAuth } from '../providers/AuthProvider';
import { useMenu, useScreenPath } from '../providers/MenuProvider';

// Admin (and other back-office profiles) shell: backend menu in a collapsible sidebar, page search and
// account menu in the header.
export function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 272, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding="lg"
      bg="var(--pc-admin-bg)"
    >
      <AppShell.Header>
        <AdminHeader menuOpened={opened} onToggleMenu={toggle} />
      </AppShell.Header>
      <AppShell.Navbar>
        <AdminNavbar onNavigate={close} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

function AdminNavbar({ onNavigate }: { onNavigate(): void }) {
  const { menus, loading, error } = useMenu();
  const { pathname, search } = useLocation();
  const [toggled, setToggled] = useState<Record<string, boolean>>({}); // folder code → open, once clicked

  return (
    <>
      <AppShell.Section p="md">
        <UnstyledButton component={Link} to="/" onClick={onNavigate}>
          <Group gap="sm" wrap="nowrap">
            <img src={logoMark} alt="" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <Text fw={800} c="navy.9">PetCare ERP</Text>
              <Text size="xs" c="dimmed">Happy Pets. Healthy Lives.</Text>
            </div>
          </Group>
        </UnstyledButton>
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea} px="sm" pb="md" aria-busy={loading}>
        {loading && (
          <Stack gap="xs">
            {[0, 1, 2, 3, 4].map((n) => <Skeleton key={n} h={36} radius="md" />)}
          </Stack>
        )}
        {!loading && error && <Text size="sm" c="dimmed" px="sm">Menu unavailable</Text>}

        {menus.map((menu) => {
          // Main menu = folder; it shows its submenus when opened.
          const activeHere = menu.items.some((i) => isItemActive(i, pathname, search));
          const expanded = toggled[menu.code] ?? activeHere;
          return (
            <NavLink
              key={menu.code}
              label={menu.name}
              leftSection={<MenuIcon name={menu.icon} fallback={menu.code} />}
              opened={expanded}
              onChange={(open) => setToggled((t) => ({ ...t, [menu.code]: open }))}
              active={activeHere && !expanded}
              variant="light"
              fw={600}
              styles={{ root: { borderRadius: 'var(--mantine-radius-md)' } }}
            >
              {menu.items.map((item) => (
                <ItemNavLink key={item.code} item={item} active={isItemActive(item, pathname, search)} onNavigate={onNavigate} />
              ))}
            </NavLink>
          );
        })}
      </AppShell.Section>
    </>
  );
}

function ItemNavLink({ item, active, onNavigate }: { item: MenuItem; active: boolean; onNavigate(): void }) {
  const common = { label: item.name, active, onClick: onNavigate, variant: 'filled' as const, styles: { root: { borderRadius: 'var(--mantine-radius-md)' } } };
  if (item.external) {
    return <NavLink {...common} component="a" href={item.href} target="_blank" rel="noreferrer" rightSection={<IconExternalLink size={14} />} />;
  }
  return <NavLink {...common} component={Link} to={item.href} />;
}

function AdminHeader({ menuOpened, onToggleMenu }: { menuOpened: boolean; onToggleMenu(): void }) {
  const { user, logout } = useAuth();
  const { items } = useMenu();
  const profilePath = useScreenPath('profile');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // The search box jumps to any page in the user's menu.
  const options = items.map((i) => ({ value: `${i.menuCode}/${i.code}`, label: i.menuName !== i.name ? `${i.name} · ${i.menuName}` : i.name }));
  const go = (value: string) => {
    const item = items.find((i) => `${i.menuCode}/${i.code}` === value);
    setQuery('');
    if (!item) return;
    if (item.external) window.open(item.href, '_blank', 'noreferrer');
    else navigate(item.href);
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Group h="100%" px="lg" justify="space-between" wrap="nowrap" gap="md">
      <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
        <Burger opened={menuOpened} onClick={onToggleMenu} hiddenFrom="md" size="sm" aria-label="Toggle menu" />
        <Autocomplete
          placeholder="Search pages…"
          aria-label="Search pages"
          leftSection={<IconSearch size={16} />}
          data={options}
          value={query}
          onChange={setQuery}
          onOptionSubmit={go}
          limit={8}
          w="100%"
          maw={420}
          radius="xl"
        />
      </Group>

      <Menu position="bottom-end" width={240} shadow="md">
        <Menu.Target>
          <UnstyledButton aria-label="Account menu">
            <Group gap="xs" wrap="nowrap">
              <Avatar color="brand" radius="xl" size={36}>{initials(user?.name)}</Avatar>
              <Text fw={600} size="sm" visibleFrom="sm">{user?.name}</Text>
              <IconChevronDown size={16} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>
            {user?.email}
            {user?.profileCode && <Text size="xs" c="dimmed">{user.profileCode}</Text>}
          </Menu.Label>
          {profilePath && (
            <Menu.Item component={Link} to={profilePath} leftSection={<IconUser size={16} />}>Profile</Menu.Item>
          )}
          <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>Logout</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
