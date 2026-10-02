/** Story layout templates for 1080×1920 PNG export. */

export const STORY_TEMPLATES = ['minimal_light', 'dark_gold', 'gold_silver'] as const;
export type StoryTemplateId = (typeof STORY_TEMPLATES)[number];

export const STORY_TEMPLATE_LABELS: Record<StoryTemplateId, string> = {
  minimal_light: 'مینیمال روشن',
  dark_gold: 'تیره با طلایی برند',
  gold_silver: 'مقایسه طلا/نقره',
};

export type StoryPalette = {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  card: string;
  cardBorder: string;
  qrDark: string;
  qrLight: string;
};

export function storyPalette(template: StoryTemplateId): StoryPalette {
  if (template === 'minimal_light') {
    return {
      bg: '#f7f5f0',
      text: '#1a1a1a',
      muted: '#5c5c5c',
      accent: '#8a6a1f',
      card: '#ffffff',
      cardBorder: '#e4dfd4',
      qrDark: '#1a1a1a',
      qrLight: '#f7f5f0',
    };
  }
  if (template === 'gold_silver') {
    return {
      bg: '#0c1018',
      text: '#f4f7fb',
      muted: '#9aa7b8',
      accent: '#e8c547',
      card: '#141b27',
      cardBorder: '#2a3648',
      qrDark: '#f4f7fb',
      qrLight: '#0c1018',
    };
  }
  return {
    bg: '#080c13',
    text: '#f4f7fb',
    muted: '#8795a8',
    accent: '#f0c568',
    card: '#101722',
    cardBorder: '#263345',
    qrDark: '#f4f7fb',
    qrLight: '#080c13',
  };
}
