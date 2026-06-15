import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("virtual-list", () => {
  const source = readFileSync("src/components/VirtualList.tsx", "utf8");
  assert.match(source, /minItemsToVirtualize/);
  assert.match(source, /variableHeight/);
  assert.match(source, /ResizeObserver/);
});
