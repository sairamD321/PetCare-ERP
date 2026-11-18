import { Stack, Text, Title } from '@mantine/core';
import { IconPaw } from '@/presentation/components/icons';
import type { FormEvent, ReactNode } from 'react';
import logo from '@/assets/petcare-logo.png';
import classes from './AuthLayout.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  children: ReactNode;
  // Form only, without the welcome panel (login).
  compact?: boolean;
}

// Welcome screen shared by login, register and forgot-password: a PetCare promise beside the form.
export function AuthLayout({ title, subtitle, onSubmit, children, compact = false }: AuthLayoutProps) {
  return (
    <div className={`${classes.root} ${compact ? classes.compact : ''}`}>
      <section className={classes.art}>
        <IconPaw className={`${classes.paw} ${classes.p1}`} size={34} aria-hidden="true" />
        <IconPaw className={`${classes.paw} ${classes.p2}`} size={22} aria-hidden="true" />
        <IconPaw className={`${classes.paw} ${classes.p3}`} size={28} aria-hidden="true" />
        <div className={classes.quote}>
          <span className={classes.kicker}>
            <IconPaw size={18} color="var(--mantine-color-orange-7)" /> Welcome to PetCare
          </span>
          <h2 className={classes.headline}>
            For the love of <em>every paw.</em>
          </h2>
          <blockquote className={classes.blockquote}>
            “Where every pawprint is cherished, every purr is heard, and every tail has a reason to wag.”
          </blockquote>
          <p className={classes.sign}>— The PetCare Promise</p>
        </div>
      </section>

      <main className={classes.side}>
        <form className={classes.form} onSubmit={onSubmit} noValidate>
          <Stack gap="md">
            <img className={classes.logo} src={logo} alt="PetCare" />
            <div>
              <Title order={1} size="h2" c="var(--pc-ink)">{title}</Title>
              {subtitle && <Text c="dimmed" mt={4}>{subtitle}</Text>}
            </div>
            {children}
          </Stack>
        </form>
        <Text size="xs" c="dimmed" mt="xl" style={{ letterSpacing: '0.04em' }}>
          Happy Pets. Healthy Lives.
        </Text>
      </main>
    </div>
  );
}
