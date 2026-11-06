import type { Attachment } from '@/lib/db/attachments';
import { attachmentLabel } from './assemble';
import { EXTRACT_CHAR_CAP } from './templates';

// P14 (H3, Ocean 2026-11-06): which of the project's files the pack a user COPIES does not carry in full,
// and why. PackDialog says it in one line (hover for the list) so 「复制」 is not mistaken for 「全带上了」 —
// 2026-11-04 T03: a pack listing three files, none of their text in it, and nothing on screen saying so.
//
// ⚠️ The same tests as assemble.ts renderProjectFile, because it describes that output: a replaced file is
// not in the pack at all; text goes in only when 「打包可读」 is ticked, cut at EXTRACT_CHAR_CAP. A folder is
// not a file with missing text. ⛔ Nothing here reads ai_access: this is the user's own copy.

export type FileGapReason = 'notInPack' | 'cut' | 'failed' | 'noText';

export interface FileGap {
  name: string;
  reason: FileGapReason;
}

export const packFileGaps = (attachments: readonly Attachment[]): FileGap[] =>
  attachments
    .filter((a) => a.supersededBy == null && a.kind === 'file')
    .flatMap((a): FileGap[] => {
      const name = attachmentLabel(a);
      if (a.extractedText != null) {
        if (!a.includeInPack) return [{ name, reason: 'notInPack' }];
        return a.extractedText.length > EXTRACT_CHAR_CAP ? [{ name, reason: 'cut' }] : [];
      }
      return [{ name, reason: a.extractionKind === 'failed' ? 'failed' : 'noText' }];
    });
