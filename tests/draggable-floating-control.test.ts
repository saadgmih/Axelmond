import assert from "node:assert/strict";
import { clampFloatingControlPosition } from "../src/hooks/useDraggableFloatingControl.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("draggable-floating-control", () => {
  assert.deepEqual(clampFloatingControlPosition({ x: 12, y: 152 }, 400, 800), { x: 12, y: 152 });
  assert.deepEqual(clampFloatingControlPosition({ x: -20, y: 900 }, 400, 800), { x: 8, y: 768 });
  assert.deepEqual(clampFloatingControlPosition({ x: 999, y: 999 }, 320, 640), { x: 288, y: 608 });
});
