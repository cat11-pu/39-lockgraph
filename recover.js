// recover.js：回滚与推进
import { findCycles, compareIds } from "./waits.js";

function plan(cycles, cost, locks, waits) {
  const holder = {};
  for (const lock of locks) holder[lock.id] = lock.holder;

  // 受害者：环上代价最小的事务，同代价按编号升序
  const members = new Set();
  for (const cycle of cycles) for (const tx of cycle) members.add(tx);
  let victim = null;
  if (members.size > 0) {
    victim = Array.from(members).sort(function (a, b) {
      const ca = cost[a] !== undefined && cost[a] !== null ? cost[a] : 0;
      const cb = cost[b] !== undefined && cost[b] !== null ? cost[b] : 0;
      if (ca !== cb) return ca < cb ? -1 : 1;
      return compareIds(a, b);
    })[0];
  }

  // 释放受害者持有的全部锁，按锁编号升序
  const released = locks
    .filter(function (lock) { return lock.holder === victim; })
    .map(function (lock) { return lock.id; })
    .sort(compareIds);

  const after = Object.assign({}, holder);
  for (const id of released) delete after[id];

  // 按等待表顺序授予能满足的等待；被授予的锁立即占用，不重复授予
  const granted = [];
  const stillWaiting = [];
  for (const wait of waits) {
    if (wait.who === victim) continue; // 受害者已回滚，丢弃其等待
    const current = after[wait.wants];
    if (victim !== null && (current === undefined || current === null)) {
      after[wait.wants] = wait.who;
      granted.push([wait.who, wait.wants]);
    } else {
      stillWaiting.push(wait);
    }
  }

  // 处理后状态复核：剩余等待图上不应再有环
  const postLocks = Object.keys(after).map(function (id) {
    return { id: id, holder: after[id] };
  });
  const postWaits = stillWaiting.filter(function (wait) {
    return after[wait.wants] !== wait.who;
  });
  const remaining = findCycles(postLocks, postWaits).cycles.length;

  return { victim: victim, released: released, granted: granted, remaining: remaining };
}

export function recover(cycles, cost, locks, waits) {
  const first = plan(cycles, cost, locks, waits);
  // 幂等性：同一输入独立重算一遍，受害者与后续处置必须完全一致
  const second = plan(findCycles(locks, waits).cycles, cost, locks, waits);
  const stable = JSON.stringify(first) === JSON.stringify(second);
  return { victim: first.victim, released: first.released, granted: first.granted,
           remaining: first.remaining, stable: stable };
}
