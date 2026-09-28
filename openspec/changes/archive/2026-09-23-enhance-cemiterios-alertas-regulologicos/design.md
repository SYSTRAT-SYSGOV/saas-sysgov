# Decisões de Design: Alertas de Inteligência Regulológica (Concessões & Exumações)

## 1. Arquitetura de Domínio Regulatório

Criar um módulo de utilitários puros em `src/modules/cemiterios/regulamentacao.utils.ts`:
- **`calcularStatusConcessao(jazigo)`**:
  - `PERPETUA`: Sem prazo de expiração.
  - `VENCIDA`: Data de fim anterior à data corrente (`diasAtraso` em `JetBrains Mono`).
  - `A_VENCER`: Data de fim entre hoje e +60 dias (`diasRestantes` em `JetBrains Mono`).
  - `VIGENTE`: Mais de 60 dias de vigência restante.
- **`calcularStatusExumacao(ocupante, prazoLegalAnos = 3)`**:
  - Com base em `data_sepultamento` ou `data_falecimento`.
  - Diferença em anos / meses.
  - Se $\ge 3$ anos: `ELEGIVEL` (com tempo decorrido formatado: ex: "3a 4m").
  - Se $< 3$ anos: `EM_INTERSTICIO` (tempo restante para cumprimento do interstício).
- **`obterAlertasReguloriosJazigo(jazigo)`**:
  - Retorna lista de alertas consolidados do jazigo (concessão, exumações elegíveis, conservação crítica) para consumo unificado na listagem e no Drawer.

## 2. Componentes de Interface

1. **`BadgeAlertaRegulatorio.tsx`**:
   - Componente especializado que renderiza badges semânticos compactos utilizando `Badge` de `@sysgov/ui`.
   - Exibe ícones semânticos Lucide (`Clock`, `AlertTriangle`, `CheckCircle`, `Calendar`) e contadores em `JetBrains Mono`.
2. **`PainelRegulatorioDrawer.tsx`**:
   - Card completo posicionado no Drawer de Detalhes (`DetalheJazigo`).
   - Apresenta:
     - Diagnóstico legal da Concessão com barra de progresso do prazo.
     - Diagnóstico sanitário das Inumações (se houver inumado com prazo atingido para exumação, exibe card com botão de atalho "Emitir Termo de Notificação / Abertura de Exumação").
     - Fundamentação e prazo sanitário com amparo legal.
3. **Evolução em `InventarioFiltros.tsx`**:
   - Adicionar o campo "Filtro Regulatório" com opções:
     - "Todos os Status"
     - "Elegível para Exumação"
     - "Concessão Vencida"
     - "Concessão a Vencer (< 60 dias)"
     - "Crítico / Risco Estrutural"
4. **Evolução em `InventarioView.tsx`**:
   - Coluna de Alertas Regulatórios na tabela ou badges contextuais abaixo do código do jazigo / concessão.
   - Aplicação da filtragem nos dados do inventário em memória.

## 3. Conformidade com Design System & Tipografia

- Tipografia técnica estritamente em `JetBrains Mono` (`font-mono tabular-nums`) para contadores de dias, datas de sepultamento, anos decorridos e códigos.
- Componentes primitivos exclusivamente de `@sysgov/ui` (`Card`, `Badge`, `Button`, `Select`).
- Sem pacotes adicionais do npm.
