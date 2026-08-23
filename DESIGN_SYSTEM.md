# SYSGOV Design System Obrigatório

Este documento é a especificação visual e estrutural obrigatória para todas as interfaces do ecossistema **SYSGOV**.

---

## 🎨 1. Direção Visual & Paleta de Cores
- **Master Admin / Dark Mode**: `bg-slate-950` (`#0a1128`), `bg-slate-900` (`#101a3a`), superfícies `#152244`, bordas `#1a2a52`.
- **Destaque Primário**: Emerald `#10b981` (`text-emerald-400`, `bg-emerald-600`, hover `#059669`).
- **Destaques Secundários**: Indigo `#6366f1`, Cyan `#06b6d4`, Amber `#f59e0b`.
- **Semáforo Fiscal (LRF & Contratos)**:
  - **Conforme / Regular**: `#168821` (`text-emerald-400`, `bg-emerald-950/60`, `border-emerald-700/50`).
  - **Alerta / Atenção**: `#ffcd07` (`text-amber-400`, `bg-amber-950/60`, `border-amber-700/50`).
  - **Crítico / Excedido**: `#e52207` (`text-rose-400`, `bg-rose-950/60`, `border-rose-700/50`).
  - **Informativo / Neutro**: `text-sky-400`, `text-slate-300`, `bg-slate-800`.

---

## 🔤 2. Tipografia Estrita
- **Texto Institucional**: `Inter`, `Roboto` ou `DM Sans` (`font-sans`).
- **Dados Técnicos OBRIGATÓRIOS em JetBrains Mono (`font-mono tabular-nums`)**:
  - Valores monetários (`R$ 1.250.000,00`). Nunca use `float` para dinheiro.
  - Percentuais (`51,30%`, `54,00%`).
  - Códigos identificadores, números de processo, empenhos, contratos (`CT-2026/0089`).
  - CNPJs (`01.234.567/0001-89`) e CPFs.
  - Datas (`23/08/2026`).
  - Métricas de desempenho e latência (`14ms`, `99.98%`).

---

## 🏛️ 3. Estrutura de Layout (Obrigatória)

### Sidebar Esquerda (Navegação Fixa):
- **Tema**: Escuro (`#0a1128` / `bg-slate-950`), largura fixa (`w-72` ou colapsável `w-20`).
- **Grupos**: Separadores com títulos em **MAIÚSCULAS** (ex: `GABINETE & DECISÃO ESTRATÉGICA`, `GESTÃO & OPERAÇÕES`, `GOVERNANÇA & SEGURANÇA`).
- **Itens**: Ícones à esquerda (`lucide-react`) e atalhos de teclado à direita (ex: `[P]`, `[G]`, `[B]`, `[D]`, `[M]`, `[C]`).

### Top Bar (Cabeçalho de Contexto):
- **Fundo**: Branco no tema claro, `#101a3a` no tema escuro, com `backdrop-blur-md` e borda inferior.
- **Filtros de Contexto**: Exercício orçamentário (Ano), seletor de Município/Tenant ativo e busca global (`Ctrl + K`).
- **Ações Primárias à Direita**: Botões "Sincronizar", "Exportar PDF", alternador de tema e perfil do usuário.

### Área de Conteúdo (Grid Modular):
- Grid modular responsivo com cards de profundidade leve (`shadow-sm`) e cantos arredondados (`rounded-lg`, radius ~8px).

---

## 🧩 4. Componentes Padronizados

1. **Cards de KPI**:
   - Compactos com cabeçalho (título uppercase), valor numérico em destaque (bold, tamanho maior, `font-mono tabular-nums`) e rodapé com informação secundária/variação percentual.
2. **Cards de Alerta**:
   - Cor semântica por prioridade (vermelho=crítico, amarelo=atenção, verde=conforme), ícone semântico, contagem/status e botão de ação na base ("Ver Alerta").
3. **Badges / Tags**:
   - Fundo leve + borda sutil + texto colorido para categorizar status de contratos, limites LRF e fontes de dados (Siconfi, TCE, PNCP).
4. **Botões**:
   - **Ghost / Outline** (borda fina): para ações secundárias e cancelamentos.
   - **Solid** (fundo colorido com sombra leve): para ações primárias ("Detalhar", "Exportar", "Criar Novo"). Ações primárias sempre alinhadas à direita.
5. **Cards de Dados**:
   - Superfície `bg-white dark:bg-slate-900`, bordas `border-gray-200 dark:border-slate-800`, títulos com `text-sm font-semibold`.

---

## 🏷️ 5. White-Label & Personalização por Cliente
A interface lê dinamicamente as configurações do tenant:
- `customPrimaryColor`: Cor primária da prefeitura (ex: `#10b981`, `#06b6d4`, `#6366f1`).
- `customLogoUrl`: URL do brasão oficial do município.
- `portalTitle` / `portalSubtitle`: Título institucional do órgão.
- `hideProviderSignature`: Permissão para ocultar a assinatura "Powered by SYSTRAT" no rodapé (Pacote Premium).
