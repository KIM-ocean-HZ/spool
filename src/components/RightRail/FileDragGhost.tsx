import { useFileDragStore } from '@/stores/fileDragStore';

// What follows the cursor while a project file is carried onto a block (P5-2). Same reason
// RailDragGhost exists: the drag is pointer events (lib/files/fileDrag), so the browser draws
// nothing, and a drag with nothing under the cursor reads as 「没反应」.
//
// ⚠️ `pointer-events-none` is load-bearing: the drag hit-tests with elementFromPoint.
export default function FileDragGhost() {
  const attachmentId = useFileDragStore((s) => s.attachmentId);
  const label = useFileDragStore((s) => s.label);
  const x = useFileDragStore((s) => s.x);
  const y = useFileDragStore((s) => s.y);

  if (attachmentId == null) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-[220px] truncate rounded-md border border-accent/60 bg-paper px-2 py-1 text-xs text-ink shadow-[var(--shadow-card)]"
      style={{ left: x + 12, top: y + 10 }}
    >
      {label}
    </div>
  );
}
