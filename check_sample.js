import fs from "node:fs";
import { findCycles } from "./waits.js";
import { recover } from "./recover.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/locks.json", "utf8"));
const graph = findCycles(spec.locks, spec.waits);
const plan = recover(graph.cycles, spec.cost || {}, spec.locks, spec.waits);
const out = render(spec);

emit("等待环 =", graph.cycles);
emit("被回滚的事务 =", plan.victim);
emit("释放的锁 =", plan.released);
emit("随后被授予的等待 =", plan.granted);
emit("处理后剩余环数 =", plan.remaining);
emit("重复处理是否稳定 =", plan.stable);
emit("自等待的错误码 =", spec.self_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "等待环": [
    [
      "t0",
      "t1",
      "t2"
    ]
  ],
  "被回滚的事务": "t1",
  "释放的锁": [
    "l1"
  ],
  "随后被授予的等待": [
    [
      "t0",
      "l1"
    ]
  ],
  "处理后剩余环数": 0,
  "重复处理是否稳定": true,
  "自等待的错误码": "E_SELF_WAIT"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
