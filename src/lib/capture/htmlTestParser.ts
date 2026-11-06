import type { HNode } from './mathmlToTex';

// ⚠️ TESTS ONLY. The app parses clipboard HTML with the webview's own DOMParser (`domParse`); vitest runs in
// Node, which has none, and the repo carries no DOM library (P14 §4.3 第 3 条: no new test dependency).
// This is just enough for the HTML a browser puts on the clipboard — serialised, every tag closed: tags,
// attributes, text, the common entities, void elements, raw text in <script> / <style>.

const VOID = new Set(['br', 'hr', 'img', 'meta', 'link', 'input', 'area', 'base', 'col', 'embed', 'source', 'wbr', 'mspace']);
const RAW = new Set(['script', 'style']);

interface Node extends HNode {
  childNodes: Node[];
  attrs?: Record<string, string>;
  data?: string;
}

const decode = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

const textNode = (data: string): Node => ({
  nodeType: 3,
  nodeName: '#text',
  childNodes: [],
  data,
  get textContent() {
    return data;
  },
});

const element = (name: string, attrs: Record<string, string>): Node => {
  const n: Node = {
    nodeType: 1,
    nodeName: name.toUpperCase(),
    childNodes: [],
    attrs,
    getAttribute: (a: string) => attrs[a.toLowerCase()] ?? null,
    get textContent(): string {
      return n.childNodes.map((c) => c.textContent ?? '').join('');
    },
  };
  return n;
};

export function parseHtmlForTest(html: string): HNode {
  const root = element('body', {});
  const stack: Node[] = [root];
  const top = (): Node => stack[stack.length - 1]!;
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[5] !== undefined) {
      top().childNodes.push(textNode(decode(m[5])));
    } else if (m[1]) {
      const name = m[1].toLowerCase();
      const at = stack.map((s) => s.nodeName.toLowerCase()).lastIndexOf(name);
      if (at > 0) stack.length = at;
    } else if (m[2]) {
      const name = m[2].toLowerCase();
      const attrs: Record<string, string> = {};
      for (const a of m[3]!.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        attrs[a[1]!.toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      }
      const el = element(name, attrs);
      top().childNodes.push(el);
      if (RAW.has(name)) {
        const end = html.toLowerCase().indexOf(`</${name}`, re.lastIndex);
        const stop = end === -1 ? html.length : end;
        el.childNodes.push(textNode(html.slice(re.lastIndex, stop)));
        re.lastIndex = stop;
      } else if (!VOID.has(name) && m[4] !== '/') {
        stack.push(el);
      }
    }
  }
  return root;
}
