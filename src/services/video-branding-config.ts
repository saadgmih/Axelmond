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
 * Hostinger's managed Node.js Web App runtime does not provide ffmpeg/ffprobe.
 * Queueing a branding job there would leave an otherwise valid upload blocked
 * in PROCESSING/FAILED. Keep the original video playable on runtimes that
 * cannot execute the branding pipeline.
 */
export function shouldQueueVideoBranding(
  config: Pick<VideoIntroConfig, "introEnabled">,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!config.introEnabled) return false;
  if (env.VIDEO_BRANDING_DISABLED === "true") return false;
  return env.HOSTINGER_WEBAPP !== "1";
}

const DEFAULT_CONFIG: VideoIntroConfig = {
  introAssetId: "default-intro",
  introVersion: 1,
  introFilePathLandscape: "videos/intros/intro-landscape.mp4",
  introFilePathPortrait: "videos/intros/intro-portrait.mp4",
  introDuration: 5.0,
  introEnabled: true,
};

const CONFIG_KEY = "video-branding-config";

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
          value: DEFAULT_CONFIG as any,
        },
      });
      return DEFAULT_CONFIG;
    }
    const val = setting.value as unknown as Partial<VideoIntroConfig>;
    return {
      introAssetId: val.introAssetId ?? DEFAULT_CONFIG.introAssetId,
      introVersion: val.introVersion ?? DEFAULT_CONFIG.introVersion,
      introFilePathLandscape: val.introFilePathLandscape ?? DEFAULT_CONFIG.introFilePathLandscape,
      introFilePathPortrait: val.introFilePathPortrait ?? DEFAULT_CONFIG.introFilePathPortrait,
      introDuration: val.introDuration ?? DEFAULT_CONFIG.introDuration,
      introEnabled: val.introEnabled ?? DEFAULT_CONFIG.introEnabled,
    };
  } catch (error) {
    console.error("[branding-config] Failed to retrieve branding config, falling back to default:", error);
    return DEFAULT_CONFIG;
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
