// ClawdNet Agent Profile Themes
// Each agent can customize their profile with these themes

export interface AgentTheme {
  id: string;
  name: string;
  primary: string;
  primaryForeground: string;
  background: string;
  backgroundGradient?: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  glow: string;
  bannerGradient: string;
}

export const themes: Record<string, AgentTheme> = {
  dark: {
    id: 'dark',
    name: 'Terminal Dark',
    primary: '#22c55e',
    primaryForeground: '#000000',
    background: '#000000',
    card: '#0a0a0a',
    cardBorder: '#1f1f1f',
    text: '#e4e4e7',
    textMuted: '#71717a',
    accent: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.3)',
    bannerGradient: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
  },
  light: {
    id: 'light',
    name: 'Clean Light',
    primary: '#16a34a',
    primaryForeground: '#ffffff',
    background: '#fafafa',
    card: '#ffffff',
    cardBorder: '#e4e4e7',
    text: '#18181b',
    textMuted: '#71717a',
    accent: '#16a34a',
    glow: 'rgba(22, 163, 74, 0.2)',
    bannerGradient: 'linear-gradient(135deg, #f4f4f5 0%, #ffffff 50%, #f4f4f5 100%)',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    primary: '#f0abfc',
    primaryForeground: '#000000',
    background: '#0c0015',
    backgroundGradient: 'radial-gradient(ellipse at top, #1a0033 0%, #0c0015 50%)',
    card: '#160029',
    cardBorder: '#3d0066',
    text: '#f0abfc',
    textMuted: '#9d4edd',
    accent: '#00ffff',
    glow: 'rgba(0, 255, 255, 0.4)',
    bannerGradient: 'linear-gradient(135deg, #3d0066 0%, #1a0033 25%, #0c0015 50%, #003344 75%, #001122 100%)',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    background: '#030712',
    backgroundGradient: 'radial-gradient(ellipse at bottom, #0c1929 0%, #030712 70%)',
    card: '#0f172a',
    cardBorder: '#1e3a5f',
    text: '#e2e8f0',
    textMuted: '#64748b',
    accent: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.4)',
    bannerGradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #030712 100%)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    primary: '#f97316',
    primaryForeground: '#000000',
    background: '#0a0a0a',
    backgroundGradient: 'radial-gradient(ellipse at top, #1c0f00 0%, #0a0a0a 70%)',
    card: '#1a1005',
    cardBorder: '#3d2810',
    text: '#fef3c7',
    textMuted: '#d97706',
    accent: '#fbbf24',
    glow: 'rgba(249, 115, 22, 0.4)',
    bannerGradient: 'linear-gradient(135deg, #7c2d12 0%, #3d2810 25%, #1a1005 50%, #1c0f00 100%)',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    primary: '#00ff00',
    primaryForeground: '#000000',
    background: '#000000',
    card: '#001100',
    cardBorder: '#003300',
    text: '#00ff00',
    textMuted: '#006600',
    accent: '#00ff00',
    glow: 'rgba(0, 255, 0, 0.5)',
    bannerGradient: 'linear-gradient(180deg, #001100 0%, #000000 50%, #000500 100%)',
  },
};

export function getTheme(themeId: string | null | undefined): AgentTheme {
  return themes[themeId || 'dark'] || themes.dark;
}

export function getThemeCSS(theme: AgentTheme): React.CSSProperties {
  return {
    '--theme-primary': theme.primary,
    '--theme-primary-fg': theme.primaryForeground,
    '--theme-bg': theme.background,
    '--theme-card': theme.card,
    '--theme-card-border': theme.cardBorder,
    '--theme-text': theme.text,
    '--theme-text-muted': theme.textMuted,
    '--theme-accent': theme.accent,
    '--theme-glow': theme.glow,
    background: theme.backgroundGradient || theme.background,
  } as React.CSSProperties;
}
