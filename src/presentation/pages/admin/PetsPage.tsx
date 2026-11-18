import { ActionIcon, Button, Card, Group, NumberInput, Select, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconTrash } from '@/presentation/components/icons';
import { useState, type FormEvent } from 'react';
import { customersOf } from '@/domain/catalog/customer';
import type { Pet } from '@/domain/catalog/pet';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { confirmDanger, notify } from '../../hooks/feedback';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

const EMPTY = { name: '', species: '', breed: '', age: '' as number | string, ownerId: '' };

export function PetsPage() {
  const { pets, accounts } = useServices();
  const { data, error, reload } = useAsync(async () => {
    const [petList, users] = await Promise.all([pets.list(), accounts.list()]);
    return { pets: petList, owners: customersOf(users) };
  }, [pets, accounts]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const owners = data?.owners ?? [];
  const ownerName = (id: string) => owners.find((o) => o.id === id)?.name ?? '—';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.species.trim() || !form.breed.trim() || form.age === '' || !form.ownerId) {
      return notify.error('Fill in every field to add a pet.');
    }
    setSaving(true);
    try {
      await pets.create({ name: form.name.trim(), species: form.species.trim(), breed: form.breed.trim(), age: Number(form.age), ownerId: form.ownerId });
      setForm(EMPTY);
      notify.success('Pet added.');
      reload();
    } catch (err) {
      notify.error(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Pet) => {
    if (!(await confirmDanger('Delete pet', `Delete ${p.name}? This can't be undone.`))) return;
    try {
      await pets.remove(p.id);
      reload();
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <>
      <PageHeader title="Pets" />
      <Card component="form" onSubmit={submit} mb="md" noValidate>
        <Group align="flex-end" gap="sm">
          <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} style={{ flex: 1, minWidth: 130 }} />
          <TextInput label="Species" required value={form.species} onChange={(e) => setForm({ ...form, species: e.currentTarget.value })} style={{ flex: 1, minWidth: 120 }} />
          <TextInput label="Breed" required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.currentTarget.value })} style={{ flex: 1, minWidth: 120 }} />
          <NumberInput label="Age" required min={0} allowDecimal={false} value={form.age} onChange={(v) => setForm({ ...form, age: v })} w={90} />
          <Select
            label="Owner"
            required
            searchable
            placeholder={owners.length ? 'Select owner' : 'No customers yet'}
            data={owners.map((o) => ({ value: o.id, label: o.name }))}
            value={form.ownerId || null}
            onChange={(v) => setForm({ ...form, ownerId: v ?? '' })}
            w={200}
          />
          <Button type="submit" loading={saving}>Add pet</Button>
        </Group>
      </Card>

      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}

      <Card p={0}>
        <Table.ScrollContainer minWidth={600}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Species</Table.Th>
                <Table.Th>Breed</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th w={60} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data && data.pets.length === 0 && (
                <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" size="sm">No pets registered yet.</Text></Table.Td></Table.Tr>
              )}
              {data?.pets.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{p.name}</Table.Td>
                  <Table.Td>{p.species}</Table.Td>
                  <Table.Td>{p.breed}</Table.Td>
                  <Table.Td>{p.age}</Table.Td>
                  <Table.Td>{ownerName(p.ownerId)}</Table.Td>
                  <Table.Td>
                    <Tooltip label="Delete">
                      <ActionIcon variant="subtle" color="red" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><IconTrash size={17} /></ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
}
