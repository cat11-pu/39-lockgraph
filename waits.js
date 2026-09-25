// waits.js：等待图（基线：只看直接互等）
export function findCycles(locks, waits) {
  const holder = {};
  for (const lock of locks) holder[lock.id] = lock.holder;
  const cycles = [];
  for (const wait of waits) {
    const other = waits.find((item) => item.who === holder[wait.wants] && item.wants === (Object.keys(holder).find((key) => holder[key] === wait.who)));
    if (other) cycles.push([wait.who, other.who]);
  }
  return { cycles: cycles, holder: holder };
}
