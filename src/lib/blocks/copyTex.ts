// P14 插队（Ocean 2026-11-06）: copying text that holds a drawn formula.
//
// A formula on screen is KaTeX's glyphs, not its TeX — left alone, ⌘C would put 「x2+y2」 (or worse) on
// the clipboard, the very mangling this change is about. So when a copy covers a formula, the copied
// text gets the formula's own source back in its place (`data-tex`, set by ContentRuns), and an end that
// falls inside a formula takes the whole formula. A copy with no formula in it is left to the browser,
// exactly as before.

const TEX = '[data-tex]';

const texAncestor = (node: Node): Element | null =>
  (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest(TEX) ?? null;

/** The text a copy of `range` should put on the clipboard, or null when no formula is involved. */
export function copiedText(range: Range): string | null {
  const r = range.cloneRange();
  const startIn = texAncestor(r.startContainer);
  const endIn = texAncestor(r.endContainer);
  if (startIn) r.setStartBefore(startIn);
  if (endIn) r.setEndAfter(endIn);
  const fragment = r.cloneContents();
  const formulas = fragment.querySelectorAll(TEX);
  if (formulas.length === 0) return null;
  for (const el of formulas) {
    const tex = el.getAttribute('data-tex') ?? '';
    const display = tex.startsWith('\\[') || tex.startsWith('$$');
    el.replaceWith(document.createTextNode(display ? `\n${tex}\n` : tex));
  }
  // innerText, not textContent: it keeps the line breaks between paragraphs, list rows and table rows
  // the way a normal copy would. It only does that for an element that is laid out, hence the holder.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-100000px;top:0;white-space:pre-wrap;';
  holder.appendChild(fragment);
  document.body.appendChild(holder);
  const text = holder.innerText.replace(/\n{3,}/g, '\n\n');
  holder.remove();
  return text;
}

/** Listen on the main window; returns the function that stops listening. */
export function installCopyTex(): () => void {
  const onCopy = (e: ClipboardEvent): void => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !e.clipboardData) return;
    const text = copiedText(sel.getRangeAt(0));
    if (text == null) return;
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  };
  document.addEventListener('copy', onCopy);
  return () => document.removeEventListener('copy', onCopy);
}
