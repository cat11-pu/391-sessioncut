// app.js：渲染结果
import { lastOf, openOf, numberOf } from "./sess.js";
import { step, close } from "./sessrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const total = function (state) {
    let sum = 0;
    for (const row of state.open) { sum += row[4]; }
    for (const row of state.sealed) { sum += row[4]; }
    return sum;
  };
  const fingerprint = function (state) {
    return JSON.stringify({
      open: state.open, sealed: state.sealed, last: state.last, hits: total(state),
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { open: closed.state.open.map(function (row) { return [row[0], row[1], row[2], row[3], row[4]]; }),
           sealed: closed.state.sealed.map(function (row) { return [row[0], row[1], row[2], row[3], row[4]]; }),
           last: closed.state.last.map(function (row) { return [row[0], row[1]]; }),
           hits: total(closed.state),
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count_events: events.length,
           tail: lastOf([["u1", 9]], "u1") + openOf([["u1", 0, 1, 9, 2]], "u1").length
             + numberOf([["u1", 0, 1, 9, 2]], [], "u1") };
}
