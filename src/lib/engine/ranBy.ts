import { vendorName, vendorOfModel } from '@/lib/ai/vendors';
import type { EngineRun } from '@/lib/db/engineRuns';
import { ENGINE_LABEL, type EngineKind } from '@/stores/engineStore';

/** Who ran a past run, as the user knows it: the CLI on this machine by name, or the API vendor.
 *  DISCOVERED-20261112-8 (the 「用户不能看到测试环境的 Spool」 line): the record line used to show the
 *  model id and 「花费未知」 — neither is something the user can use. A CLI run goes on their own
 *  subscription, so it carries no cost at all; an API run shows one only when there is a real figure. */
export const ranBy = (
  run: Pick<EngineRun, 'engine' | 'usage'>,
  t: (key: string) => string,
): { who: string; viaCli: boolean } => {
  const cli = ENGINE_LABEL[run.engine as EngineKind];
  if (cli) return { who: cli, viaCli: true };
  const vendor = vendorOfModel(run.usage.model ?? run.engine);
  return { who: vendor ? vendorName(vendor, t) : 'API', viaCli: false };
};
