import { Alert, Anchor, Button, PasswordInput, Text, TextInput } from '@mantine/core';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MIN_PASSWORD_LENGTH, validateRegistration } from '@/domain/auth/user';
import { errorMessage } from '@/domain/shared/errors';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../providers/AuthProvider';
import { STORE_ACCENT } from '../../theme/theme';

const EMPTY = { name: '', email: '', phone: '', password: '', confirm: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.currentTarget.value });

  // On success the guest-only route redirects to the customer dashboard.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return setError('Fill in every field.');
    const invalid = validateRegistration(form);
    if (invalid) return setError(invalid);
    setError('');
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Sign up to shop and manage your pets." onSubmit={submit}>
      {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
      <TextInput label="Full Name" placeholder="Enter your name" autoComplete="name" required value={form.name} onChange={set('name')} />
      <TextInput label="Email Address" type="email" placeholder="Enter your email" autoComplete="email" required value={form.email} onChange={set('email')} />
      <TextInput label="Phone Number" type="tel" placeholder="Enter your phone number" autoComplete="tel" required value={form.phone} onChange={set('phone')} />
      <PasswordInput
        label="Password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        autoComplete="new-password"
        required
        value={form.password}
        onChange={set('password')}
      />
      <PasswordInput label="Confirm Password" placeholder="Re-enter your password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
      <Button type="submit" color={STORE_ACCENT} radius="xl" size="md" loading={busy} fullWidth>
        Create account
      </Button>
      <Text size="sm">
        Already have an account? <Anchor component={Link} to="/login" c="orange.7">Login</Anchor>
      </Text>
    </AuthLayout>
  );
}
