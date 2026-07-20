import { prisma } from "../db";

export interface VideoIntroConfig {
  introAssetId: string;
  introVersion: number;
  introFilePathLandscape: string;
  introFilePathPortrait: string;
  introDuration: number;
  introEnabled: boolean;
}

/**
 * Branding is available on every supported runtime because the application
 * ships its own ffmpeg and ffprobe binaries. VIDEO_BRANDING_DISABLED remains
 * an explicit emergency switch, independent of the hosting provider.
 */
export function shouldQueueVideoBranding(
  config: Pick<VideoIntroConfig, "introEnabled">,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!config.introEnabled) return false;
  if (env.VIDEO_BRANDING_DISABLED === "true") return false;
  return true;
}

export const DEFAULT_VIDEO_INTRO_CONFIG: VideoIntroConfig = {
  introAssetId: "performance-academique-animated",
  introVersion: 2,
  introFilePathLandscape: "videos/intros/intro-landscape.mp4",
  introFilePathPortrait: "videos/intros/intro-portrait.mp4",
  introDuration: 5.0,
  introEnabled: true,
};

const CONFIG_KEY = "video-branding-config";

function mergeWithDefaults(value: Partial<VideoIntroConfig>): VideoIntroConfig {
  return {
    introAssetId: value.introAssetId ?? DEFAULT_VIDEO_INTRO_CONFIG.introAssetId,
    introVersion: value.introVersion ?? DEFAULT_VIDEO_INTRO_CONFIG.introVersion,
    introFilePathLandscape: value.introFilePathLandscape ?? DEFAULT_VIDEO_INTRO_CONFIG.introFilePathLandscape,
    introFilePathPortrait: value.introFilePathPortrait ?? DEFAULT_VIDEO_INTRO_CONFIG.introFilePathPortrait,
    introDuration: value.introDuration ?? DEFAULT_VIDEO_INTRO_CONFIG.introDuration,
    introEnabled: value.introEnabled ?? DEFAULT_VIDEO_INTRO_CONFIG.introEnabled,
  };
}

function migrateLegacyDefaultIntro(value: Partial<VideoIntroConfig>): VideoIntroConfig | null {
  const version = value.introVersion ?? 1;
  const usesLegacyDefault = !value.introAssetId || value.introAssetId === "default-intro";
  if (!usesLegacyDefault || version >= DEFAULT_VIDEO_INTRO_CONFIG.introVersion) return null;

  return {
    ...mergeWithDefaults(value),
    introAssetId: DEFAULT_VIDEO_INTRO_CONFIG.introAssetId,
    introVersion: DEFAULT_VIDEO_INTRO_CONFIG.introVersion,
    introFilePathLandscape: DEFAULT_VIDEO_INTRO_CONFIG.introFilePathLandscape,
    introFilePathPortrait: DEFAULT_VIDEO_INTRO_CONFIG.introFilePathPortrait,
    introDuration: DEFAULT_VIDEO_INTRO_CONFIG.introDuration,
  };
}

export async function getBrandingConfig(): Promise<VideoIntroConfig> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: CONFIG_KEY },
    });
    if (!setting) {
      // Seed default config
      await prisma.siteSetting.create({
        data: {
          key: CONFIG_KEY,
          value: DEFAULT_VIDEO_INTRO_CONFIG as any,
        },
      });
      return DEFAULT_VIDEO_INTRO_CONFIG;
    }
    const val = setting.value as unknown as Partial<VideoIntroConfig>;
    const migrated = migrateLegacyDefaultIntro(val);
    if (migrated) {
      await prisma.siteSetting.upsert({
        where: { key: CONFIG_KEY },
        update: { value: migrated as any },
        create: { key: CONFIG_KEY, value: migrated as any },
      });
      console.log("[branding-config] Migrated the legacy black intro to the animated brand intro.");
      return migrated;
    }
    return mergeWithDefaults(val);
  } catch (error) {
    console.error("[branding-config] Failed to retrieve branding config, falling back to default:", error);
    return DEFAULT_VIDEO_INTRO_CONFIG;
  }
}

export async function updateBrandingConfig(config: Partial<VideoIntroConfig>): Promise<VideoIntroConfig> {
  const current = await getBrandingConfig();
  const updated = { ...current, ...config };
  await prisma.siteSetting.upsert({
    where: { key: CONFIG_KEY },
    update: { value: updated as any },
    create: { key: CONFIG_KEY, value: updated as any },
  });
  return updated;
}
