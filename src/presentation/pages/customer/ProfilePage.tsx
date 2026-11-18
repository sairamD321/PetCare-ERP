import { Button, Card, Stack, TextInput } from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { notify } from '../../hooks/feedback';
import { useAuth, useCurrentUser } from '../../providers/AuthProvider';
import { useServices } from '../../providers/ServicesProvider';
import { errorMessage } from '@/domain/shared/errors';

export function ProfilePage() {
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const { accounts } = useServices();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '', address: user.address ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    setError('');
    setSaving(true);
    try {
      const patch = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() };
      await accounts.update(user.id, patch);
      updateUser(patch);
      notify.success('Profile updated!');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" />
      <Card maw={520} component="form" onSubmit={submit} noValidate>
        <Stack>
          <TextInput label="Email" value={user.email} disabled />
          <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
          <TextInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} />
          <TextInput label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <Button type="submit" loading={saving} w="fit-content">Save</Button>
        </Stack>
      </Card>
    </>
  );
}
