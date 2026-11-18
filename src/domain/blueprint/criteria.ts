// visibilityCriteria: a small, safe expression language (no eval).
// Supports field.<name> (or a bare <name>), 'strings', numbers, true/false/null,
// == != === !== < > <= >=, && || !, and parentheses.
//   " field.type =='Cat' && field.productType == 'Food'"

export type FieldValues = Record<string, string | undefined>;
export type Criteria = (values: FieldValues) => boolean;

type Literal = string | number | boolean | null;
type Token = { lit: Literal } | { op: string } | { id: string };
type Expr = (values: FieldValues) => Literal | undefined;

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(&&|\|\||===|!==|==|!=|<=|>=|[<>!()])|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*))/y;
const KEYWORDS: Record<string, Literal> = { true: true, false: false, null: null };
const COMPARISONS = new Set(['==', '===', '!=', '!==', '<', '>', '<=', '>=']);

function tokenize(src: string): Token[] {
  const text = src.trim();
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < text.length) {
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(text);
    if (!m) throw new Error(`unexpected "${text.slice(pos)}"`);
    pos = TOKEN.lastIndex;
    if (m[1] != null) tokens.push({ lit: Number(m[1]) });
    else if (m[2] != null || m[3] != null) tokens.push({ lit: (m[2] ?? m[3]).replace(/\\(.)/g, '$1') });
    else if (m[4]) tokens.push({ op: m[4] });
    else if (m[5] in KEYWORDS) tokens.push({ lit: KEYWORDS[m[5]] });
    else tokens.push({ id: m[5].replace(/^(field|fields|values|record)\./, '') });
  }
  return tokens;
}

const truthy = (v: unknown) => v !== '' && v != null && v !== false && v !== 0;

function compare(op: string, a: unknown, b: unknown): boolean {
  switch (op) {
    case '==':
    case '===':
      return String(a ?? '') === String(b ?? '');
    case '!=':
    case '!==':
      return String(a ?? '') !== String(b ?? '');
    case '<':
      return Number(a) < Number(b);
    case '>':
      return Number(a) > Number(b);
    case '<=':
      return Number(a) <= Number(b);
    default:
      return Number(a) >= Number(b);
  }
}

const describe = (t: Token) => ('op' in t ? t.op : 'id' in t ? t.id : String(t.lit));

// Compiles a criteria string into a predicate over the form's values. Throws on a malformed expression.
export function compileCriteria(src: string): Criteria {
  const tokens = tokenize(src);
  let i = 0;
  const peekOp = () => {
    const t = tokens[i];
    return t && 'op' in t ? t.op : undefined;
  };
  const take = (op: string) => (peekOp() === op ? (i++, true) : false);

  const or = (): Expr => {
    let left = and();
    while (take('||')) {
      const a = left;
      const b = and();
      left = (v) => truthy(a(v)) || truthy(b(v));
    }
    return left;
  };
  const and = (): Expr => {
    let left = cmp();
    while (take('&&')) {
      const a = left;
      const b = cmp();
      left = (v) => truthy(a(v)) && truthy(b(v));
    }
    return left;
  };
  const cmp = (): Expr => {
    const left = unary();
    const op = peekOp();
    if (!op || !COMPARISONS.has(op)) return left;
    i++;
    const right = unary();
    return (v) => compare(op, left(v), right(v));
  };
  const unary = (): Expr => {
    if (take('!')) {
      const a = unary();
      return (v) => !truthy(a(v));
    }
    if (take('(')) {
      const inner = or();
      if (!take(')')) throw new Error('missing ")"');
      return inner;
    }
    const t = tokens[i++];
    if (!t) throw new Error('unexpected end');
    if ('lit' in t) return () => t.lit;
    if ('id' in t) return (v) => v[t.id];
    throw new Error(`unexpected "${t.op}"`);
  };

  const expr = or();
  if (i < tokens.length) throw new Error(`unexpected "${describe(tokens[i])}"`);
  return (values) => truthy(expr(values));
}
