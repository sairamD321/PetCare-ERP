import { Alert, Anchor, Button, Group, PasswordInput, TextInput } from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/domain/shared/errors';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../providers/AuthProvider';
import { STORE_ACCENT } from '../../theme/theme';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // On success the guest-only route sends the user to "/", which opens the first link in their menu.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setError('');
    setBusy(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout compact title="Welcome back" subtitle="Log in to continue caring for your pets." onSubmit={submit}>
      {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
      <TextInput
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
      />
      <PasswordInput
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
      />
      <Button type="submit" color={STORE_ACCENT} radius="xl" size="md" loading={busy} fullWidth>
        Login
      </Button>
      <Group justify="space-between">
        <Anchor component={Link} to="/forgot-password" c="orange.7" size="sm">Forgot password?</Anchor>
        <Anchor component={Link} to="/register" c="orange.7" size="sm">Create account</Anchor>
      </Group>
    </AuthLayout>
  );
}
