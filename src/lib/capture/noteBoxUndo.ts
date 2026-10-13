// What ⌘Z does in a capture card's note box (CaptureOverlay).
//
// Ocean 2026-08-15 picked 丙 for the double-tap card: with text in the box ⌘Z is the ordinary
// "undo my typing"; with the box empty it means the capture. P9F F4 (Ocean 2026-10-11 #81, 甲):
// the long-press card has no capture yet — nothing is saved until 完成 — so an empty box there
// would undo whatever happened before (an earlier capture, a delete…) and the half-written card
// would go with it. On that card an empty box's ⌘Z does nothing. Rust keeps the global ⌘Z off
// that card for the same reason (capture.rs `card_claims_undo`).
export type NoteBoxUndo = 'typing' | 'capture' | 'nothing';

export const noteBoxUndo = (hasText: boolean, longPressCard: boolean): NoteBoxUndo =>
  hasText ? 'typing' : longPressCard ? 'nothing' : 'capture';
