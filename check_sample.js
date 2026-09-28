import fs from "node:fs";
import { lastOf, openOf, numberOf } from "./sess.js";
import { step, close } from "./sessrun.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/streams.json", "utf8"));
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

emit("收尾后会话表 =", JSON.stringify(closed.state.open));
emit("收尾后封口清单 =", JSON.stringify(closed.state.sealed));
emit("收尾后上次表 =", JSON.stringify(closed.state.last));
emit("收尾后条数合计 =", total(closed.state));
emit("首轮处理条数 =", first.served);
emit("二档处理条数 =", wide.served);
emit("两个预算档处理不同 =", first.served !== wide.served);
emit("收尾前待处理账 =", first.ledger_before);
emit("压在账上的请求 =", JSON.stringify(first.ledger));
emit("收尾补齐条数 =", closed.catchup);
emit("拆两轮中间态不同 =", fingerprint(r2.state) !== fingerprint(first.state));
emit("拆两轮收尾态一致 =", fingerprint(closedTwo.state) === fingerprint(closed.state));
emit("重放新处理 =", replay.served);
emit("工作计数未超上界 =", first.judged <= first.judged_bound);
emit("与全量对照差异 =", fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [["u1", 0, 1, 5, 2]], sealed: [], last: [["u1", 5]], ledger: [], applied: [] },
    events: [{ id: 1, kind: "hit", user: "u1", at: 3 }] }));
  emit("时刻倒退报码", "没有报错");
} catch (error) {
  emit("时刻倒退报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [], sealed: [], last: [["u1", 5]], ledger: [], applied: [] },
    events: [{ id: 1, kind: "seal", user: "u1" }] }));
  emit("没有开着报码", "没有报错");
} catch (error) {
  emit("没有开着报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [], sealed: [], last: [], ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [["u1", 0, 1, 5, 2]], sealed: [], last: [["u1", 5]], ledger: [], applied: [] },
    events: [{ id: 1, kind: "hit", user: "u1", at: 3 }] }));
  emit("时刻倒退报码", "没有报错");
} catch (error) {
  emit("时刻倒退报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [], sealed: [], last: [["u1", 5]], ledger: [], applied: [] },
    events: [{ id: 1, kind: "seal", user: "u1" }] }));
  emit("没有开着报码", "没有报错");
} catch (error) {
  emit("没有开着报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, gap: 5,
    state: { open: [], sealed: [], last: [], ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "收尾后会话表": [
    [
      "u1",
      1,
      12,
      14,
      2
    ],
    [
      "u2",
      1,
      20,
      20,
      1
    ]
  ],
  "收尾后封口清单": [
    [
      "u1",
      0,
      1,
      4,
      2
    ],
    [
      "u2",
      0,
      2,
      2,
      1
    ]
  ],
  "收尾后上次表": [
    [
      "u1",
      14
    ],
    [
      "u2",
      20
    ]
  ],
  "收尾后条数合计": 6,
  "首轮处理条数": 3,
  "二档处理条数": 5,
  "两个预算档处理不同": true,
  "收尾前待处理账": 4,
  "压在账上的请求": [
    [
      "hit",
      "u1",
      12
    ],
    [
      "seal",
      "u2"
    ],
    [
      "hit",
      "u2",
      20
    ],
    [
      "hit",
      "u1",
      14
    ]
  ],
  "收尾补齐条数": 4,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "重放新处理": 0,
  "工作计数未超上界": true,
  "与全量对照差异": 0,
  "时刻倒退报码": "E_BAD_ORDER",
  "没有开着报码": "E_NO_OPEN",
  "事件不合法报码": "E_BAD_EVENT"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
