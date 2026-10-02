/** Story layout templates for 1080×1920 Instagram PNG export. */

export const STORY_TEMPLATES = ['vault_dark', 'studio_light', 'dual_metal', 'pulse_neon'] as const;
export type StoryTemplateId = (typeof STORY_TEMPLATES)[number];

export const STORY_TEMPLATE_LABELS: Record<StoryTemplateId, string> = {
  vault_dark: 'تیره طلایی',
  studio_light: 'روشن تمیز',
  dual_metal: 'مقایسه دوتایی',
  pulse_neon: 'نمودار محور',
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
      bg: '#f6f3ec',
      bg2: '#ebe6dc',
      text: '#16130f',
      muted: '#6a6358',
      accent: '#9a6b14',
      card: '#ffffff',
      cardBorder: '#ddd4c4',
      metalA: '#c9a227',
      metalB: '#8a7350',
      qrDark: '#16130f',
      qrLight: '#ffffff',
    };
  }
  if (template === 'dual_metal') {
    return {
      bg: '#090d13',
      bg2: '#111821',
      text: '#f5f7fb',
      muted: '#9aa7b8',
      accent: '#e8c547',
      card: '#121a26',
      cardBorder: '#283446',
      metalA: '#e8c547',
      metalB: '#c8d2e0',
      qrDark: '#f5f7fb',
      qrLight: '#090d13',
    };
  }
  if (template === 'pulse_neon') {
    return {
      bg: '#05080e',
      bg2: '#0b121c',
      text: '#f4f7fb',
      muted: '#8b9bb0',
      accent: '#f0c568',
      card: '#0e1622',
      cardBorder: '#223247',
      metalA: '#4dd8e7',
      metalB: '#f0c568',
      qrDark: '#f4f7fb',
      qrLight: '#05080e',
    };
  }
  return {
    bg: '#070b11',
    bg2: '#0e1520',
    text: '#f4f7fb',
    muted: '#8b98ab',
    accent: '#f0c568',
    card: '#101822',
    cardBorder: '#253345',
    metalA: '#f0c568',
    metalB: '#a67c2d',
    qrDark: '#f4f7fb',
    qrLight: '#070b11',
  };
}
