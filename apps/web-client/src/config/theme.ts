export interface GovBrThemeTokens {
  primary: {
    default: string;
    hover: string;
    active: string;
    light: string;
    border: string;
    text: string;
  };
  accent: {
    gold: string;
    yellow: string;
    cyan: string;
    indigo: string;
  };
  surface: {
    page: string;
    card: string;
    alternative: string;
    border: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  status: {
    success: { base: string; bg: string; border: string };
    warning: { base: string; bg: string; border: string };
    danger: { base: string; bg: string; border: string };
    info: { base: string; bg: string; border: string };
  };
}

export const GOVBR_TOKENS: GovBrThemeTokens = {
  primary: {
    default: '#1351B4', // Blue Warm Vivid 70
    hover: '#0C326F',   // Blue Warm Vivid 80
    active: '#071D41',  // Blue Warm Vivid 90
    light: '#E8F0FE',   // Blue Warm 10
    border: '#C5D8F6',
    text: '#FFFFFF',
  },
  accent: {
    gold: '#F6A609',
    yellow: '#FFCD07',
    cyan: '#06B6D4',
    indigo: '#6366F1',
  },
  surface: {
    page: '#F8F9FA',
    card: '#FFFFFF',
    alternative: '#071D41',
    border: '#D8DCE0',
  },
  text: {
    primary: '#1B1B1B',
    secondary: '#555555',
    muted: '#888888',
  },
  status: {
    success: { base: '#168821', bg: '#E8F5E9', border: '#A5D6A7' },
    warning: { base: '#F2A71B', bg: '#FFF8E1', border: '#FFE082' },
    danger: { base: '#E52207', bg: '#FDECEA', border: '#F5C6CB' },
    info: { base: '#155BCB', bg: '#E8F0FE', border: '#A9C6F0' },
  },
};

/**
 * Formatação exata em moeda brasileira (R$).
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatação percentual precisa.
 */
export function formatPercentBRL(value: number, decimals = 2): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Formatação de data no padrão brasileiro DD/MM/AAAA.
 */
export function formatDateBRL(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Aplica White-Label no runtime mantendo harmonia com o DS Gov.br
 */
export function applyWhiteLabelTheme(customPrimaryColor?: string): void {
  if (customPrimaryColor && customPrimaryColor.startsWith('#')) {
    document.documentElement.style.setProperty('--gov-primary', customPrimaryColor);
    document.documentElement.style.setProperty('--gov-primary-hover', adjustBrightness(customPrimaryColor, -15));
    document.documentElement.style.setProperty('--gov-primary-light', adjustBrightness(customPrimaryColor, 75));
  } else {
    document.documentElement.style.setProperty('--gov-primary', '#1351B4');
    document.documentElement.style.setProperty('--gov-primary-hover', '#0C326F');
    document.documentElement.style.setProperty('--gov-primary-light', '#E8F0FE');
  }
}

function adjustBrightness(hex: string, percent: number): string {
  if (!hex || !hex.startsWith('#')) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
