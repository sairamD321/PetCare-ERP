import { Alert, Anchor, Button, TextInput } from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/domain/shared/errors';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../providers/AuthProvider';
import { STORE_ACCENT } from '../../theme/theme';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Enter your email address.');
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a link to set a new password." onSubmit={submit}>
      {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
      {sent ? (
        // Same message whether or not the account exists, so this form can't be used to probe emails.
        <Alert color="green" variant="light" role="status">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox and spam folder.
        </Alert>
      ) : (
        <>
          <TextInput
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Button type="submit" color={STORE_ACCENT} radius="xl" size="md" loading={busy} fullWidth>
            Send reset link
          </Button>
        </>
      )}
      <Anchor component={Link} to="/login" c="orange.7" size="sm">Back to login</Anchor>
    </AuthLayout>
  );
}
