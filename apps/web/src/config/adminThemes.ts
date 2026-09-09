/**
 * Temas pré-cadastrados do Admin (apps/web).
 *
 * Cada tema define a cor de destaque/acento (o "Accent Theme") e é
 * aplicado via atributo `data-theme` na raiz do documento — os
 * overrides de CSS correspondentes vivem em `src/index.css`, seção
 * "5c. Presets de Tema do Admin".
 *
 * Importante: o eixo tema (cor) é ortogonal ao eixo claro/escuro
 * (classe `.dark`, controlado pelo toggle de tema existente). Todo
 * tema aqui suporta os dois modos — a cor de destaque muda, nunca
 * as cores semânticas de status (sucesso/alerta/crítico do semáforo
 * fiscal), que permanecem fixas em qualquer tema.
 *
 * Contraste do menu lateral: por padrão a sidebar é sempre Navy
 * escura nos dois modos (`--sidebar-*` em index.css), o que já dá
 * variação em relação ao conteúdo principal (esse sim segue o
 * alternador claro/escuro). O tema "pearl" inverte isso — sidebar
 * sempre clara — pra quem quer o oposto. `sidebarSurface` só existe
 * pra alimentar a legenda na tela de Configurações; o comportamento
 * de fato vem do CSS.
 *
 * Escopo: somente apps/web (painel admin). Não afeta apps/web-client.
 */
export interface AdminTheme {
  id: string;
  name: string;
  description: string;
  /** Cor de destaque usada na pré-visualização (modo claro). */
  swatchLight: string;
  /** Cor de destaque usada na pré-visualização (modo escuro). */
  swatchDark: string;
  /** Cor de fundo da sidebar usada na pré-visualização. */
  sidebarSwatch: string;
  /** Só pra legenda/descrição na UI — o efeito real vem do CSS do tema. */
  sidebarSurface: 'dark' | 'light';
}

export const ADMIN_THEMES: AdminTheme[] = [
  {
    id: 'navy',
    name: 'Navy Esmeralda (Padrão)',
    description: 'Tema oficial SYSGOV — menu lateral sempre escuro, destaque Esmeralda.',
    swatchLight: '#10b981',
    swatchDark: '#10b981',
    sidebarSwatch: '#0a1128',
    sidebarSurface: 'dark',
  },
  {
    id: 'indigo',
    name: 'Índigo Executivo',
    description: 'Menu lateral sempre escuro, destaque em Índigo.',
    swatchLight: '#6366f1',
    swatchDark: '#818cf8',
    sidebarSwatch: '#0a1128',
    sidebarSurface: 'dark',
  },
  {
    id: 'gov-blue',
    name: 'Azul Governamental',
    description: 'Menu lateral sempre escuro, destaque em Azul institucional (Gov.br).',
    swatchLight: '#155bcb',
    swatchDark: '#3b82f6',
    sidebarSwatch: '#0a1128',
    sidebarSurface: 'dark',
  },
  {
    id: 'cyan',
    name: 'Ciano Tecnológico',
    description: 'Menu lateral sempre escuro, destaque em Ciano.',
    swatchLight: '#0891b2',
    swatchDark: '#22d3ee',
    sidebarSwatch: '#0a1128',
    sidebarSurface: 'dark',
  },
  {
    id: 'pearl',
    name: 'Pérola (Menu Claro)',
    description: 'Inverte o contraste: menu lateral sempre claro, conteúdo segue claro/escuro.',
    swatchLight: '#8b5cf6',
    swatchDark: '#a78bfa',
    sidebarSwatch: '#ffffff',
    sidebarSurface: 'light',
  },
];

export const DEFAULT_ADMIN_THEME_ID = 'navy';
