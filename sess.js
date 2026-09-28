// sess.js：上次时刻、开着会话与下一个会话号（基线：一律给负一与空表与零）
export function lastOf(last, user) {
  return -1;
}

export function openOf(open, user) {
  return [];
}

export function numberOf(sealed, open, user) {
  return 0;
}
