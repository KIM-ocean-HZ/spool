// P14 hotfix (Ocean 2026-11-06): 「禁止出现因为捕捉大量文字导致崩溃的情况，如果无法防止大量文字渲染造成的崩溃，就直接
// 反馈用户捕捉失败，文字太多导致渲染过载，把上限定高一点」.
//
// The renderer is linear now (contentRuns.tsx); measured on this Mac, a block of 1.2 million characters drew
// in 0.33 s (React) + 0.56 s (WebKit layout), 600 thousand in 0.16 s + 0.33 s. The cap is set well above
// the largest real capture (161,830 characters, from Notes) and well below where a draw stops being quick.
// Over it, nothing is saved and the card says why — never a block that freezes the window.
export const MAX_CAPTURE_CHARS = 500_000;

/** The capture card shows two lines; drawing a whole huge capture for them is waste. Its first part only,
 *  cut at a line end. */
export const CARD_PREVIEW_CHARS = 1500;

export const cardPreview = (content: string): string => {
  if (content.length <= CARD_PREVIEW_CHARS) return content;
  const cut = content.lastIndexOf('\n', CARD_PREVIEW_CHARS);
  return content.slice(0, cut > CARD_PREVIEW_CHARS / 2 ? cut : CARD_PREVIEW_CHARS);
};
