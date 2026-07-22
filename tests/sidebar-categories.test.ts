import { describe, expect, it } from "vitest";
import { getSidebarNavGroups } from "../src/navigation/sidebar-config";

describe("sidebar navigation categories", () => {
  it("organizes the student navigation without duplicating an item", () => {
    const groups = getSidebarNavGroups("student", "STUDENT");
    const itemIds = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(groups.map((group) => group.label)).toEqual(["Études", "Mon compte", "Communication"]);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(itemIds).toHaveLength(8);
  });

  it("separates professor teaching tools from account and communication tools", () => {
    const groups = getSidebarNavGroups("teacher", "PROFESSOR");

    expect(groups.map((group) => group.label)).toEqual(["Pilotage", "Enseignement", "Mon compte", "Communication"]);
    expect(groups.flatMap((group) => group.items)).toHaveLength(8);
  });

  it("shows administration tools only to administrators", () => {
    const groups = getSidebarNavGroups("teacher", "ADMIN");
    const administration = groups.find((group) => group.id === "administration");

    expect(administration?.items.map((item) => item.id)).toEqual([
      "nav-professor-access-keys",
      "nav-center-payments",
      "nav-promo-codes",
    ]);
  });
});
