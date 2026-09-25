// recover.js：挑代价最小的环上事务回滚，释放其锁并按等待表顺序授予
import { findCycles } from "./waits.js";

export function recover(cycles, cost, locks, waits) {
  if (!cycles || cycles.length === 0) {
    return { victim: null, released: [], granted: [], remaining: 0, stable: true };
  }

  let victim = null;
  for (const ring of cycles) {
    for (const txn of ring) {
      if (victim === null
          || (cost[txn] ?? Infinity) < (cost[victim] ?? Infinity)
          || (((cost[txn] ?? Infinity) === (cost[victim] ?? Infinity)) && txn < victim)) {
        victim = txn;
      }
    }
  }

  const holders = new Map();
  const lockOrder = [];
  for (const lock of locks) {
    holders.set(lock.id, lock.holder);
    lockOrder.push(lock.id);
  }

  const released = lockOrder.filter((id) => holders.get(id) === victim).sort();
  for (const id of released) holders.set(id, null);

  const pending = waits.filter((wait) => wait.who !== victim);
  const granted = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let i = 0; i < pending.length; i++) {
      const wait = pending[i];
      if (wait === null) continue;
      if (!holders.has(wait.wants)) continue;
      if (holders.get(wait.wants) === null) {
        holders.set(wait.wants, wait.who);
        granted.push([wait.who, wait.wants]);
        pending[i] = null;
        progressed = true;
      }
    }
  }

  const locksAfter = lockOrder
    .filter((id) => holders.get(id) !== null)
    .map((id) => ({ id, holder: holders.get(id) }));
  const waitsAfter = pending.filter(
    (wait) => wait !== null && holders.get(wait.wants) !== wait.who
  );
  const { cycles: cyclesAfter } = findCycles(locksAfter, waitsAfter);

  return {
    victim,
    released,
    granted,
    remaining: cyclesAfter.length,
    stable: cyclesAfter.length === 0
  };
}
