import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';
import {
  readClipboardText,
  readForegroundApp,
  type ForegroundApp,
} from '@/lib/capture/clipboard';
import { ingestCapture, ingestImageCapture, type ImageSource } from '@/lib/capture/ingest';
import { screenshotToTake, shotOf } from '@/lib/capture/shot';
import type { BlockImage } from '@/lib/db/blockImages';
import {
  clipboardChangedSinceShot,
  clipboardImageFiles,
  clipboardImageSize,
  findNewScreenshot,
  imageErrorMessage,
  imageThumb,
  screenshotGoesToClipboard,
} from '@/lib/images/blockImageIo';
import { BREAK_MS } from '@/lib/breakReminder';
import {
  OVERLAY_ACTION_EVENT,
  RAISE_MAIN_WINDOW_COMMAND,
  SHOW_OVERLAY_COMMAND,
  SHOW_OVERLAY_NOTICE_COMMAND,
  UPDATE_OVERLAY_SOURCE_COMMAND,
  type CaptureOverlayPayload,
  type OverlayAction,
  type OverlayNotice,
} from '@/lib/capture/overlayProtocol';
import { updateBlockSource } from '@/lib/db/blocks';
import { getCaptureTargetThread } from '@/lib/db/threads';
import { useBlocksStore } from '@/stores/blocksStore';
import { useBreakStore } from '@/stores/breakStore';
import { buildPreview, useCaptureStore } from '@/stores/captureStore';
import { useThreadsStore } from '@/stores/threadsStore';
import { toast } from '@/stores/toastStore';
import { buildCaptureUndo, useUndoStore } from '@/stores/undoStore';
import { useWorkspacesStore } from '@/stores/workspacesStore';
import { runRedo, runUndo } from '@/hooks/useUndo';
import { t } from '@/lib/i18n';

// Max wait in the *hot path* for the parallel foreground-app query. If osascript hasn't
// answered by then, we skip focus restoration this round — better to show the toast
// promptly than to delay it. After warm-up osascript typically responds in <30ms.
const FRONTMOST_HOT_PATH_MS = 80;
// Cap for the source-backfill consumer of the same query. Generous because backfill
// runs off the hot path; if osascript hangs, we just leave source=null. Sized for the
// two sequential osascript calls (frontmost process, then browser tab title).
const FRONTMOST_BACKFILL_MS = 2200;
const CLIPBOARD_RETRY_DELAYS_MS = [120, 240]; // up to 3 attempts total

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const readClipboardWithRetry = async (): Promise<string> => {
  const first = await readClipboardText();
  if (first) return first;
  for (const delay of CLIPBOARD_RETRY_DELAYS_MS) {
    await sleep(delay);
    const next = await readClipboardText();
    if (next) return next;
  }
  return '';
};

// ⭐ P3-4: the source of a long-press card that opened with copied text, looked up at the
// long-press moment and kept under the card's copyId until the card saves (`note-created`).
// Keyed per card, not "the latest one": a second long-press can land before the first card's
// save arrives, and that save must not pick up the second card's source.
// Small and bounded — a discarded card never comes back for its entry.
const copySources = new Map<string, Promise<string | null>>();
const COPY_SOURCES_KEPT = 8;
let copySeq = 0;

const DEV = import.meta.env.DEV;
const tlog = (label: string, t0: number, extra?: string): void => {
  if (!DEV) return;
  const dt = Math.round(performance.now() - t0);
  console.info(`[capture] ${label} +${dt}ms${extra ? ` ${extra}` : ''}`);
};

const showNoticeInOverlay = (payload: OverlayNotice): void => {
  void invoke(SHOW_OVERLAY_NOTICE_COMMAND, { payload }).catch((e) => {
    console.error('[capture] show_capture_notice failed', e, 'notice was:', payload);
  });
};

