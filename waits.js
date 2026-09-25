// waits.js：等待图（等待者指向持锁者）与环检测

// 编号比较：数字感知的字典序（t2 < t10），保证旋转与排序确定性
export function compareIds(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function selfWaitError(wait) {
  const error = new Error("self wait: " + wait.who + " waits for " + wait.wants);
  error.code = "E_SELF_WAIT";
  return error;
}

// 环旋转到最小编号开头，表示唯一
function normalizeCycle(cycle) {
  let best = 0;
  for (let i = 1; i < cycle.length; i += 1) {
    if (compareIds(cycle[i], cycle[best]) < 0) best = i;
  }
  return cycle.slice(best).concat(cycle.slice(0, best));
}

export function findCycles(locks, waits) {
  const holder = {};
  for (const lock of locks) holder[lock.id] = lock.holder;

  // 邻接表：who -> 它等待的锁的持有者
  const edges = new Map();
  for (const wait of waits) {
    const target = holder[wait.wants];
    if (target === undefined || target === null) continue;
    if (target === wait.who) throw selfWaitError(wait);
    if (!edges.has(wait.who)) edges.set(wait.who, []);
    edges.get(wait.who).push(target);
  }

  // 迭代式三色 DFS：每条边最多访问一次，O(V+E)
  const color = new Map(); // 1=在栈上(灰) 2=已完成(黑)
  const cycles = [];
  const seen = new Set();

  for (const start of edges.keys()) {
    if (color.has(start)) continue;
    const stack = [start];
    const nextIndex = [0];
    const onPath = new Map([[start, 0]]);
    color.set(start, 1);
    while (stack.length > 0) {
      const node = stack[stack.length - 1];
      const adj = edges.get(node) || [];
      const i = nextIndex[nextIndex.length - 1];
      if (i >= adj.length) {
        color.set(node, 2);
        onPath.delete(node);
        stack.pop();
        nextIndex.pop();
        continue;
      }
      nextIndex[nextIndex.length - 1] = i + 1;
      const target = adj[i];
      const state = color.get(target) || 0;
      if (state === 0) {
        color.set(target, 1);
        onPath.set(target, stack.length);
        stack.push(target);
        nextIndex.push(0);
      } else if (state === 1) {
        const cycle = normalizeCycle(stack.slice(onPath.get(target)));
        const key = cycle.join("");
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      }
    }
  }

  cycles.sort((a, b) => compareIds(a[0], b[0]));
  return { cycles: cycles, holder: holder };
}
