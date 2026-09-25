# Design: Ações em Lote e Importação Assistida de Jazigos

## Context

A `DataTable` do inventário exibe colunas detalhadas de unidades de sepultamento. Para operações em massa, precisamos estender a tabela com suporte a seleção de linhas (usando a API nativa de row selection do `@tanstack/react-table`) e desacoplar as operações coletivas em componentes modulares.

## Goals / Non-Goals

**Goals:**
- Integrar coluna de seleção com checkbox nativo acessível na `DataTable`.
- Criar `BarraAcoesLote.tsx`: barra flutuante com animação suave e botões para (1) Desmarcar todos, (2) Interditar/Manutenção em lote, (3) Emitir Plaquetas QR em lote, (4) Exportar Selecionados.
- Criar `ModalAcaoLoteManutencao.tsx`: modal de justificativa única que processa as chamadas de transição de estado via `cemiteriosApi.alterarEstado`.
- Criar `ModalImpressaoLoteQr.tsx`: modal com grade de impressão (grid de etiquetas 2 colunas com QR Code vetorial e dados técnicos) com suporte a `@media print` para folhas A4 de etiquetas.
- Criar `ModalImportadorJazigos.tsx`: assistente com drag-and-drop de arquivo CSV, parser com parsing de cabeçalhos e validação com feedback visual de linhas válidas e inválidas, além de geração de CSV modelo com as colunas: `codigo,setor_codigo,tipo,capacidade,comprimento_m,largura_m`.

**Non-Goals:**
- Importação assíncrona com fila no servidor (a importação é validada e disparada via chamadas sequenciais/paralelas no client para lotes normais municipais de até centenas de registros).

## Decisions

1. **Estado de Seleção na `DataTable`**:
   - *Decisão:* Adicionar suporte a `rowSelection` na `DataTable` ou coluna de checkbox customizada controlada por `Set<number>` (`selecionadosIds`).
   - *Vantagem:* Mantém controle total no componente pai `InventarioView.tsx`, permitindo limpeza automática ao trocar filtros ou parque.

2. **Grade de Impressão de Plaquetas em Lote**:
   - *Decisão:* Layout em grid 2 colunas no modal e na impressão, quebrando página a cada 6 ou 8 etiquetas (`page-break-after: always`).
   - *Vantagem:* Permite ao município imprimir folhas inteiras de plaquetas de forma econômica e prática.

3. **Parser de CSV Leve no Client**:
   - *Decisão:* Parser CSV próprio robusto com suporte a delimitadores comuns (vírgula e ponto-e-vírgula), sem dependências pesadas externas.

## Risks / Trade-offs

- [Falha parcial durante processamento em lote] → Exibir barra de progresso durante o envio e relatório final indicando quantas unidades foram atualizadas com sucesso e quais tiveram erro (ex: conflito de versão).
