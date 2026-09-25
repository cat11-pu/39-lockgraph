// recover.js：回滚与推进（基线：不回滚、不推进）
export function recover(cycles, cost, locks, waits) {
  return { victim: null, released: [], granted: [], remaining: cycles.length };
}
