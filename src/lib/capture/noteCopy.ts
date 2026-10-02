// P3-4 (2026-10-02, Ocean): a long-press made within 2s of a ⌘C opens with the copied text
// already in the body box, and the block it becomes is a capture — it gets a source.
//
// ⭐ What happens when the person edits that text: adding to it or trimming it keeps it the
// copy, with its source. Deleting ALL of it means what they save afterwards is their own
// writing, so the source goes — and stays gone even once they type again. (施工细节，
// Ocean 可以改。)

/** The card's copy id after an edit of the body box: kept while any text remains, gone for
 *  good once the box has been emptied. */
export const copyIdAfterEdit = (copyId: string | null, body: string): string | null =>
  copyId !== null && body.trim().length > 0 ? copyId : null;
