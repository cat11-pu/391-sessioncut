import assert from "node:assert";
import { lastOf, openOf, numberOf } from "../sess.js";
import { step, close } from "../sessrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, gap: 5,
  state: { open: [], sealed: [], last: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "hit", user: "u1", at: 1 }],
  bad_user_code: "E_BAD_USER", bad_at_code: "E_BAD_AT",
  order_code: "E_BAD_ORDER", no_open_code: "E_NO_OPEN",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("lastOf returns a number", () => {
  assert.strictEqual(typeof lastOf([["u1", 9]], "u1"), "number");
});

check("openOf returns a list", () => {
  assert.ok(Array.isArray(openOf([["u1", 0, 1, 9, 2]], "u1")));
});

check("numberOf returns a number", () => {
  assert.strictEqual(typeof numberOf([], [], "u1"), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
