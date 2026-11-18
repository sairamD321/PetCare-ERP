import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  normalizeFields,
  optionsKey,
  sourceOptions,
  startValues,
  validateFiles,
  validateValue,
  visibleFields,
  withValue,
  jsonValue,
  type Choice,
  type FieldGroup,
  type FormBlueprint,
  type FormField,
} from '@/domain/blueprint/formBlueprint';
import type { FieldValues } from '@/domain/blueprint/criteria';
import { apiVersion, normalizeRecord, type BlueprintRecord, type DataTableBlueprint } from '@/domain/blueprint/dataTable';
import { AppError, errorMessage } from '@/domain/shared/errors';
import { useServices } from '../providers/ServicesProvider';

export type FormMode = 'create' | 'edit';

export interface OptionGroup {
  label: string;
  options: Choice[];
}

export interface OptionsState {
  groups: OptionGroup[];
  error: string;
  // Another page can be loaded from at least one source.
  hasMore: boolean;
  loadingMore: boolean;
}

// Dropdown options are loaded this many at a time; "Next" at the bottom of the list loads more.
export const OPTIONS_PAGE_SIZE = 50;

// Paging position of one dropdown source.
interface SourcePage {
  next: number; // index of the next page to load
  hasNext: boolean;
}

interface Params {
  mode: FormMode;
  // Form blueprint url next to the data-table blueprint, or null to use the action's versioned url.
  formUrl: string | null;
  formVersionUrl: string | undefined;
  table: DataTableBlueprint;
  record: BlueprintRecord | null;
}

export interface SaveResult {
  saved: BlueprintRecord | null; // null: nothing changed
  refresh: boolean;
}

