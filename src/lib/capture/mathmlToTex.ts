// P14 插队（Ocean 2026-11-06，第 250 条）: a formula copied out of a page as MathML, back to TeX.
//
// Why this exists: a selection copied out of Claude desktop (and most pages that draw with KaTeX) puts on
// the clipboard (a) plain text with every formula spelled out one glyph per line, twice, and (b) HTML
// whose formulas are presentation MathML — and the `<annotation encoding="application/x-tex">` that held
// the original TeX is gone by then (2026-11-06 clipboard samples: 6 <math>, 0 annotations). So the TeX has
// to be rebuilt from the MathML. Presentation MathML is a small tree; the common shapes (scripts, fractions,
// roots, big operators with limits, accents, fences, matrices) map one-to-one. Anything unknown keeps its
// text — a formula is never dropped, at worst it comes back flatter than it was.

/** The DOM surface this needs — the browser's nodes have it, and so does the test parser. */
export interface HNode {
  nodeType: number;
  nodeName: string;
  childNodes: ArrayLike<HNode>;
  textContent: string | null;
  getAttribute?: (name: string) => string | null;
}

const ELEMENT = 1;
const TEXT = 3;

export const tagOf = (n: HNode): string => n.nodeName.toLowerCase().replace(/^.*:/, '');
export const attr = (n: HNode, name: string): string | null => n.getAttribute?.(name) ?? null;
export const kids = (n: HNode): HNode[] => Array.from(n.childNodes).filter((c) => c.nodeType === ELEMENT || c.nodeType === TEXT);
const elements = (n: HNode): HNode[] => Array.from(n.childNodes).filter((c) => c.nodeType === ELEMENT);

const SYMBOLS: Record<string, string> = {
  '⋅': '\\cdot', '·': '\\cdot', '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp', '−': '-', '∗': '\\ast',
  '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '≈': '\\approx', '≡': '\\equiv', '≅': '\\cong', '∼': '\\sim', '∝': '\\propto',
  '≪': '\\ll', '≫': '\\gg', '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla', '∅': '\\emptyset',
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap',
  '→': '\\to', '←': '\\leftarrow', '↔': '\\leftrightarrow', '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '⟹': '\\implies', '⟸': '\\impliedby', '⟺': '\\iff', '↦': '\\mapsto', '⟶': '\\longrightarrow',
  '∈': '\\in', '∉': '\\notin', '∋': '\\ni', '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∖': '\\setminus', '∀': '\\forall', '∃': '\\exists', '¬': '\\neg', '∧': '\\land', '∨': '\\lor',
  '∘': '\\circ', '°': '^\\circ', '′': "'", '″': "''", '…': '\\ldots', '⋯': '\\cdots', '⋮': '\\vdots', '⋱': '\\ddots',
  '∣': '|', '∥': '\\|', '⟨': '\\langle', '⟩': '\\rangle', '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil',
  '⊥': '\\perp', '∠': '\\angle', '△': '\\triangle', '⊕': '\\oplus', '⊗': '\\otimes', '∴': '\\therefore', '∵': '\\because',
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '&': '\\&', $: '\\$', _: '\\_',
  // Invisible operators MathML uses for function application / implied multiplication: nothing to write.
  '⁡': '', '⁢': '', '⁣': '', '⁤': '',
};
const GREEK: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ϵ: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ϑ: 'vartheta',
  ι: 'iota', κ: 'kappa', λ: 'lambda', μ: 'mu', ν: 'nu', ξ: 'xi', π: 'pi', ϖ: 'varpi', ρ: 'rho', σ: 'sigma', ς: 'varsigma',
  τ: 'tau', υ: 'upsilon', φ: 'phi', ϕ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
  Γ: 'Gamma', Δ: 'Delta', Θ: 'Theta', Λ: 'Lambda', Ξ: 'Xi', Π: 'Pi', Σ: 'Sigma', Υ: 'Upsilon', Φ: 'Phi', Ψ: 'Psi', Ω: 'Omega',
};
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg',
  'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'deg', 'dim', 'ker', 'arg', 'Pr', 'mod',
]);
/** Operators that take their limits above and below (`\sum_{k=0}^{n}`), not as an \overset. */
const BIG = new Set(['\\sum', '\\prod', '\\int', '\\iint', '\\oint', '\\bigcup', '\\bigcap', '\\lim', '\\max', '\\min', '\\sup', '\\inf']);
const ACCENTS: Record<string, string> = {
  '^': '\\hat', ˆ: '\\hat', '¯': '\\overline', '‾': '\\overline', '→': '\\vec', '⃗': '\\vec', '~': '\\tilde', '˜': '\\tilde',
  '˙': '\\dot', '¨': '\\ddot', '⏞': '\\overbrace', '⌢': '\\overarc',
};
const UNDER_ACCENTS: Record<string, string> = { _: '\\underline', '‾': '\\underline', '¯': '\\underline', '⏟': '\\underbrace' };

