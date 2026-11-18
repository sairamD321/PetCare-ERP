import { Anchor, Button, type AnchorProps, type ButtonProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ScreenKey } from '@/domain/menu/screens';
import { useScreenPath } from '../providers/MenuProvider';

interface ScreenTarget {
  screen: ScreenKey;
  query?: string;
  // Rendered when the user's menu doesn't include the screen (default: nothing).
  fallback?: ReactNode;
  children: ReactNode;
}

// Links to another screen by its key. The url comes from the backend menu, so the link renders only
// when the user's menu includes that screen.
function useScreenHref(screen: ScreenKey, query?: string): string | null {
  const path = useScreenPath(screen);
  return path ? (query ? `${path}?${query}` : path) : null;
}

export function ScreenLink({ screen, query, fallback = null, children, ...rest }: ScreenTarget & AnchorProps) {
  const href = useScreenHref(screen, query);
  if (!href) return <>{fallback}</>;
  return (
    <Anchor component={Link} to={href} fw={600} size="sm" {...rest}>
      {children}
    </Anchor>
  );
}

export function ScreenButton({ screen, query, fallback = null, children, ...rest }: ScreenTarget & ButtonProps & { onClick?: () => void }) {
  const href = useScreenHref(screen, query);
  if (!href) return <>{fallback}</>;
  return (
    <Button component={Link} to={href} {...rest}>
      {children}
    </Button>
  );
}
