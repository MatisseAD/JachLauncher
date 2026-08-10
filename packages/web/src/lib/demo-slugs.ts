export const DEMO_SLUG = {
  yourLauncher: "serveur-demo",
  novaSurvival: "nova-survival",
  elyriaOrigins: "elyria-origins",
  blockDistrict: "block-district",
} as const;

export const DEMO_SLUGS = Object.freeze(Object.values(DEMO_SLUG));

const DEMO_SLUG_SET = new Set<string>(DEMO_SLUGS);

export function isDemoSlug(slug: string): boolean {
  return DEMO_SLUG_SET.has(slug);
}
