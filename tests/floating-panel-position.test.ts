import assert from "node:assert/strict";
import { test } from "vitest";
import { computeFloatingPanelPosition } from "../src/utils/floating-panel-position";

const viewport = { viewportWidth: 390, viewportHeight: 844, padding: 16, gap: 8 };

test("computeFloatingPanelPosition keeps panel inside viewport horizontally", () => {
  const position = computeFloatingPanelPosition({
    ...viewport,
    triggerRect: { top: 40, right: 60, bottom: 80, left: 20 },
    panelWidth: 288,
    panelHeight: 260,
  });

  assert.ok(position.left >= 16);
  assert.ok(position.left + 288 <= 390 - 16);
});

test("computeFloatingPanelPosition flips above trigger when bottom overflow", () => {
  const position = computeFloatingPanelPosition({
    ...viewport,
    triggerRect: { top: 760, right: 360, bottom: 800, left: 320 },
    panelWidth: 288,
    panelHeight: 260,
  });

  assert.ok(position.top + 260 <= 844 - 16);
  assert.ok(position.top < 760);
});

test("computeFloatingPanelPosition clamps near bottom when no room above", () => {
  const position = computeFloatingPanelPosition({
    viewportWidth: 390,
    viewportHeight: 320,
    padding: 16,
    gap: 8,
    triggerRect: { top: 250, right: 360, bottom: 290, left: 320 },
    panelWidth: 288,
    panelHeight: 260,
  });

  assert.ok(position.top >= 16);
  assert.ok(position.top + 260 <= 320 - 16 || position.maxHeight !== undefined);
});

test("computeFloatingPanelPosition exposes maxHeight when vertical space is tight", () => {
  const position = computeFloatingPanelPosition({
    viewportWidth: 390,
    viewportHeight: 220,
    padding: 16,
    gap: 8,
    triggerRect: { top: 120, right: 360, bottom: 160, left: 320 },
    panelWidth: 288,
    panelHeight: 260,
  });

  assert.ok(position.maxHeight !== undefined);
  assert.ok(position.maxHeight! >= 120);
});
