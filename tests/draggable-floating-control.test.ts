import assert from "node:assert/strict";
import {
  clampFloatingControlPosition,
  floatingPointToNormalized,
  normalizedToFloatingPoint,
} from "../src/hooks/useDraggableFloatingControl.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("draggable-floating-control", () => {
  assert.deepEqual(clampFloatingControlPosition({ x: 12, y: 152 }, 400, 800), { x: 12, y: 152 });
  assert.deepEqual(clampFloatingControlPosition({ x: -20, y: 900 }, 400, 800), { x: 8, y: 768 });
  assert.deepEqual(clampFloatingControlPosition({ x: 999, y: 999 }, 320, 640), { x: 288, y: 608 });

  const normalized = floatingPointToNormalized({ x: 100, y: 200 }, 1000, 900);
  const restored = normalizedToFloatingPoint(normalized, 1000, 900);
  assert.ok(Math.abs(restored.x - 100) <= 1);
  assert.ok(Math.abs(restored.y - 200) <= 1);

  const phone = normalizedToFloatingPoint({ xRatio: 0.03, yRatio: 0.2 }, 390, 844);
  const desktop = normalizedToFloatingPoint({ xRatio: 0.03, yRatio: 0.2 }, 1440, 900);
  assert.ok(phone.x < desktop.x);
  assert.ok(phone.y < desktop.y);
});
