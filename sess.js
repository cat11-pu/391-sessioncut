// sess.js：上次时刻、开着会话与下一个会话号
export function lastOf(last, user) {
  for (const row of last || []) {
    if (row[0] === user) return row[1];
  }
  return -1;
}

export function openOf(open, user) {
  for (const row of open || []) {
    if (row[0] === user) return row;
  }
  return [];
}

export function numberOf(sealed, open, user) {
  let count = 0;
  for (const row of sealed || []) {
    if (row[0] === user) count += 1;
  }
  for (const row of open || []) {
    if (row[0] === user) count += 1;
  }
  return count;
}
