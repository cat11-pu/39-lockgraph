import assert from "node:assert";
import { findCycles } from "../waits.js";
import { recover } from "../recover.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const locks = [{ id: "l0", holder: "t0" }, { id: "l1", holder: "t1" }];
const waits = [{ who: "t0", wants: "l1" }, { who: "t1", wants: "l0" }];

check("findCycles returns cycle list", () => {
  assert.ok(Array.isArray(findCycles(locks, waits).cycles));
});

check("findCycles returns holder map", () => {
  assert.strictEqual(typeof findCycles(locks, waits).holder, "object");
});

check("recover reports remaining count", () => {
  assert.strictEqual(typeof recover([], {}, locks, waits).remaining, "number");
});

check("recover reports released list", () => {
  assert.ok(Array.isArray(recover([], {}, locks, waits).released));
});

check("render exposes victim", () => {
  assert.ok("victim" in render({ locks: locks, waits: waits, cost: {} }));
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
