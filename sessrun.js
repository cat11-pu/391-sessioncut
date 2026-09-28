// sessrun.js：按处理预算处理事件，用尽后压在账上；收尾把账做完
import { lastOf, openOf, numberOf } from "./sess.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  return {
    open: (state.open || []).map((row) => row.slice()),
    sealed: (state.sealed || []).map((row) => row.slice()),
    last: (state.last || []).map((row) => row.slice()),
    ledger: (state.ledger || []).map((row) => row.slice()),
    applied: (state.applied || []).map((row) => row.slice())
  };
}

function insertUser(list, row) {
  let index = 0;
  while (index < list.length && list[index][0] < row[0]) index += 1;
  list.splice(index, 0, row);
}

function setLast(last, user, at) {
  for (const row of last) {
    if (row[0] === user) { row[1] = at; return; }
  }
  insertUser(last, [user, at]);
}

function tupleOf(event) {
  if (event && event.kind === "seal") return ["seal", event.user];
  return ["hit", event.user, event.at];
}

function eventOf(tuple) {
  if (tuple[0] === "seal") return { kind: "seal", user: tuple[1] };
  return { kind: "hit", user: tuple[1], at: tuple[2] };
}

function sameTuple(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function wasApplied(state, tuple) {
  return state.applied.some((row) => sameTuple(row, tuple));
}

// 只做结构校验：结构不合法报 E_BAD_EVENT、用户非空字符串报 E_BAD_USER、
// 时刻非负整数报 E_BAD_AT。
function validateShape(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail("E_BAD_EVENT", "event must be an object");
  }
  if (event.kind !== "hit" && event.kind !== "seal") {
    fail("E_BAD_EVENT", "event kind must be hit or seal");
  }
  if (typeof event.user !== "string" || event.user.length === 0) {
    fail("E_BAD_USER", "user must be a non-empty string");
  }
  if (event.kind === "hit") {
    if (typeof event.at !== "number" || !Number.isInteger(event.at) || event.at < 0) {
      fail("E_BAD_AT", "at must be a non-negative integer");
    }
  }
}

// 语义处理：按当前上次表判时刻倒退、按当前会话表判封口是否有开着的会话。
function serve(state, event, gap) {
  const tuple = tupleOf(event);
  if (wasApplied(state, tuple)) return 0;
  if (event.kind === "hit") {
    const user = event.user;
    const at = event.at;
    const previous = lastOf(state.last, user);
    if (previous >= 0 && at < previous) fail("E_BAD_ORDER", "at is earlier than last hit");
    const current = openOf(state.open, user);
    if (current.length > 0 && at - current[3] <= gap) {
      current[3] = at;
      current[4] += 1;
    } else {
      if (current.length > 0) {
        const atIndex = state.open.indexOf(current);
        state.open.splice(atIndex, 1);
        state.sealed.push(current.slice());
      }
      const number = numberOf(state.sealed, state.open, user);
      insertUser(state.open, [user, number, at, at, 1]);
    }
    setLast(state.last, user, at);
  } else {
    const current = openOf(state.open, event.user);
    if (current.length === 0) fail("E_NO_OPEN", "no open session to seal");
    const atIndex = state.open.indexOf(current);
    state.open.splice(atIndex, 1);
    state.sealed.push(current.slice());
  }
  state.applied.push(tuple);
  return 1;
}

export function step(spec) {
  const state = cloneState(spec.state || {});
  const events = spec.events || [];
  const budget = spec.budget == null ? 0 : spec.budget;
  const gap = spec.gap == null ? 0 : spec.gap;
  const entryLedger = state.ledger.length;

  let served = 0;
  let judged = 0;
  const bound = events.length + entryLedger;

  // 共享处理预算：先把压在账上的旧请求按 FIFO 做完，再处理新事件。
  const queue = state.ledger.map(eventOf).concat(events);
  state.ledger = [];
  for (const event of queue) {
    validateShape(event);
    const tuple = tupleOf(event);
    if (wasApplied(state, tuple)) continue;
    judged += 1;
    if (served >= budget) {
      state.ledger.push(tuple);
      continue;
    }
    served += serve(state, event, gap);
  }

  return {
    state,
    served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map((row) => row.slice()),
    judged,
    judged_bound: bound
  };
}

export function close(spec) {
  const state = cloneState(spec.state || {});
  const gap = spec.gap == null ? 0 : spec.gap;
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  while (pending.length > 0) {
    const tuple = pending.shift();
    const event = eventOf(tuple);
    validateShape(event);
    if (wasApplied(state, tuple)) continue;
    catchup += serve(state, event, gap);
  }
  return { state, catchup };
}
