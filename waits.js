// waits.js：等待图（等待者 -> 持锁者）上的环检测
export const SELF_WAIT_CODE = "E_SELF_WAIT";

export function findCycles(locks, waits) {
  const holder = {};
  for (const lock of locks) holder[lock.id] = lock.holder;

  const adjacency = new Map();
  const nodeSet = new Set();
  for (const wait of waits) {
    const owner = holder[wait.wants];
    if (owner === wait.who) {
      const error = new Error(SELF_WAIT_CODE);
      error.code = SELF_WAIT_CODE;
      throw error;
    }
    if (owner === undefined || owner === null) continue;
    nodeSet.add(wait.who);
    nodeSet.add(owner);
    if (!adjacency.has(wait.who)) adjacency.set(wait.who, []);
    adjacency.get(wait.who).push(owner);
  }

  const color = new Map();
  for (const node of nodeSet) color.set(node, 0);

  const seen = new Set();
  const cycles = [];

  // 迭代式三色 DFS：每条边在单次遍历中至多检查一次（O(V+E)，不枚举路径）。
  for (const start of [...nodeSet].sort()) {
    if (color.get(start) !== 0) continue;
    color.set(start, 1);
    const stack = [[start, 0]];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const node = frame[0];
      const neighbors = adjacency.get(node);
      if (neighbors && frame[1] < neighbors.length) {
        const next = neighbors[frame[1]++];
        const nextColor = color.get(next);
        if (nextColor === 0) {
          color.set(next, 1);
          stack.push([next, 0]);
        } else if (nextColor === 1) {
          const index = stack.findIndex((item) => item[0] === next);
          const ring = stack.slice(index).map((item) => item[0]);
          const anchor = ring.indexOf([...ring].sort()[0]);
          const rotated = ring.slice(anchor).concat(ring.slice(0, anchor));
          const key = rotated.join(" ");
          if (!seen.has(key)) {
            seen.add(key);
            cycles.push(rotated);
          }
        }
      } else {
        color.set(node, 2);
        stack.pop();
      }
    }
  }

  cycles.sort((a, b) => {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return a.length - b.length;
  });

  return { cycles, holder };
}
