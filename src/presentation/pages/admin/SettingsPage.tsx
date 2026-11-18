import { Button, Card, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { useState, type FormEvent } from 'react';
import type { StoreSettings } from '@/domain/catalog/settings';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { notify } from '../../hooks/feedback';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

export function SettingsPage() {
  const { settings } = useServices();
  const { data, error, reload } = useAsync(() => settings.get(), [settings]);

  return (
    <>
      <PageHeader title="Settings" />
      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}
      {!data && !error && <Text c="dimmed">Loading…</Text>}
      {/* Keyed so a reload starts the form from the server's values. */}
      {data && <SettingsForm key={JSON.stringify(data)} initial={data} />}
    </>
  );
}

function SettingsForm({ initial }: { initial: StoreSettings }) {
  const { settings } = useServices();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim() || !form.currency.trim()) return notify.error('Store name and currency are required.');
    setSaving(true);
    try {
      await settings.save(form);
      notify.success('Saved!');
    } catch (err) {
      notify.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card maw={520} component="form" onSubmit={submit} noValidate>
      <Stack>
        <TextInput label="Store name" required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.currentTarget.value })} />
        <TextInput label="Currency" required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.currentTarget.value })} />
        <NumberInput
          label="Low stock threshold"
          required
          min={0}
          allowDecimal={false}
          value={form.lowStockThreshold}
          onChange={(v) => setForm({ ...form, lowStockThreshold: Number(v) || 0 })}
        />
        <Button type="submit" loading={saving} w="fit-content">Save</Button>
      </Stack>
    </Card>
  );
}
