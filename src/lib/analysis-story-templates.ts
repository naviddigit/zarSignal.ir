/** Story layout templates for 1080×1920 Instagram PNG export. */

export const STORY_TEMPLATES = ['vault_dark', 'studio_light', 'dual_metal'] as const;
export type StoryTemplateId = (typeof STORY_TEMPLATES)[number];

export const STORY_TEMPLATE_LABELS: Record<StoryTemplateId, string> = {
  vault_dark: 'نبض بازار',
  studio_light: 'تمرکز روی یک دارایی',
  dual_metal: 'مقایسهٔ طلا و نقره',
};

export type StoryPalette = {
  bg: string;
  bg2: string;
  text: string;
  muted: string;
  accent: string;
  card: string;
  cardBorder: string;
  metalA: string;
  metalB: string;
  qrDark: string;
  qrLight: string;
};

export function storyPalette(template: StoryTemplateId): StoryPalette {
  if (template === 'studio_light') {
    return {
      bg: '#f5f1e8',
      bg2: '#ebe4d6',
      text: '#16130f',
      muted: '#6a6358',
      accent: '#9a6b14',
      card: '#ffffff',
      cardBorder: '#ddd4c4',
      metalA: '#d4a84b',
      metalB: '#8a7350',
      qrDark: '#16130f',
      qrLight: '#ffffff',
    };
  }
  if (template === 'dual_metal') {
    return {
      bg: '#080c12',
      bg2: '#101821',
      text: '#f5f7fb',
      muted: '#9aa7b8',
      accent: '#e8c547',
      card: '#121a26',
      cardBorder: '#283446',
      metalA: '#e8c547',
      metalB: '#c8d2e0',
      qrDark: '#f5f7fb',
      qrLight: '#080c12',
    };
  }

  return {
    bg: '#060a10',
    bg2: '#0d1520',
    text: '#f4f7fb',
    muted: '#8b98ab',
    accent: '#f0c568',
    card: '#101822',
    cardBorder: '#253345',
    metalA: '#f0c568',
    metalB: '#a67c2d',
    qrDark: '#f4f7fb',
    qrLight: '#060a10',
  };
}
