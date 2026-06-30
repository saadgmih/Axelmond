import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const FORCE_DESKTOP_MODE_SETTING_KEY = "forceDesktopMode";

export interface SiteSettingsSnapshot {
  forceDesktopMode: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsSnapshot = {
  forceDesktopMode: false,
};

export class SiteSettingsPersistenceError extends Error {
  status = 503;

  constructor(message = "Les réglages du site ne sont pas encore disponibles") {
    super(message);
    this.name = "SiteSettingsPersistenceError";
  }
}

function readBooleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isMissingSiteSettingsStorageError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "P2021" || code === "P2022";
}

export async function getSiteSettings(): Promise<SiteSettingsSnapshot> {
  let forceDesktopModeSetting: { value: unknown } | null = null;
  try {
    forceDesktopModeSetting = await prisma.siteSetting.findUnique({
      where: { key: FORCE_DESKTOP_MODE_SETTING_KEY },
      select: { value: true },
    });
  } catch (err) {
    if (isMissingSiteSettingsStorageError(err)) return DEFAULT_SITE_SETTINGS;
    throw err;
  }

  return {
    forceDesktopMode: readBooleanSetting(forceDesktopModeSetting?.value, DEFAULT_SITE_SETTINGS.forceDesktopMode),
  };
}

export async function setForceDesktopMode(forceDesktopMode: boolean): Promise<SiteSettingsSnapshot> {
  try {
    await prisma.siteSetting.upsert({
      where: { key: FORCE_DESKTOP_MODE_SETTING_KEY },
      create: {
        key: FORCE_DESKTOP_MODE_SETTING_KEY,
        value: forceDesktopMode as Prisma.InputJsonValue,
      },
      update: {
        value: forceDesktopMode as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (isMissingSiteSettingsStorageError(err)) throw new SiteSettingsPersistenceError();
    throw err;
  }

  return getSiteSettings();
}
