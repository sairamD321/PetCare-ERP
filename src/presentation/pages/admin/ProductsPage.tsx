import { ActionIcon, Button, Card, Group, NumberInput, SegmentedControl, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconPencil, IconSearch, IconTrash } from '@/presentation/components/icons';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, matchesProduct, type Product, type ProductCategory } from '@/domain/catalog/product';
import { inr, productEmoji } from '@/domain/shared/format';
import { ErrorAlert, PageHeader } from '../../components/PageState';
import { confirmDanger, notify } from '../../hooks/feedback';
import { useAsync } from '../../hooks/useAsync';
import { useServices } from '../../providers/ServicesProvider';

interface ProductForm {
  name: string;
  variant: string;
  category: ProductCategory;
  price: number | string;
  stock: number | string;
}

const emptyForm = (category?: string): ProductForm => ({
  name: '',
  variant: '',
  category: (CATEGORIES as readonly string[]).includes(category ?? '') ? (category as ProductCategory) : CATEGORIES[0],
  price: '',
  stock: '',
});

export function ProductsPage() {
  const { products } = useServices();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const isNew = params.get('new') === '1';

  const { data = [], error, reload } = useAsync(() => products.list(), [products]);
  const [form, setForm] = useState<ProductForm>(() => emptyForm(category));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastCategory, setLastCategory] = useState(category);
  const nameRef = useRef<HTMLInputElement>(null);

  // Keep the form's category in sync with the active filter when not editing.
  if (category !== lastCategory) {
    setLastCategory(category);
    if (!editingId && category) setForm((f) => ({ ...f, category: emptyForm(category).category }));
  }

  useEffect(() => {
    if (isNew) nameRef.current?.focus();
  }, [isNew]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('new');
    setParams(next);
  };

  const reset = () => {
    setForm(emptyForm(category));
    setEditingId(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.price === '' || form.stock === '') return notify.error('Name, price and stock are required.');
    const input = { name: form.name.trim(), variant: form.variant.trim(), category: form.category, price: Number(form.price), stock: Number(form.stock) };
    setSaving(true);
    try {
      if (editingId) await products.update(editingId, input);
      else await products.create(input);
      notify.success(editingId ? 'Product updated.' : 'Product added.');
      reset();
      reload();
    } catch (err) {
      notify.error(err);
    } finally {
      setSaving(false);
    }
  };

  const edit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, variant: p.variant ?? '', category: p.category, price: p.price, stock: p.stock });
    nameRef.current?.focus();
  };

  const remove = async (p: Product) => {
    if (!(await confirmDanger('Delete product', `Delete "${p.name}"? This can't be undone.`))) return;
    try {
      await products.remove(p.id);
      reload();
    } catch (err) {
      notify.error(err);
    }
  };

  const visible = data.filter((p) => matchesProduct(p, category, q));

  return (
    <>
      <PageHeader title={category ? `${category} Products` : 'Products'} />

      <Group justify="space-between" mb="md" gap="sm">
        <SegmentedControl
          value={category}
          onChange={(v) => setParam('category', v)}
          data={[{ value: '', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          radius="xl"
        />
        <TextInput
          placeholder="Search products…"
          leftSection={<IconSearch size={16} />}
          value={q}
          onChange={(e) => setParam('q', e.currentTarget.value)}
          w={260}
          radius="xl"
        />
      </Group>

      <Card component="form" onSubmit={submit} mb="md" noValidate>
        <Group align="flex-end" gap="sm">
          <TextInput ref={nameRef} label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} style={{ flex: 2, minWidth: 160 }} />
          <TextInput label="Size / variant" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.currentTarget.value })} style={{ flex: 1, minWidth: 120 }} />
          <Select label="Category" data={[...CATEGORIES]} value={form.category} onChange={(v) => v && setForm({ ...form, category: v as ProductCategory })} allowDeselect={false} w={150} />
          <NumberInput label="Price" required min={0} decimalScale={2} prefix="₹" value={form.price} onChange={(v) => setForm({ ...form, price: v })} w={120} />
          <NumberInput label="Stock" required min={0} allowDecimal={false} value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} w={110} />
          <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Add product'}</Button>
          {editingId && <Button variant="default" onClick={reset}>Cancel</Button>}
        </Group>
      </Card>

      {error && <ErrorAlert onRetry={reload}>{error}</ErrorAlert>}

      <Card p={0}>
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th w={100} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visible.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text c="dimmed" size="sm">{data.length ? 'No products match.' : 'No products yet. Add your first one above.'}</Text></Table.Td>
                </Table.Tr>
              )}
              {visible.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <span aria-hidden="true">{productEmoji(p)}</span>
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>{p.name}</Text>
                        {p.variant && <Text size="xs" c="dimmed">{p.variant}</Text>}
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>{p.category}</Table.Td>
                  <Table.Td>{inr(p.price)}</Table.Td>
                  <Table.Td>{p.stock}</Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Edit"><ActionIcon variant="subtle" onClick={() => edit(p)} aria-label={`Edit ${p.name}`}><IconPencil size={17} /></ActionIcon></Tooltip>
                      <Tooltip label="Delete"><ActionIcon variant="subtle" color="red" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><IconTrash size={17} /></ActionIcon></Tooltip>
                    </Group>
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
