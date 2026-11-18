import { ActionIcon, Box, Button, Card, Center, Group, Image, SegmentedControl, SimpleGrid, Stack, Table, Text, TextInput, Tooltip, VisuallyHidden } from '@mantine/core';
import { IconEye, IconPencil, IconPlus, IconTrash, type Icon } from '@/presentation/components/icons';
import { useState, type FormEvent } from 'react';
import {
  actionKind,
  actionLabel,
  defaultDisplayMode,
  displayValue,
  formatCell,
  formBlueprintUrl,
  gridLayout,
  imagePath,
  isDeleteAction,
  recordList,
  rowActions as rowActionsOf,
  searchFields as searchFieldsOf,
  switchableModes,
  toolbarActions,
  pageInfo,
  pageParams,
  pagingOf,
  type PageInfo,
  apiVersion,
  type ActionKind,
  type BlueprintAction,
  type BlueprintRecord,
  type DataTableBlueprint,
  type DisplayMode,
  type SearchBlueprint,
} from '@/domain/blueprint/dataTable';
import { isConfiguredUrl, type MenuItem } from '@/domain/menu/menu';
import { AppError, errorMessage } from '@/domain/shared/errors';
import { ErrorAlert, FullPageLoader, PageHeader } from '../components/PageState';
import { confirmDanger } from '../hooks/feedback';
import { useAsync } from '../hooks/useAsync';
import { useServices } from '../providers/ServicesProvider';
import { ProductTile } from './ProductTile';
import productClasses from './ProductTile.module.css';
import { Pager } from './Pager';
import { RecordFormModal } from './RecordFormModal';

const ACTION_ICONS: Record<ActionKind, Icon> = { create: IconPlus, view: IconEye, edit: IconPencil, delete: IconTrash };

interface FormState {
  mode: 'create' | 'edit';
  action: BlueprintAction;
  record: BlueprintRecord | null;
}

interface Loaded {
  table: DataTableBlueprint;
  search: SearchBlueprint | null;
  searchError: string;
  rows: BlueprintRecord[];
  info: PageInfo;
}

// A screen described entirely by the backend: data-table blueprint (columns, actions, display modes),
// optional search blueprint, and edit-form blueprints for its create / edit actions.
export function BlueprintScreen({ item }: { item: MenuItem }) {
  const { blueprints } = useServices();

  const { data, error: loadError, loading } = useAsync<Loaded>(async () => {
    // Both blueprints are fetched at the same time (not one after the other).
    let searchError = '';
    const [table, search] = await Promise.all([
      blueprints.get<DataTableBlueprint>(item.dataTableBluePrintUrl ?? ''),
      isConfiguredUrl(item.searchBluePrintUrl)
        ? blueprints.get<SearchBlueprint>(item.searchBluePrintUrl).catch((e: unknown) => {
            searchError = errorMessage(e);
            return null;
          })
        : null,
    ]);
    if (!Array.isArray(table?.dataGrid)) throw new AppError('The data-table blueprint does not contain a dataGrid.');
    const paging = pagingOf(table, search);
    const response = await blueprints.list(table, pageParams(paging, 0), search);
    const rows = recordList(response);
    if (!rows) throw new AppError('The data API did not return a list of records.');
    return { table, search, searchError, rows, info: pageInfo(response, rows.length, paging, 0) };
  }, [item.dataTableBluePrintUrl, item.searchBluePrintUrl, blueprints]);

  if (loading && !data) return <FullPageLoader />;
  if (loadError || !data) return <ErrorAlert title={`Couldn't load ${item.name}`}>{loadError}</ErrorAlert>;

  // Keyed so a new blueprint starts with fresh rows, mode and search values.
  return <BlueprintGrid key={item.code} item={item} loaded={data} />;
}

