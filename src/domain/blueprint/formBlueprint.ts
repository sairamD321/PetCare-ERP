import { compileCriteria, type Criteria, type FieldValues } from './criteria';

// Create / edit form described by an edit-form blueprint, e.g. GET products/api/blueprint/productsEditForm:
//   { editForm: [{ field, displayName,
//                  fieldType: 'textBox' | 'textArea' | 'dropDown' | 'cascadeDropDown' | 'radioButton' | 'fileUpload',
//                  toolTip, placeholder, editable, excludeFromPayload, api, dropdownCode, dropdownValue,
//                  values: [{ radioValue }],                                  (radioButton)
//                  visibilityCriteria: "field.type == 'Cat' && field.productType == 'Food'",
//                  valuesDependOnField: "type,productType",
//                  rules: [{ mandatory, maxSize, minSize, allowValues, default, multiple }] }],
//     createApi, dataApi, mappings: { recordId }, resetButton, refreshOnSave }
// A field may be listed several times with different visibilityCriteria (categoryCode from catfood,
// dogfood, catmedicine …): the first entry whose criteria hold is the one shown. Hidden fields are
// neither validated nor sent. Fields with excludeFromPayload: true (e.g. type / productType, which only
// steer which category and brand lists apply) are shown and validated but never sent. Changing a field clears every field whose valuesDependOnField names it.

export interface FieldRule {
  mandatory?: boolean;
  maxSize?: string | number;
  minSize?: string | number;
  allowValues?: string;
  default?: string | number;
  multiple?: boolean;
}

export interface RawFormField {
  field: string;
  displayName?: string;
  fieldType?: string;
  toolTip?: string;
  placeholder?: string;
  editable?: boolean;
  excludeFromPayload?: boolean | string;
  display?: boolean;
  visible?: boolean;
  api?: string;
  dropdownCode?: string;
  dropdownValue?: string;
  values?: unknown[];
  visibilityCriteria?: string;
  valuesDependOnField?: string | string[];
  rules?: FieldRule[] | FieldRule;
}

export interface FormBlueprint {
  editForm?: RawFormField[];
  formFields?: RawFormField[];
  fields?: RawFormField[];
  createApi?: string;
  dataApi?: string;
  refreshOnSave?: boolean;
  resetButton?: boolean;
  viewHideEmptyFields?: boolean;
  mappings?: { recordId?: string };
  version?: string;
  apiVersion?: string;
}

export interface OptionSource {
  api: string;
  code: string;
  label: string;
  group: string;
}

export interface Choice {
  value: string;
  label: string;
}

export type FieldKind = 'file' | 'radio' | 'dropdown' | 'longText' | 'text';

// One blueprint entry for a field, ready to render.
export interface FormField {
  field: string;
  displayName: string;
  kind: FieldKind;
  toolTip?: string;
  placeholder?: string;
  editable: boolean;
  inPayload: boolean; // false when the blueprint sets excludeFromPayload
  rule: FieldRule;
  sources: OptionSource[];
  choices: Choice[];
  visible: Criteria | null;
  dependsOn: string[];
  isPrice: boolean;
  isDigits: boolean;
}

// All blueprint entries for one field name, in blueprint order.
export interface FieldGroup {
  field: string;
  label: string;
  variants: FormField[];
  dependsOn: string[];
}

export type Warn = (message: string) => void;

function kindOf(fieldType = '', name = ''): FieldKind {
  if (/file|image|upload/i.test(fieldType)) return 'file';
  if (/radio/i.test(fieldType)) return 'radio';
  if (/drop\s*down|select|combo/i.test(fieldType)) return 'dropdown';
  if (/area|multiline/i.test(fieldType) || /details|description/i.test(name)) return 'longText';
  return 'text';
}

function criteriaOf(src: unknown, field: string, warn: Warn): Criteria | null {
  if (typeof src !== 'string' || !src.trim()) return null;
  try {
    return compileCriteria(src);
  } catch (e) {
    // A broken criteria shouldn't make a field impossible to fill in: show it.
    warn(`Ignoring visibilityCriteria of "${field}" (${(e as Error).message}): ${src}`);
    return null;
  }
}

// Blueprint flags may arrive as booleans or strings ("true" / "True").
const isTrue = (value: unknown): boolean => value === true || String(value).trim().toLowerCase() === 'true';

const splitList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : String(value ?? '').split(',')).map((x) => String(x).trim()).filter(Boolean);

// "products/api/food-categories?size=50&page=0" → "Food" (used to group a dropdown's options).
function sourceGroup(api: string): string {
  const segment = api.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  const word = segment.split(/[-_]/)[0];
  return word ? word[0].toUpperCase() + word.slice(1) : '';
}

