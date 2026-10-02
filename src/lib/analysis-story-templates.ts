/** Story layout templates for 1080×1920 Instagram PNG export. */

export const STORY_TEMPLATES = ['vault_dark', 'studio_light', 'dual_metal', 'pulse_neon'] as const;
export type StoryTemplateId = (typeof STORY_TEMPLATES)[number];

export const STORY_TEMPLATE_LABELS: Record<StoryTemplateId, string> = {
  vault_dark: 'خزانه تیره',
  studio_light: 'استودیو روشن',
  dual_metal: 'طلا / نقره',
  pulse_neon: 'نبض برند',
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
      bg: '#f4f0e8',
      bg2: '#ebe4d6',
      text: '#1a1610',
      muted: '#6b6358',
      accent: '#9a6b1a',
      card: '#ffffff',
      cardBorder: '#e2d8c6',
      metalA: '#d4a84b',
      metalB: '#a8894a',
      qrDark: '#1a1610',
      qrLight: '#f4f0e8',
    };
  }
  if (template === 'dual_metal') {
    return {
      bg: '#0a0e14',
      bg2: '#121821',
      text: '#f5f7fb',
      muted: '#9aa7b8',
      accent: '#e8c547',
      card: '#141c28',
      cardBorder: '#2a3648',
      metalA: '#e8c547',
      metalB: '#c5d0de',
      qrDark: '#f5f7fb',
      qrLight: '#0a0e14',
    };
  }
  if (template === 'pulse_neon') {
    return {
      bg: '#060910',
      bg2: '#0c1420',
      text: '#f4f7fb',
      muted: '#8b9bb0',
      accent: '#f0c568',
      card: '#0f1724',
      cardBorder: '#243247',
      metalA: '#4dd8e7',
      metalB: '#f0c568',
      qrDark: '#f4f7fb',
      qrLight: '#060910',
    };
  }
  return {
    bg: '#080c13',
    bg2: '#101722',
    text: '#f4f7fb',
    muted: '#8795a8',
    accent: '#f0c568',
    card: '#121a26',
    cardBorder: '#263345',
    metalA: '#f0c568',
    metalB: '#b8923f',
    qrDark: '#f4f7fb',
    qrLight: '#080c13',
  };
}
