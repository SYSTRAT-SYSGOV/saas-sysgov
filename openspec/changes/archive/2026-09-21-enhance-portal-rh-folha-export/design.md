# Design: Modernização da Aba de Exportação para Folha de Pagamento

## Context

A sub-aba "Exportação Folha de Pagamento" (`activeTab === 'folha-export'`) em `PortalRhView.tsx` consolida a concessão financeira da evolução funcional (acréscimo salarial de +10% previsto pelo Art. 17 da Lei Municipal nº 1.704/2006 para servidores homologados com NFC ≥ 70,00 pts).

Conforme documentado no `proposal.md`, a versão anterior possuía apenas um card de aviso, um botão simples de download e uma tabela com dimensionamento estático (`fixedLayout={true}`), sem inteligência orçamentária, filtros por secretaria/departamento, nem suporte a múltiplos layouts para ERPs públicos municipais.

## Goals / Non-Goals

**Goals:**
- **Módulo Utilitário de Inteligência Financeira (`PortalRhView.folha.ts`)**: Isolar tipos (`ItemFolhaExport`, `FiltrosFolhaExport`, `KpisFolhaExport`), funções puras de cálculo orçamentário em centavos inteiros (`int cents`), filtros multi-critério e formatadores de exportação para ERPs (Betha, IPM, Governa e CSV Universal).
- **Painel Executivo de KPIs Orçamentários**: Barra com 4 cartões de indicadores (Folha Base Mensal, Impacto Mensal do Reajuste, Impacto Anual Projetado com 13º e 1/3 de férias, e Efetivo Apto vs Retido em PMD) com tipografia técnica JetBrains Mono (`font-mono tabular-nums`).
- **Barra de Busca Rápida & Quick Filters**: Pesquisa por texto em tempo real (nome, matrícula, CPF, cargo, secretaria) e pílulas de 1 clique para filtros imediatos.
- **Painel Colapsável de Filtros Avançados**: Seletores dinâmicos de Secretaria, Departamento contextualizado, Cargo Efetivo, Faixa Salarial e Situação de Homologação, com contador de filtros ativos e botão de redefinição.
- **Menu/Modal de Exportação Especializada para ERPs**: Permitir a geração imediata do arquivo formatado conforme as especificações de Betha Sistemas, IPM Atende.Net, Governa/CECAM ou CSV Universal.
- **Grid Fluido & Responsivo**: Tabela TanStack sem `fixedLayout` rígido, adaptada a 100% da largura útil sem barra de rolagem horizontal no desktop, com badges semânticos e colunas atômicas com `exportOnly: true`.

**Non-Goals:**
- Alterar as tabelas ou regras de negócio no backend de folha de pagamento.
- Alterar outras abas do `PortalRhView` (Quadro de Servidores, Estágio Probatório e Classificação/Desempate já foram padronizadas).

## Decisions

### Decisão 1: Isolamento de Funções Puras em `PortalRhView.folha.ts`
- **Decisão**: Toda a lógica financeira, ordenação, identificação de impacto, filtragem e geração de conteúdo CSV para ERPs residirá em `PortalRhView.folha.ts`, com 100% de cobertura por testes no Vitest.
- **Alternativas consideradas**:
  - *Manter inline no componente*: Rejeitado para evitar complexidade e permitir testes de regressão automatizados para os leiautes dos ERPs.

### Decisão 2: Cálculos Monetários Seguros em Centavos Inteiros
- **Decisão**: Todos os valores são calculados em centavos inteiros (`int cents`):
  - `salario_atual_cents`: remuneração base atual.
  - `diferenca_mensal_cents`: `Math.round(salario_atual_cents * 0.10)` se elegível, `0` se retido.
  - `salario_projetado_cents`: `salario_atual_cents + diferenca_mensal_cents`.
  - `impacto_anual_cents`: `diferenca_mensal_cents * 13.3333` (considerando 12 meses + 13º salário + 1/3 constitucional de férias).
  A formatação visual em `R$` ocorre apenas na camada de exibição com `toLocaleString('pt-BR')`.
- **Alternativas consideradas**:
  - *Uso de floats*: Rejeitado por violar as diretrizes de segurança e precisão contábil do SYSGOV (`AGENTS.md`).

### Decisão 3: Geradores de Leiaute para Múltiplos ERPs Públicos
- **Decisão**: Criar funções dedicadas de exportação:
  - `gerarCsvBetha(itens)`: Formato delimitado por ponto-e-vírgula com campos `MATRICULA;RUBRICA;VALOR_NOVO;TIPO_EVENTO`.
  - `gerarCsvIpm(itens)`: Formato com matrícula, percentual de progressão, nota NFC e data da concessão conforme Atende.Net.
  - `gerarCsvGoverna(itens)`: Formato posicional/delimitado para importação da evolução funcional.
  - `gerarCsvUniversal(itens)`: Formato consolidado completo com todas as variáveis cadastrais e financeiras.
- **Alternativas consideradas**:
  - *Apenas um CSV genérico*: Rejeitado porque os operadores de RH de prefeituras gastavam tempo significativo ajustando manualmente as colunas para o software contábil de destino.

### Decisão 4: Grid Fluido sem Barra de Rolagem Horizontal no Desktop
- **Decisão**: Remover `fixedLayout={true}` do `DataTable`, agrupando dados cadastrais afins (Servidor com Matrícula e Cargo) e utilizando larguras proporcionais, garantindo visualização limpa e integrada em qualquer resolução desktop (1366px e 1920px).

## Risks / Trade-offs

- **[Risco] Incompatibilidade de caracteres especiais ou acentuação em importadores legados de ERP.**
  - *Mitigação*: Incluir Byte Order Mark UTF-8 (`\uFEFF`) no início de todos os arquivos gerados via Blob, garantindo abertura nativa correta no Microsoft Excel e nos importadores contábeis sem corrupção de caracteres.