// Radio choices: [{ radioValue }], [{ value, label }] or plain strings.
function radioChoices(values: unknown): Choice[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const value = o.radioValue ?? o.value ?? o.code;
        return { value, label: o.radioLabel ?? o.label ?? o.displayName ?? value };
      }
      return { value: v, label: v };
    })
    .filter((o) => o.value != null && o.value !== '')
    .map((o) => ({ value: String(o.value), label: String(o.label) }));
}

// Words every label shares, in order: "Food Category" + "Medicine Category" → "Category".
function commonLabel(labels: string[]): string {
  const [first, ...rest] = labels.map((l) => l.split(/\s+/));
  const shared = first.filter((w) => rest.every((words) => words.some((x) => x.toLowerCase() === w.toLowerCase())));
  return shared.join(' ') || first.join(' ');
}

export const formFieldList = (form: FormBlueprint | null | undefined): RawFormField[] => {
  const list = form?.editForm ?? form?.formFields ?? form?.fields ?? [];
  return Array.isArray(list) ? list : [];
};

// Blueprint fields grouped by field name, in blueprint order. Each group holds its variants (one per
// blueprint entry with distinct visibilityCriteria). Entries without criteria for the same dropdown are
// merged into one dropdown whose options come from every api, grouped by source.
export function normalizeFields(form: FormBlueprint | null | undefined, warn: Warn = console.warn): FieldGroup[] {
  const groups = new Map<string, FieldGroup>();
  for (const f of formFieldList(form)) {
    if (!f || typeof f.field !== 'string' || f.display === false || f.visible === false) continue;
    const rule: FieldRule = (Array.isArray(f.rules) ? f.rules[0] : f.rules) ?? {};
    const kind = kindOf(f.fieldType, f.field);
    const source: OptionSource | null = kind === 'dropdown' && f.api
      ? { api: f.api, code: f.dropdownCode ?? f.field, label: f.dropdownValue ?? f.dropdownCode ?? f.field, group: sourceGroup(f.api) }
      : null;
    const visible = criteriaOf(f.visibilityCriteria, f.field, warn);
    const variant: FormField = {
      field: f.field,
      displayName: f.displayName ?? f.field,
      kind,
      toolTip: f.toolTip || undefined,
      placeholder: f.placeholder || undefined,
      editable: f.editable !== false,
      inPayload: !isTrue(f.excludeFromPayload),
      rule,
      sources: source ? [source] : [],
      choices: kind === 'radio' ? radioChoices(f.values) : [],
      visible,
      dependsOn: splitList(f.valuesDependOnField),
      isPrice: /price|amount|cost/i.test(f.field),
      isDigits: rule.allowValues === 'onlyDigital',
    };

    let group = groups.get(f.field);
    if (!group) {
      group = { field: f.field, label: variant.displayName, variants: [], dependsOn: [] };
      groups.set(f.field, group);
    }
    const unconditional = group.variants.find((v) => !v.visible);
    if (!visible && unconditional?.kind === 'dropdown') {
      if (source) unconditional.sources.push(source);
      if (rule.mandatory === true) unconditional.rule = { ...unconditional.rule, mandatory: true };
    } else {
      group.variants.push(variant);
    }
    for (const d of variant.dependsOn) if (!group.dependsOn.includes(d)) group.dependsOn.push(d);
  }

  for (const group of groups.values()) {
    // A merged dropdown is labelled without its source words: "Food Category" + "Medicine Category" → "Category".
    for (const v of group.variants) {
      if (v.sources.length < 2) continue;
      const words = new Set(v.sources.map((s) => s.group.toLowerCase()));
      const label = v.displayName.split(/\s+/).filter((w) => !words.has(w.toLowerCase())).join(' ');
      if (label) v.displayName = label;
    }
    group.label = commonLabel([...new Set(group.variants.map((v) => v.displayName))]);
  }
  return [...groups.values()];
}

// The variant of a field that applies to the current values, or null when the field is hidden.
export const activeVariant = (group: FieldGroup, values: FieldValues): FormField | null =>
  group.variants.find((v) => !v.visible || v.visible(values)) ?? null;

export const visibleFields = (groups: FieldGroup[], values: FieldValues): FormField[] =>
  groups.map((g) => activeVariant(g, values)).filter((f): f is FormField => f !== null);

// Dependencies of a hidden field that still need a value before it can appear.
export const missingDependencies = (group: FieldGroup, values: FieldValues): string[] =>
  group.dependsOn.filter((d) => String(values[d] ?? '').trim() === '');

