// sessrun.js：按处理预算处理并留账（基线：一律给空状态）
import { lastOf, openOf, numberOf } from "./sess.js";

export function step(spec) {
  return { state: spec.state, served: 0, ledger_before: 0, ledger: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