const applyOverlayAction = (action: OverlayAction): void => {
  // 休息提醒 (Ocean 2026-08-22): the user clicked the break card floating over whatever they
  // were in. Two steps, in this order — the window first, the lock second, so the five
  // minutes begin on a screen the user is already looking at rather than behind it.
  //
  // ⚠️ This is the ONE place the main window comes forward on its own initiative, and it is
  // not its own initiative: it is one click behind a card that says 「点一下回到 Spool」.
  // ⛔ Do not reuse `raise_main_window` anywhere else without re-reading capture-note-first —
  // 「主窗永不跳前」 is a standing rule and this is an exception the user performs, not one the
  // product takes.
  if (action.kind === 'break-open') {
    void invoke(RAISE_MAIN_WINDOW_COMMAND).catch((e) => {
      // The lock still goes up: a break the user asked for should happen even if the window
      // could not be raised, and they can find it themselves. Failing silently would leave
      // the click doing nothing at all, which reads as a broken card.
      console.warn('[break] raise_main_window failed', e);
    });
    useBreakStore.getState().lock(Date.now() + BREAK_MS);
    return;
  }
  // Declined. The streak is already zero (the reducer reset it when it fired), so there is
  // nothing to do but let it be — no re-prompt, no snooze queue. Saying it once is the whole
  // of the 「quiet」 rule; a card that comes back is one people learn to close unread.
  if (action.kind === 'break-skip') {
    useBreakStore.getState().unlock();
    return;
  }
  // ⭐ 长按 ⌥ 写完的那一条（2026-08-27）。库已经由浮窗写好了（走 DB 桥的 createBlock），
  // 这里只做主窗这边的三件事：并进 store、能撤销、在项目里闪一下。
  // ⚠️ 和捕捉那条路的顺序**反过来**：那边是先落库再弹窗，这边是先弹窗、写完了才落库
  // （理由见 overlayProtocol 的 `noteMode`）。
  if (action.kind === 'note-created') {
    useBlocksStore.setState((s) => ({
      byThread: {
        ...s.byThread,
        [action.threadId]: [...(s.byThread[action.threadId] ?? []), action.block],
      },
    }));
    useUndoStore.getState().pushUndo(
      buildCaptureUndo({
        blockId: action.block.id,
        threadId: action.threadId,
        content: action.block.content,
      }),
    );
    useCaptureStore.getState().setFlash(action.threadId, action.block.id);
    useCaptureStore.getState().noteCapture(action.block.id);
    void useThreadsStore.getState().patch(action.threadId, {});
    // P3-4: the body is still the copied text ⇒ it is a capture, and gets the source that was
    // looked up when the long-press fired. Saved first, filled in here — the double-tap shape.
    const pendingSource = action.copyId ? copySources.get(action.copyId) : undefined;
    if (action.copyId) copySources.delete(action.copyId);
    if (pendingSource) {
      const { id: blockId } = action.block;
      const { threadId } = action;
      void (async () => {
        const source = await pendingSource;
        if (!source) return;
        try {
          await updateBlockSource(blockId, source);
        } catch (e) {
          console.warn('note source backfill failed', e);
          return;
        }
        useBlocksStore.setState((s) => {
          const list = s.byThread[threadId];
          if (!list) return s;
          return {
            byThread: {
              ...s.byThread,
              [threadId]: list.map((b) => (b.id === blockId ? { ...b, source } : b)),
            },
          };
        });
      })();
    }
    return;
  }
  if (action.kind === 'undo') {
    // §9.13: the capture toast's Undo and Cmd+Z hit the SAME machinery. The overlay no
    // longer deletes the block itself — it asks the main window to run undoStore.undo(),
    // which reverses the op, refreshes blocksStore, and replaces the toast with the undo
    // confirmation card (shown in the overlay, over the user's current window).
    void runUndo();
    return;
  }
  if (action.kind === 'redo') {
    // §9.13: 重做 button on the undo-confirmation card → re-apply the last undone op.
    void runRedo();
    return;
  }
  if (action.kind === 'redirect') {
    useBlocksStore.setState((s) => {
      const oldList = s.byThread[action.oldThreadId] ?? [];
      const newList = s.byThread[action.targetThreadId] ?? [];
      return {
        byThread: {
          ...s.byThread,
          [action.oldThreadId]: oldList.filter((b) => b.id !== action.oldBlockId),
          [action.targetThreadId]: [...newList, action.newBlock],
        },
      };
    });
    // §9.13: the capture undo entry still points at the OLD block id, which redirect just
    // deleted — Cmd+Z would "succeed" against a nonexistent row and leave the real block.
    // Retarget the ring: drop entries for the old block, record the new one as the capture.
    useUndoStore.getState().invalidateForBlock(action.oldBlockId);
    useUndoStore.getState().pushUndo(
      buildCaptureUndo({
        blockId: action.newBlock.id,
        threadId: action.targetThreadId,
        content: action.newBlock.content,
      }),
    );
    void useThreadsStore.getState().patch(action.targetThreadId, {});
    return;
  }
  if (action.kind === 'suggestion-move') {
    // The DB reparent already happened in the overlay; mirror it into the stores.
    // Main holds the full Block under the old thread, so we just move that object.
    useBlocksStore.setState((s) => {
      const oldList = s.byThread[action.oldThreadId] ?? [];
      const moved = oldList.find((b) => b.id === action.blockId);
      const newList = s.byThread[action.newThreadId] ?? [];
      return {
        byThread: {
          ...s.byThread,
          [action.oldThreadId]: oldList.filter((b) => b.id !== action.blockId),
          [action.newThreadId]: moved
            ? [...newList, { ...moved, threadId: action.newThreadId }]
            : newList,
        },
      };
    });
    void useThreadsStore.getState().patch(action.newThreadId, {});
    useCaptureStore.getState().setFlash(action.newThreadId, action.blockId);
    return;
  }
  if (action.kind === 'pin') {
    // v2.8 §20.6: pin toggled from the expanded capture toast. DB write done in overlay.
    useBlocksStore.setState((s) => {
      const list = s.byThread[action.threadId];
      if (!list) return s;
      return {
        byThread: {
          ...s.byThread,
          [action.threadId]: list.map((b) =>
            b.id === action.blockId ? { ...b, pinned: action.pinned } : b,
          ),
        },
      };
    });
    return;
  }
  if (action.kind === 'annotate') {
    // v2.8 §20.6: annotation written from the expanded capture toast. DB write done in overlay.
    useBlocksStore.setState((s) => {
      const list = s.byThread[action.threadId];
      if (!list) return s;
      return {
        byThread: {
          ...s.byThread,
          [action.threadId]: list.map((b) =>
            b.id === action.blockId ? { ...b, annotation: action.annotation } : b,
          ),
        },
      };
    });
  }
};

