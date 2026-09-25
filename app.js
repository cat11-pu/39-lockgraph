// app.js：渲染结果
import { findCycles } from "./waits.js";
import { recover } from "./recover.js";

export function render(spec) {
  const graph = findCycles(spec.locks, spec.waits);
  const plan = recover(graph.cycles, spec.cost || {}, spec.locks, spec.waits);
  return { cycles: graph.cycles, victim: plan.victim, released: plan.released,
           granted: plan.granted, remaining: plan.remaining, stable: plan.stable };
}
