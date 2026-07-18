import { beforeEach, describe, expect, test, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("../src/db", () => ({
  prisma: {
    siteSetting: {
      findUnique: dbMocks.findUnique,
      upsert: dbMocks.upsert,
    },
  },
}));

describe("site settings cache", () => {
  beforeEach(() => {
    vi.resetModules();
    dbMocks.findUnique.mockReset();
    dbMocks.upsert.mockReset();
  });

  test("reuses the public setting without repeating the database query", async () => {
    dbMocks.findUnique.mockResolvedValue({ value: false });
    const settings = await import("../src/site-settings");

    await expect(settings.getSiteSettings()).resolves.toEqual({ forceDesktopMode: false });
    await expect(settings.getSiteSettings()).resolves.toEqual({ forceDesktopMode: false });

    expect(dbMocks.findUnique).toHaveBeenCalledOnce();
  });

  test("updates the cache immediately after an admin write", async () => {
    dbMocks.findUnique.mockResolvedValue({ value: false });
    dbMocks.upsert.mockResolvedValue({});
    const settings = await import("../src/site-settings");

    await expect(settings.setForceDesktopMode(true)).resolves.toEqual({ forceDesktopMode: true });
    await expect(settings.getSiteSettings()).resolves.toEqual({ forceDesktopMode: true });

    expect(dbMocks.upsert).toHaveBeenCalledOnce();
    expect(dbMocks.findUnique).not.toHaveBeenCalled();
  });
});