// State and rules of a blueprint-driven create / edit form.
// Create → POST createApi as multipart/form-data (fields + image files).
// Fields with excludeFromPayload are never sent, on create or edit.
// Edit   → loads the record from dataApi, then PUT dataApi as JSON with only the changed fields.
export function useRecordForm({ mode, formUrl, formVersionUrl, table, record }: Params) {
  const { blueprints, records } = useServices();
  const version = apiVersion(table);

  const [form, setForm] = useState<FormBlueprint | null>(null);
  const [loaded, setLoaded] = useState<BlueprintRecord | null>(mode === 'create' ? {} : null); // values the form started from
  const [values, setValues] = useState<FieldValues>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const groups = useMemo<FieldGroup[]>(() => normalizeFields(form), [form]);
  // The fields shown right now: per field name, the variant whose visibilityCriteria hold.
  const fields = useMemo(() => visibleFields(groups, values), [groups, values]);
  const recordIdField = form?.mappings?.recordId ?? table.mappings?.recordId;
  const recordId = recordIdField ? record?.[recordIdField] : undefined;

  // 1. Form blueprint. 2. For edit, the full record (the list only carries a few columns).
  useEffect(() => {
    let live = true;
    (async () => {
      const blueprint = formUrl
        ? await blueprints.get<FormBlueprint>(formUrl)
        : await blueprints.get<FormBlueprint>(formVersionUrl ?? '', version);
      const list = normalizeFields(blueprint);
      if (!list.length) throw new AppError('The form blueprint has no fields.');
      let start: BlueprintRecord = {};
      if (mode === 'edit') {
        start = normalizeRecord(record);
        const idField = blueprint.mappings?.recordId ?? table.mappings?.recordId;
        const id = idField ? record?.[idField] : undefined;
        if (blueprint.dataApi && id != null) {
          try {
            start = { ...start, ...normalizeRecord(await records.get(blueprint.dataApi, version, String(id))) };
          } catch {
            if (live) setNotice('Some details couldn’t be loaded from the server; only the fields shown in the list are filled in.');
          }
        }
      }
      if (!live) return;
      setForm(blueprint);
      setLoaded(start);
      setValues(startValues(list, mode, start));
    })().catch((e: unknown) => live && setLoadError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [mode, formUrl, formVersionUrl, version, table, record, blueprints, records]);

  // Dropdown options, fetched a page at a time when a dropdown variant first becomes visible (cached for
  // the session). Keyed by the variant's apis, so cat food and dog food categories keep separate lists.
  const [options, setOptions] = useState<Record<string, OptionsState>>({});
  const requested = useRef(new Set<string>());
  const pages = useRef<Record<string, SourcePage[]>>({});

  // Loads the next page of every source that has one and appends the rows to the dropdown's options.
  const loadPage = useCallback(
    (f: FormField) => {
      const key = optionsKey(f);
      const positions = pages.current[key] ?? f.sources.map(() => ({ next: 0, hasNext: true }));
      pages.current[key] = positions;
      setOptions((cur) => (cur[key] ? { ...cur, [key]: { ...cur[key], loadingMore: true, error: '' } } : cur));
      Promise.allSettled(
        f.sources.map((s, i) =>
          positions[i].hasNext ? blueprints.page(s.api, version, positions[i].next, OPTIONS_PAGE_SIZE) : Promise.resolve(null),
        ),
      ).then((results) => {
        let failed = 0;
        let tried = 0;
        const added = results.map((r, i) => {
          if (!positions[i].hasNext) return [];
          tried++;
          if (r.status === 'rejected') {
            failed++;
            return []; // keep this source's position so "Next" retries it
          }
          if (!r.value) return [];
          positions[i] = { next: positions[i].next + 1, hasNext: r.value.hasNext };
          return sourceOptions(r.value.items, f.sources[i]);
        });
        setOptions((cur) => {
          const before = cur[key]?.groups ?? [];
          const groups = f.sources
            .map((s, i) => {
              const seen = before.find((g) => g.label === s.group)?.options ?? [];
              const known = new Set(seen.map((o) => o.value));
              return { label: s.group, options: [...seen, ...added[i].filter((o) => !known.has(o.value))] };
            })
            .filter((g) => g.options.length);
          const error = failed ? `${failed === tried ? 'Couldn’t' : 'Some options couldn’t'} be loaded.` : '';
          return { ...cur, [key]: { groups, error, hasMore: positions.some((p) => p.hasNext), loadingMore: false } };
        });
      });
    },
    [blueprints, version],
  );

  useEffect(() => {
    for (const f of fields) {
      if (f.kind !== 'dropdown' || f.sources.length === 0) continue;
      const key = optionsKey(f);
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      loadPage(f);
    }
  }, [fields, loadPage]);

  const loadMoreOptions = (f: FormField) => {
    const current = options[optionsKey(f)];
    if (current && !current.loadingMore) loadPage(f);
  };

  const initialValues = useMemo(() => startValues(groups, mode, loaded), [groups, loaded, mode]);

  // On edit, a mandatory field only blocks saving if the server gave it a value (it can't be cleared);
  // fields the server didn't send stay optional because the update only sends what changed.
  // On create, the field mapped to the record id (sku) is always required: without it the record
  // can't be edited or deleted later, and the products API rejects the POST.
  const isRequired = (f: FormField) =>
    (mode === 'create' && f.field === recordIdField) ||
    (f.rule.mandatory === true && (mode === 'create' || initialValues[f.field] !== ''));

  const setValue = (name: string, value: string) => {
    setValues((cur) => withValue(groups, cur, name, value));
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const setFieldFiles = (name: string, list: File[]) => {
    setFiles((cur) => ({ ...cur, [name]: list }));
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (!f.editable) continue;
      const message = f.kind === 'file'
        ? mode === 'create' ? validateFiles(f, files[f.field] ?? [], isRequired(f)) : ''
        : validateValue(f, values[f.field], isRequired(f));
      if (message) next[f.field] = message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (): Promise<SaveResult | undefined> => {
    if (!form || !validate()) return undefined;
    const refresh = form.refreshOnSave === true;
    if (mode === 'create') {
      if (!form.createApi) throw new AppError('The form blueprint has no createApi.');
      // Fields marked excludeFromPayload (type, productType) only drive the form; the API doesn't take them.
      const payload = fields.filter((f) => f.inPayload);
      const body = new FormData();
      for (const f of payload) {
        if (f.kind === 'file') (files[f.field] ?? []).forEach((file) => body.append(f.field, file));
        else if (String(values[f.field] ?? '').trim() !== '') body.append(f.field, String(values[f.field]).trim());
      }
      const created = normalizeRecord(await records.create(form.createApi, version, body));
      const sent = Object.fromEntries(payload.filter((f) => f.kind !== 'file').map((f) => [f.field, jsonValue(f, values[f.field])]));
      return { saved: { ...sent, ...created }, refresh };
    }

    if (!form.dataApi) throw new AppError('The form blueprint has no dataApi.');
    if (recordId == null || recordId === '') throw new AppError(`This record has no ${recordIdField ?? 'id'}, so it can’t be updated.`);
    const changes: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.kind === 'file' || !f.editable || !f.inPayload) continue;
      if (String(values[f.field] ?? '').trim() !== String(initialValues[f.field] ?? '').trim()) changes[f.field] = jsonValue(f, values[f.field]);
    }
    if (Object.keys(changes).length === 0) return { saved: null, refresh: false };
    const response = await records.update(form.dataApi, version, String(recordId), changes);
    return { saved: { ...normalizeRecord(record), ...changes, ...normalizeRecord(response) }, refresh };
  };

  const reset = () => {
    setValues(initialValues);
    setFiles({});
    setErrors({});
  };

  return {
    form,
    groups,
    loaded,
    values,
    errors,
    options,
    loadMoreOptions,
    loadError,
    notice,
    isRequired,
    setValue,
    setFieldFiles,
    save,
    reset,
  };
}
