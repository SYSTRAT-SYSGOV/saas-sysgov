
# PADRÃO VISUAL SYSGOV — Design System Obrigatório

Todo módulo novo do ecossistema SYSGOV DEVE seguir exatamente este padrão visual (derivado do SGF Araucária). Aplicar em qualquer desenvolvimento com IA ou manual. Não inventar estilos, cores ou 
componentes fora deste contrato.

## 1. Stack e Ferramentas
- Frontend: React + TypeScript + Tailwind CSS.
- Ícones: lucide-react (nunca emojis ou SVGs soltos).
- Componentes base: Shadcn/UI ou Radix UI (cards, badges, botões, diálogos).
- NUNCA usar CSS inline ou estilos fora do design system.

## 2. Tipografia
- Dados numéricos OBRIGATÓRIOS em JetBrains Mono (`font-mono`): valores monetários (R$), percentuais (%), datas, códigos IBGE, CNPJ, CPF, limites LRF, métricas de tabelas e estatísticas.
- Texto institucional em Inter, Roboto ou sans-serif padrão DSGov (`font-sans`).

## 3. Paleta de Cores (Tokens)
- Fundo Master Admin / Dark Mode: `bg-slate-950`, `bg-slate-900`, `bg-slate-800/80`.
- Destaque primário: Emerald `#10b981` (`text-emerald-400`, `bg-emerald-600`).
- Destaques secundários: Indigo `#6366f1`, Cyan `#06b6d4`, Amber `#f59e0b`.
- Azul institucional governo: `#0c326f`, `#1351b4`, `#071d41` (`bg-blue-900`, `text-blue-400`).
- Semáforo fiscal:
  - Regular/Conforme: `#168821` (`text-emerald-400`, `bg-emerald-950/60`, `border-emerald-700/50`).
  - Alerta/Atenção: `#ffcd07` (`text-amber-400`, `bg-amber-950/60`, `border-amber-700/50`).
  - Crítico/Prudencial excedido: `#e52207` (`text-rose-400`, `bg-rose-950/60`, `border-rose-700/50`).
  - Informativo/Neutro: `text-sky-400`, `text-slate-300`, `bg-slate-800`.

## 4. Estrutura de Layout (Obrigatória)
- Sidebar esquerda: tema escuro, largura fixa, grupos com separadores e títulos em MAIÚSCULAS (ex: "GABINETE & DECISÃO ESTRATÉGICA"), ícones à esquerda e atalhos de teclado à direita (ex: [P], [G], [B]).

- Top bar: fundo branco, filtros de contexto (ano, cidade), botões de ação à direita ("Sincronizar", "Exportar PDF").
- Área de conteúdo: grid modular com cards de profundidade leve (`shadow-sm`) e bordas arredondadas (`rounded-lg`, radius ~8px).

## 5. Componentes
- Cards de KPI: compactos, cabeçalho, valor numérico em destaque (bold, tamanho maior, `font-mono`), rodapé com info secundária.
- Cards de alerta: cor semântica por prioridade (vermelho=crítico, amarelo=atenção), ícone, contagem/status e botão de ação na base ("Ver Alerta").
- Badges/Tags: fundo leve + texto colorido para categorizar status e fontes de dados.
- Botões: ghost (borda fina) para ações secundárias; solid (fundo colorido) para primárias ("Detalhar", "Exportar"). Ações primárias alinhadas à direita.
- Cards de dados: fundo branco, `border-gray-200`, títulos `text-sm font-semibold`.

## 6. White-Label / Personalização por Cliente
- Pacote Standard: marca "Escrita.Online — Inteligência & Análise Fiscal" no rodapé e login; header do município com badge "Powered by Escrita.Online".
- Pacote White-Label Premium: permitir `customPrimaryColor`, `customLogoUrl`, título/subtítulo do portal por município e ocultar assinatura do fornecedor. Ler essas configurações do tenant 
(nunca hard-coded).

## 7. Regras de Qualidade
- Responsivo e acessível (contraste, foco visível, aria-labels).
- Autorização real no backend; frontend apenas esconde menu/botão.
- Valores monetários sempre em representação exata (nunca float).
- Seguir o mesmo padrão em TODOS os módulos — consistência é obrigatória.