/** One character (or a run of text) as TeX. A command gets a trailing space so the next letter cannot glue onto it. */
const symbol = (text: string): string => {
  let out = '';
  for (const ch of text) {
    if (ch in SYMBOLS) out += SYMBOLS[ch] === '' ? '' : `${SYMBOLS[ch]}${/^\\[a-zA-Z]+$/.test(SYMBOLS[ch]!) ? ' ' : ''}`;
    else if (ch in GREEK) out += `\\${GREEK[ch]} `;
    else if (ch === '\\') out += '\\backslash ';
    else out += ch;
  }
  return out;
};

const text = (n: HNode): string => (n.textContent ?? '').trim();

/** Wrap in braces unless it is already one token. */
const group = (tex: string): string => {
  const t = tex.trim();
  if (/^[A-Za-z0-9]$/.test(t) || /^\\[a-zA-Z]+$/.test(t) || /^\{.*\}$/.test(t)) return t;
  return `{${t}}`;
};

const opName = (n: HNode): string => {
  const t = text(n);
  if (tagOf(n) === 'mi' && FUNCTIONS.has(t)) return `\\${t}`;
  if (tagOf(n) === 'mo' || tagOf(n) === 'mi') return symbol(t).trim();
  return '';
};

function convert(n: HNode): string {
  if (n.nodeType === TEXT) return symbol((n.textContent ?? '').replace(/\s+/g, ' '));
  if (n.nodeType !== ELEMENT) return '';
  const tag = tagOf(n);
  const c = elements(n);
  const all = (): string => kids(n).map(convert).join('');
  switch (tag) {
    case 'annotation':
    case 'annotation-xml':
      return '';
    case 'mi': {
      const t = text(n);
      if (FUNCTIONS.has(t)) return `\\${t} `;
      if (t.length > 1 && /^[A-Za-z]+$/.test(t)) return `\\operatorname{${t}}`;
      return symbol(t);
    }
    case 'mn':
      return text(n);
    case 'mo': {
      const t = text(n);
      return symbol(t);
    }
    case 'mtext': {
      const t = (n.textContent ?? '').replace(/[{}]/g, (m) => `\\${m}`);
      return t.trim() ? `\\text{${t}}` : ' ';
    }
    case 'mspace': {
      const w = attr(n, 'width') ?? '';
      if (w === '1em') return '\\quad ';
      if (w === '2em') return '\\qquad ';
      return '\\, ';
    }
    case 'msup':
      return `${group(convert(c[0]!))}^${group(convert(c[1]!))}`;
    case 'msub':
      return `${group(convert(c[0]!))}_${group(convert(c[1]!))}`;
    case 'msubsup':
      return `${group(convert(c[0]!))}_${group(convert(c[1]!))}^${group(convert(c[2]!))}`;
    case 'mfrac': {
      const [a, b] = [convert(c[0]!), convert(c[1]!)];
      const thin = (attr(n, 'linethickness') ?? '').replace(/[a-z]+$/, '');
      return thin === '0' ? `\\genfrac{}{}{0pt}{}{${a}}{${b}}` : `\\frac{${a}}{${b}}`;
    }
    case 'msqrt':
      return `\\sqrt{${all()}}`;
    case 'mroot':
      return `\\sqrt[${convert(c[1]!)}]{${convert(c[0]!)}}`;
    case 'mover': {
      const accent = ACCENTS[text(c[1]!)];
      const base = opName(c[0]!);
      if (BIG.has(base)) return `${base}^${group(convert(c[1]!))}`;
      if (accent) return `${accent}{${convert(c[0]!)}}`;
      return `\\overset{${convert(c[1]!)}}{${convert(c[0]!)}}`;
    }
    case 'munder': {
      const base = opName(c[0]!);
      if (BIG.has(base)) return `${base}_${group(convert(c[1]!))}`;
      const accent = UNDER_ACCENTS[text(c[1]!)];
      if (accent) return `${accent}{${convert(c[0]!)}}`;
      return `\\underset{${convert(c[1]!)}}{${convert(c[0]!)}}`;
    }
    case 'munderover': {
      const base = opName(c[0]!) || convert(c[0]!);
      return `${base}_${group(convert(c[1]!))}^${group(convert(c[2]!))}`;
    }
    case 'mtable': {
      const rows = c.map((tr) => elements(tr).map((td) => convert(td).trim()).join(' & '));
      return `\\begin{matrix}${rows.join(' \\\\ ')}\\end{matrix}`;
    }
    case 'menclose':
      return (attr(n, 'notation') ?? '').includes('box') ? `\\boxed{${all()}}` : all();
    case 'mphantom':
      return `\\phantom{${all()}}`;
    case 'mfenced': {
      const open = attr(n, 'open') ?? '(';
      const close = attr(n, 'close') ?? ')';
      const sep = attr(n, 'separators') ?? ',';
      return `\\left${symbol(open).trim() || '.'}${c.map(convert).join(sep.trim().charAt(0) || ',')}\\right${symbol(close).trim() || '.'}`;
    }
    case 'mrow': {
      // KaTeX writes \binom as ( + a fraction with no rule + ), all fences; say \binom again.
      if (
        c.length === 3 &&
        tagOf(c[1]!) === 'mfrac' &&
        (attr(c[1]!, 'linethickness') ?? '').replace(/[a-z]+$/, '') === '0' &&
        text(c[0]!) === '(' &&
        text(c[2]!) === ')'
      ) {
        const f = elements(c[1]!);
        return `\\binom{${convert(f[0]!)}}{${convert(f[1]!)}}`;
      }
      // Stretchy fences around the whole row: \left … \right, so a fraction inside gets tall brackets.
      const first = c[0];
      const last = c[c.length - 1];
      if (c.length > 2 && first && last && attr(first, 'fence') === 'true' && attr(last, 'fence') === 'true') {
        const inner = c.slice(1, -1).map(convert).join('');
        return `\\left${symbol(text(first)).trim() || '.'}${inner}\\right${symbol(text(last)).trim() || '.'}`;
      }
      return all();
    }
    default:
      // math, semantics, mstyle, mpadded, and anything else: their children, in order.
      return all();
  }
}

/** TeX for one <math> element. Prefers the TeX the page kept, when it kept it. */
export function mathmlToTex(math: HNode): string {
  const annotation = findTex(math);
  if (annotation) return annotation;
  return (
    convert(math)
      .replace(/[ \t]+/g, ' ')
      .replace(/ ([_^}])/g, '$1')
      // A one-character script followed by a letter or digit is valid TeX (`^n a`), but reads as one word:
      // brace it then, and only then (`a^2` stays `a^2`).
      .replace(/([_^])([A-Za-z0-9])(?=[A-Za-z0-9])/g, '$1{$2}')
      .trim()
  );
}

/** The `<annotation encoding="application/x-tex">` under `n`, if any. */
export function findTex(n: HNode): string | null {
  if (n.nodeType !== ELEMENT) return null;
  if (tagOf(n) === 'annotation' && (attr(n, 'encoding') ?? '').includes('tex')) return text(n) || null;
  for (const k of elements(n)) {
    const t = findTex(k);
    if (t) return t;
  }
  return null;
}