function BlueprintGrid({ item, loaded }: { item: MenuItem; loaded: Loaded }) {
  const { blueprints, records, assetUrl } = useServices();
  const { table, search } = loaded;
  const [rows, setRows] = useState(loaded.rows);
  const paging = pagingOf(table, search);
  const [pageIndex, setPageIndex] = useState(0);
  const [info, setInfo] = useState<PageInfo>(loaded.info);
  const [pageLoading, setPageLoading] = useState(false);
  // Filters of the current listing; paging keeps them while the search box may hold unsent edits.
  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<DisplayMode>(() => defaultDisplayMode(table));
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState<FormState | null>(null);
  const [busyRecord, setBusyRecord] = useState<unknown>(null); // id of a record being deleted

  const { productGrid, columns, imageField, titleField } = gridLayout(table);
  const fields = searchFieldsOf(search);
  const showSearch = fields.length > 0 && table.enableSearch !== false;
  const modes = switchableModes(table);
  const actions = toolbarActions(table);
  const rowActions = rowActionsOf(table);
  const recordIdField = table.mappings?.recordId;
  const idOf = (r: BlueprintRecord) => (recordIdField ? r[recordIdField] : undefined);
  const recordKey = (r: BlueprintRecord, index: number) => String(idOf(r) ?? r.id ?? index);
  const titleOf = (r: BlueprintRecord) => String((titleField && r[titleField]) ?? idOf(r) ?? '');

  const fetchPage = async (index: number, filters = appliedSearch) => {
    const response = await blueprints.list(table, { ...filters, ...pageParams(paging, index) }, search);
    const list = recordList(response);
    if (!list) throw new AppError('The data API did not return a list of records.');
    if (list.length === 0 && index > 0) {
      // Moving forward past the last page (the server gave no totals): there is no next page after all.
      if (index > pageIndex) return setInfo((cur) => ({ ...cur, hasNext: false }));
      // A page emptied by deletes: step back to the previous one.
      return fetchPage(index - 1, filters);
    }
    setRows(list);
    setPageIndex(index);
    setInfo(pageInfo(response, list.length, paging, index));
  };

  const goToPage = async (index: number) => {
    setPageLoading(true);
    setError('');
    try {
      await fetchPage(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPageLoading(false);
    }
  };

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    setSearching(true);
    setError('');
    try {
      await fetchPage(0, searchValues);
      setAppliedSearch(searchValues);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const deleteRecord = async (action: BlueprintAction, record: BlueprintRecord) => {
    const id = idOf(record);
    const name = titleOf(record);
    if (!action.dataApi || id == null) return;
    if (!(await confirmDanger('Delete record', `Delete "${name}"? This can't be undone.`))) return;
    setError('');
    setBusyRecord(id);
    try {
      await records.remove(action.dataApi, apiVersion(table), String(id));
      setRows((list) => list.filter((r) => idOf(r) !== id));
      // Reload the page so the next product moves up into the freed slot.
      fetchPage(pageIndex).catch(() => undefined);
    } catch (e) {
      setError(`Couldn't delete "${name}": ${errorMessage(e)}`);
    } finally {
      setBusyRecord(null);
    }
  };

  const runRowAction = (action: BlueprintAction, record: BlueprintRecord) => {
    if (isDeleteAction(action)) void deleteRecord(action, record);
    else if (action.blueprintApi) setFormState({ mode: 'edit', action, record });
  };

  const onSaved = (saved: BlueprintRecord, { refresh }: { refresh: boolean }) => {
    const { mode: formMode, record } = formState!;
    setFormState(null);
    if (refresh) fetchPage(pageIndex).catch((e: unknown) => setError(errorMessage(e)));
    else if (formMode === 'create') setRows((list) => [saved, ...list]);
    else setRows((list) => list.map((r) => (r === record ? saved : r)));
  };

  const rowActionButtons = (record: BlueprintRecord) =>
    rowActions.length > 0 && (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        {rowActions.map((action) => {
          const label = actionLabel(action);
          const kind = actionKind(action.displayName, action.iconName, action.action);
          const ActionIconComponent = kind ? ACTION_ICONS[kind] : null;
          return (
            <Tooltip key={action.action ?? label} label={label}>
              <ActionIcon
                variant="subtle"
                color={isDeleteAction(action) ? 'red' : 'gray'}
                aria-label={`${label} ${titleOf(record)}`.trim()}
                loading={busyRecord != null && busyRecord === idOf(record)}
                onClick={() => runRowAction(action, record)}
                w={ActionIconComponent ? undefined : 'auto'}
                px={ActionIconComponent ? undefined : 'xs'}
              >
                {ActionIconComponent ? <ActionIconComponent size={17} /> : <Text size="xs">{label}</Text>}
              </ActionIcon>
            </Tooltip>
          );
        })}
      </Group>
    );

  const image = (record: BlueprintRecord, size: number | '100%') => {
    const src = imageField ? assetUrl(imagePath(record[imageField])) : '';
    return src ? <Image src={src} alt="" h={size} w={size === '100%' ? '100%' : size} fit="contain" fallbackSrc="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" /> : null;
  };

  return (
    <>
      <PageHeader
        title={productGrid ? <span className={productClasses.heading}>{item.name}</span> : item.name}
        actions={
          <>
            {actions.map((action) => {
              const kind = actionKind(action.iconName);
              const Leading = kind ? ACTION_ICONS[kind] : null;
              return (
                <Button
                  key={action.action ?? action.displayName}
                  title={action.action}
                  leftSection={Leading && <Leading size={16} />}
                  onClick={() => setFormState({ mode: 'create', action, record: null })}
                >
                  {action.displayName ?? action.action}
                </Button>
              );
            })}
            {modes.length > 1 && (
              <SegmentedControl aria-label="Display mode" value={mode} onChange={(v) => setMode(v as DisplayMode)} data={modes} />
            )}
          </>
        }
      />

      {formState && (
        <RecordFormModal
          key={`${formState.mode}-${formState.record ? recordKey(formState.record, -1) : 'new'}`}
          mode={formState.mode}
          formUrl={formBlueprintUrl(formState.action.blueprintApi, item.dataTableBluePrintUrl)}
          formVersionUrl={formState.action.blueprintApi}
          table={table}
          record={formState.record}
          title={formState.mode === 'create'
            ? formState.action.action ?? formState.action.displayName ?? 'Create'
            : `${actionLabel(formState.action)}: ${formState.record ? titleOf(formState.record) : ''}`}
          onClose={() => setFormState(null)}
          onSaved={onSaved}
        />
      )}

      {showSearch && (
        <Card mb="md" component="form" onSubmit={runSearch}>
          <Group align="flex-end" gap="sm">
            {fields.map((field) => (
              <TextInput
                key={field.field}
                label={field.displayName}
                type={field.type === 'number' ? 'number' : 'search'}
                value={searchValues[field.field] ?? ''}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setSearchValues((cur) => ({ ...cur, [field.field]: v }));
                }}
              />
            ))}
            <Button type="submit" loading={searching}>Search</Button>
          </Group>
        </Card>
      )}

      <Stack gap="sm" mb="md">
        {loaded.searchError && <ErrorAlert>Couldn’t load search options: {loaded.searchError}</ErrorAlert>}
        {error && <ErrorAlert>{error}</ErrorAlert>}
      </Stack>
      {!error && rows.length === 0 && <Text c="dimmed">No records found.</Text>}

      {mode === 'table' ? (
        <Card p={0}>
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  {columns.map((c) => <Table.Th key={c.field}>{c.displayName ?? c.field}</Table.Th>)}
                  {rowActions.length > 0 && <Table.Th w={120}><VisuallyHidden>Actions</VisuallyHidden></Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((record, i) => (
                  <Table.Tr key={recordKey(record, i)}>
                    {columns.map((c) => (
                      <Table.Td key={c.field}>
                        {c.field === imageField ? image(record, 48) ?? '—' : formatCell(c, record[c.field])}
                      </Table.Td>
                    ))}
                    {rowActions.length > 0 && <Table.Td>{rowActionButtons(record)}</Table.Td>}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      ) : (
        // Product catalogues: 5 per row on desktop.
        <SimpleGrid cols={productGrid ? { base: 2, sm: 3, md: 4, lg: 5 } : { base: 1, xs: 2, md: 3, xl: 4 }} spacing={productGrid ? 'sm' : 'md'}>
          {rows.map((record, i) => productGrid ? (
            <ProductTile
              key={recordKey(record, i)}
              record={record}
              columns={columns}
              titleField={titleField}
              imageField={imageField}
              image={image(record, 130)}
              actions={rowActionButtons(record)}
            />
          ) : (
            <Card key={recordKey(record, i)}>
              <Stack gap="xs" h="100%">
                {imageField && (
                  <Center h={160} bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                    {image(record, 150)}
                  </Center>
                )}
                {columns.filter((c) => c.field !== imageField).map((c) =>
                  c.field === titleField ? (
                    <Text key={c.field} fw={700} lineClamp={2} title={displayValue(record[c.field])}>{formatCell(c, record[c.field])}</Text>
                  ) : (
                    <Group key={c.field} justify="space-between" gap="xs" wrap="nowrap">
                      <Text size="sm" c="dimmed">{c.displayName ?? c.field}</Text>
                      <Text size="sm" fw={600} ta="right">{formatCell(c, record[c.field])}</Text>
                    </Group>
                  ),
                )}
                {/* Row actions sit at the bottom right, under the price. */}
                {rowActions.length > 0 && <Box mt="auto">{rowActionButtons(record)}</Box>}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Pager
        index={pageIndex}
        size={paging.size}
        rowCount={rows.length}
        info={info}
        loading={pageLoading}
        onChange={goToPage}
      />
    </>
  );
}