export function useCapture(): void {
  const inFlightRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const dispose = await listen<unknown>('capture-trigger', async (e) => {
        const t0 = performance.now();
        // Payload `true` marks the user-bound global-shortcut path (set in lib.rs; no
        // default binding since 2026-07-07); a unit/null payload is the double-tap ⌥
        // path (double_tap.rs).
        const viaShortcut = e.payload === true;
        if (DEV) console.info('[capture] trigger', viaShortcut ? '(shortcut)' : '(⌥⌥)');
        if (inFlightRef.current) {
          if (DEV) console.info('[capture] drop: previous handler still running');
          return;
        }
        inFlightRef.current = true;
        // Start the foreground-app query in parallel with clipboard read & DB write —
        // by the time we're ready to invoke show, this is usually already resolved.
        // Single shared promise, consumed twice (hot-path for focus restore, slow-path
        // for source backfill), so we only spawn osascript once per capture.
        const frontmostPromise: Promise<ForegroundApp | null> = readForegroundApp();
        try {
          // ⭐ P7-7（Ocean 2026-09-30 §9.2 第 11 条：截完图直接双击 ⌥ 就能捕到）—— 一张图片也能捕。
          //   · ⌘⇧4 / ⌘⇧3（存成文件）：等那张截图写出来（右下角缩略图挂着时大约 5 秒），读它。
          //   · ⌃⌘⇧4 这类进剪贴板的截图：先拿剪贴板里的图 —— 剪贴板上要是还有字，那是更早的事。
          //   · 别的（⌘C 打开的闸）：照旧先拿字；没有字、剪贴板里是图片，才捕这张图。
          // 2026-10-18：截图之后又按了 ⌘C —— 那下 ⌘C 带来了新东西才捕字（shot.ts）。
          const shot = await screenshotToTake(shotOf(e.payload), clipboardChangedSinceShot);
          const shotToFile =
            shot !== null &&
            (shot.kind === 'file' || (shot.kind === 'toolbar' && !(await screenshotGoesToClipboard())));
          const pictureFirst = shot !== null && !shotToFile;
          // ⭐ P7 验收第一轮（Ocean 2026-10-08 第 2 条）：在访达里 ⌘C 一个图片文件，剪贴板上是那个
          // 文件的链接 + 文件名这段字 —— 以前先拿字，存下来的只有文件名。⇒ 有图片文件就先拿文件。
          const copiedFiles = shotToFile ? [] : await clipboardImageFiles();
          let text = pictureFirst || shotToFile || copiedFiles.length > 0 ? '' : await readClipboardWithRetry();
          let image: ImageSource | null = copiedFiles.length > 0 ? { kind: 'paths', paths: copiedFiles } : null;
          if (shotToFile) {
            showNoticeInOverlay({ kind: 'shot-waiting' });
            let path: string | null;
            try {
              path = await findNewScreenshot(shot.atMs);
            } catch (err) {
              const denied = String(err) === 'denied';
              showNoticeInOverlay(
                denied ? { kind: 'shot-denied' } : { kind: 'error', msg: t('捕捉失败：{msg}', { msg: String(err) }) },
              );
              return;
            }
            if (!path) {
              showNoticeInOverlay({ kind: 'shot-missing' });
              return;
            }
            image = { kind: 'paths', paths: [path] };
          } else if (!text && !image) {
            if (await clipboardImageSize()) image = { kind: 'clipboard' };
            else if (pictureFirst) text = await readClipboardWithRetry();
          }
          tlog('clipboard read', t0, image ? `image=${image.kind}` : `len=${text.length}`);
          if (!image && !text) {
            showNoticeInOverlay({ kind: 'empty' });
            return;
          }

          let images: BlockImage[] = [];
          let result: Awaited<ReturnType<typeof ingestCapture>>;
          if (image) {
            try {
              const r = await ingestImageCapture(image, null);
              result = r;
              images = r?.images ?? [];
            } catch (err) {
              showNoticeInOverlay({ kind: 'error', msg: imageErrorMessage(err) });
              return;
            }
          } else {
            result = await ingestCapture(text, null);
          }
          tlog('block insert', t0);
          if (!result) {
            showNoticeInOverlay({ kind: 'no-target' });
            return;
          }
          // What the card and the undo card say about it: the text, or — for a picture — its size.
          const shown =
            images.length > 0
              ? t('一张图片（{w}×{h}）', { w: images[0]!.width, h: images[0]!.height })
              : text;

          useBlocksStore.setState((s) => ({
            byThread: {
              ...s.byThread,
              [result.threadId]: [...(s.byThread[result.threadId] ?? []), result.block],
            },
            imagesByBlock: images.length > 0 ? { ...s.imagesByBlock, [result.block.id]: images } : s.imagesByBlock,
          }));

          // §9.13: record the capture so Cmd+Z (and the toast's Undo, which now routes
          // through the same undoStore) can delete the block. Pushed here in the main
          // window — the capture DB write happens here, not in the overlay.
          useUndoStore.getState().pushUndo(
            buildCaptureUndo({
              blockId: result.block.id,
              threadId: result.threadId,
              content: shown,
            }),
          );

          const ws = useWorkspacesStore
            .getState()
            .workspaces.find((w) => w.id === result.workspaceId);

          useCaptureStore.getState().setFlash(result.threadId, result.block.id);
          // 拍板点 5: first capture ever on a fresh install → arm the one-time closing
          // line under that block. No-op on every later capture and on every library
          // that predates the flag.
          useCaptureStore.getState().noteCapture(result.block.id);

          // Wait briefly for the frontmost query so Rust can re-activate that app
          // after show(). If it hasn't answered yet, ship the show without — better
          // toast latency than focus restoration on this one capture.
          const frontmostHot = await Promise.race([
            frontmostPromise,
            sleep(FRONTMOST_HOT_PATH_MS).then(() => null),
          ]);
          const prevSourceApp = frontmostHot?.app ?? null;
          tlog('frontmost (hot)', t0, `app=${prevSourceApp ?? '<timeout>'}`);

          const payload: CaptureOverlayPayload = {
            blockId: result.block.id,
            threadId: result.threadId,
            workspaceId: result.workspaceId,
            workspaceTitle: ws?.title.trim() || t('收件箱'),
            threadTitle: result.threadTitle.trim() || t('未命名'),
            preview: buildPreview(shown),
            // 图文混排：a picture block's text is its picture lines — 改投 writes it again as is.
            fullContent: images.length > 0 ? result.block.content : text,
            // 第 1 条：what was saved, and which picture the card's 「+ 图片注释」 is for.
            ...(images.length > 0
              ? {
                  image: {
                    thumb: await imageThumb(images[0]!.id).catch(() => null),
                    count: images.length,
                    captionFor: images.length === 1 ? images[0]!.id : null,
                  },
                }
              : {}),
            source: null,
            prevSourceApp,
          };
          void invoke(SHOW_OVERLAY_COMMAND, { payload }).catch((e) => {
            console.error('[capture] show_capture_overlay failed', e);
          });
          tlog('overlay shown', t0);

          void useThreadsStore.getState().patch(result.threadId, {});

          // Async backfill of source. Reuses the same frontmostPromise — the osascript
          // call already started in parallel, this just waits longer for it.
          void (async () => {
            const frontmost = await Promise.race([
              frontmostPromise,
              sleep(FRONTMOST_BACKFILL_MS).then(() => null),
            ]);
            const source = frontmost?.source ?? null;
            if (!source) return;
            try {
              await updateBlockSource(result.block.id, source);
            } catch (e) {
              console.warn('source backfill failed', e);
              return;
            }
            useBlocksStore.setState((s) => {
              const list = s.byThread[result.threadId];
              if (!list) return s;
              return {
                byThread: {
                  ...s.byThread,
                  [result.threadId]: list.map((b) =>
                    b.id === result.block.id ? { ...b, source } : b,
                  ),
                },
              };
            });
            void invoke(UPDATE_OVERLAY_SOURCE_COMMAND, {
              blockId: result.block.id,
              source,
            }).catch((e) => console.warn('update_overlay_source failed', e));
          })();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[capture] failed', e);
          showNoticeInOverlay({ kind: 'error', msg: t('捕捉失败：{msg}', { msg }) });
        } finally {
          inFlightRef.current = false;
          if (DEV) console.info('[capture] finally: inFlight cleared');
        }
      });
      if (cancelled) {
        dispose();
      } else {
        unlisten = dispose;
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  // ⭐⭐ 长按 ⌥ —— 直接写一条笔记（2026-08-27，Ocean）。
  //
  // ⚠️ 这一路**不落库**：它只是把浮窗弹出来，正文等人写。真正的写入在浮窗那边
  // （`note-created`）。⛔ 别在这里先存一个空块——按 Esc 就成了库里一条空记录。
  // （P3-4 起：长按之前 2 秒内按过 ⌘C 才读剪贴板，把那段字先填进正文框。）
  // ⚠️ `getCaptureTargetThread()` 和捕捉走的是同一个「当前捕捉项目」，⛔ 不是「屏幕上开着
  // 的那个项目」：长按多半发生在别的 app 里，那时候屏幕上开着什么都不相干。
  // 红线：主窗永不跳前（记忆 capture-note-first）—— 这里一次 `raise_main_window` 都没有。
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const dispose = await listen<{ copied?: boolean } | null>('note-trigger', async (e) => {
        // P3-4: Rust decided once, at the ⌥ press, whether a ⌘C/⌘X came within 2s before it.
        // ⛔ No second clock here.
        const copied = e.payload?.copied === true;
        if (DEV) console.info('[capture] note-trigger (长按 ⌥)', copied ? '(⌘C ≤2s)' : '');
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        // Started first, for the same reason as the capture path: once the card is up and
        // has the foreground, the question would only ever answer "Spool".
        const frontmostPromise: Promise<ForegroundApp | null> = readForegroundApp();
        try {
          const target = await getCaptureTargetThread();
          if (!target) {
            showNoticeInOverlay({ kind: 'no-target' });
            return;
          }
          const ws = useWorkspacesStore
            .getState()
            .workspaces.find((w) => w.id === target.workspaceId);
          // ⭐ P3-4：刚复制过 ⇒ 正文框先填好那段字（和双击同一个读法）。剪贴板空着 ⇒ 照旧空框。
          const copiedText = copied ? await readClipboardWithRetry() : '';
          let copyId: string | undefined;
          if (copiedText) {
            copyId = String(++copySeq);
            copySources.set(
              copyId,
              Promise.race([
                frontmostPromise.then((f) => f?.source ?? null),
                sleep(FRONTMOST_BACKFILL_MS).then(() => null),
              ]),
            );
            while (copySources.size > COPY_SOURCES_KEPT) {
              copySources.delete(copySources.keys().next().value as string);
            }
          }
          const frontmost = await Promise.race([
            frontmostPromise,
            sleep(FRONTMOST_HOT_PATH_MS).then(() => null),
          ]);
          const payload: CaptureOverlayPayload = {
            // ⚠️ 空串 = 还没有这一块。浮窗写完了才 createBlock。
            blockId: '',
            threadId: target.id,
            workspaceId: target.workspaceId,
            workspaceTitle: ws?.title.trim() || t('收件箱'),
            threadTitle: target.title.trim() || t('未命名'),
            preview: '',
            fullContent: copiedText,
            // ⛔ 来源留空 —— 自己写的那一条，pack 里就该落在 💭 Personal。
            // 带着复制的字的那一条，存完由上面 note-created 那一支回填（P3-4）。
            source: null,
            prevSourceApp: frontmost?.app ?? null,
            noteMode: true,
            ...(copyId ? { copyId } : {}),
          };
          await invoke(SHOW_OVERLAY_COMMAND, { payload });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[capture] note-trigger failed', e);
          showNoticeInOverlay({ kind: 'error', msg: t('捕捉失败：{msg}', { msg }) });
        } finally {
          inFlightRef.current = false;
        }
      });
      if (cancelled) dispose();
      else unlisten = dispose;
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const dispose = await listen<OverlayAction>(OVERLAY_ACTION_EVENT, (e) => {
        applyOverlayAction(e.payload);
      });
      if (cancelled) dispose();
      else unlisten = dispose;
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  // §9.13: Rust emits `undo-trigger` when the global undo shortcut fires (registered only
  // while a toast is up). Run the same reversal as Cmd+Z / the toast's Undo button —
  // runUndo replaces the capture toast with the undo-confirmation card in the overlay, so
  // the user gets feedback over their current window without switching back to Spool.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const dispose = await listen('undo-trigger', () => {
        void runUndo();
      });
      if (cancelled) dispose();
      else unlisten = dispose;
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  // §19.4: Rust emits `capture-disabled` when macOS has disabled the CGEventTap
  // and the in-place self-heal didn't stick. Surface a one-time notice so the user
  // knows to restart Spool; a user-bound capture shortcut keeps working meanwhile.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const dispose = await listen('capture-disabled', () => {
        toast.error(t('双击 ⌥ 捕捉已停止 — 请重启 Spool 重新启用。'));
      });
      if (cancelled) dispose();
      else unlisten = dispose;
    })();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);
}
