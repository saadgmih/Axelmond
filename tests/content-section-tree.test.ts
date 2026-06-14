import assert from "node:assert/strict";
import { collectDescendantSectionIds } from "../src/server/route-deps.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("content-section-tree", () => {
  const sections = [
    { id: "root", parentId: null },
    { id: "a", parentId: "root" },
    { id: "b", parentId: "root" },
    { id: "a1", parentId: "a" },
    { id: "a2", parentId: "a" },
    { id: "a1x", parentId: "a1" },
    { id: "orphan", parentId: "missing" },
  ];

  assert.deepEqual(collectDescendantSectionIds("root", sections), ["root", "a", "b", "a1", "a2", "a1x"]);

  assert.deepEqual(collectDescendantSectionIds("a", sections), ["a", "a1", "a2", "a1x"]);

  assert.deepEqual(collectDescendantSectionIds("b", sections), ["b"]);

  assert.deepEqual(collectDescendantSectionIds("missing", sections), ["missing", "orphan"]);
});