// Sets one value and clears the fields whose values depend on it (and the fields depending on those).
export function withValue(groups: FieldGroup[], values: FieldValues, name: string, value: string): FieldValues {
  if (values[name] === value) return values;
  const next = { ...values, [name]: value };
  const queue = [name];
  const cleared = new Set([name]);
  while (queue.length) {
    const changed = queue.shift()!;
    for (const g of groups) {
      if (cleared.has(g.field) || !g.dependsOn.includes(changed)) continue;
      cleared.add(g.field);
      queue.push(g.field);
      if (g.field in next) next[g.field] = '';
    }
  }
  return next;
}

// Starting values: the record's on edit, the blueprint defaults on create. File fields have none.
export function startValues(groups: FieldGroup[], mode: 'create' | 'edit', record: Record<string, unknown> | null): FieldValues {
  const init: FieldValues = {};
  for (const g of groups) {
    const first = g.variants[0];
    if (!first || first.kind === 'file') continue;
    const v = mode === 'edit'
      ? record?.[g.field]
      : g.variants.find((x) => x.rule.default !== '' && x.rule.default != null)?.rule.default;
    init[g.field] = v == null ? '' : String(v);
  }
  return init;
}

// ── Validation ──

const SIZE_UNITS: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
function bytes(size: unknown): number | null {
  const m = String(size ?? '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  return m ? Number(m[1]) * SIZE_UNITS[m[2] ?? 'b'] : null;
}

// Letters, digits and the separators codes use (DOG_FOOD, Royal Canin, 1.2kg).
const ALPHA_DIGITAL = /^[\p{L}\p{N} _.\-/]*$/u;
const isSet = (v: unknown) => v !== '' && v != null;

export function validateValue(field: FormField, value: string | undefined, required: boolean): string {
  const v = String(value ?? '').trim();
  const { rule } = field;
  if (!v) return required ? `${field.displayName} is required.` : '';
  if (field.kind === 'radio') {
    return field.choices.length && !field.choices.some((c) => c.value === v) ? `Choose a valid ${field.displayName.toLowerCase()}.` : '';
  }
  const min = Number(rule.minSize);
  const max = Number(rule.maxSize);
  if (field.isPrice && !/^\d+(\.\d{1,2})?$/.test(v)) return 'Enter a valid amount, e.g. 499 or 499.50.';
  if (field.isDigits && !/^\d+$/.test(v)) return 'Use digits only.';
  if (rule.allowValues === 'alphaDigital' && !ALPHA_DIGITAL.test(v)) return 'Use letters and numbers only.';
  if (isSet(rule.minSize) && !field.isDigits && v.length < min) return `Use at least ${min} characters.`;
  if (isSet(rule.maxSize) && max > 0 && v.length > max) return `Use at most ${max} characters.`;
  return '';
}

export interface FileLike {
  name: string;
  size: number;
}

export const allowedExtensions = (field: FormField): string[] =>
  String(field.rule.allowValues ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

export function validateFiles(field: FormField, files: FileLike[], required: boolean): string {
  if (!files.length) return required ? `${field.displayName} is required.` : '';
  const allowed = allowedExtensions(field);
  const max = bytes(field.rule.maxSize);
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (allowed.length && !allowed.includes(ext)) return `${file.name}: allowed types are ${allowed.join(', ')}.`;
    if (max && file.size > max) return `${file.name} is larger than ${field.rule.maxSize}.`;
  }
  return '';
}

export const maxLength = (field: FormField): number | undefined =>
  Number(field.rule.maxSize) > 0 && field.kind !== 'file' ? Number(field.rule.maxSize) : undefined;

// Value for a JSON body: numbers for price/digit fields, null for cleared fields.
export function jsonValue(field: FormField, value: string | undefined): string | number | null {
  const v = String(value ?? '').trim();
  if (v === '') return null;
  if (field.isDigits) return Number.parseInt(v, 10);
  if (field.isPrice) return Number(v);
  return v;
}

// The rows of a list response: a plain array, or the array under { records / items / data / results / content }.
export function responseItems(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  const r = response as Record<string, unknown> | null;
  return (['records', 'items', 'data', 'results', 'content'].map((k) => r?.[k]).find(Array.isArray) as unknown[] | undefined) ?? [];
}

// Options for one dropdown source: the api answers with a list (or { records / items / data }).
export function sourceOptions(response: unknown, source: OptionSource): Choice[] {
  return responseItems(response)
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { value: o[source.code], label: o[source.label] ?? o[source.code] };
    })
    .filter((o) => o.value != null && o.value !== '')
    .map((o) => ({ value: String(o.value), label: String(o.label) }));
}

export const optionsKey = (field: FormField): string => field.sources.map((s) => s.api).join('|');
