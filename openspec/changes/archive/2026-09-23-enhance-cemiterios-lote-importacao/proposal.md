# Proposal: Ações em Lote e Importação Assistida de Jazigos

## Why

A administração municipal de cemitérios gerencia milhares de unidades de sepultamento, quadras inteiras e novas expansões de gavetários. Operar individualmente túmulo por túmulo para registrar interdições de infraestrutura, reformas, geração de etiquetas para quadras inteiras ou cadastro de novas alas é ineficiente e propenso a erros operacionais. Disponibilizar seleção múltipla com barra de ações em lote e um assistente de importação via planilha (CSV/XLSX) confere alta produtividade às secretarias municipais.

## What Changes

- Adição de seleção múltipla (checkboxes por linha e seleção global de filtrados) na `DataTable` de unidades de sepultamento.
- Adição da **Barra Flutuante de Ações em Lote (Bulk Action Bar)**:
  - Exibição da quantidade de unidades selecionadas com opção de desmarcar todas.
  - Ação em lote: **Interdição / Manutenção Coletiva** com modal de justificativa única formal e aplicação concorrente segura.
  - Ação em lote: **Impressão Coletiva de Plaquetas QR Code** (emissão de grade de etiquetas para impressão direta em lote).
  - Ação em lote: **Exportação Rápida de Selecionados** (CSV/XLSX).
- Adição do componente **Importador Assistido de Jazigos (`ModalImportadorJazigos.tsx`)**:
  - Download de planilha modelo padronizada (CSV).
  - Upload com validação imediata em memória (identificação de campos vazios, duplicidades de código, dimensões inválidas e associação correta ao cemitério e setor).
  - Pré-visualização dos registros válidos e com inconsistência antes de efetivar o cadastro.
  - Gravação sequencial com relatório de sucesso.

## Capabilities

### Modified Capabilities
- `cemiterio/inventario`: Adição de requisitos para seleção múltipla, operações coletivas em lote e assistente de importação em massa de unidades de sepultamento.

## Impact

- **Frontend (`apps/web-client`)**: Novos componentes `BarraAcoesLote.tsx`, `ModalAcaoLoteManutencao.tsx`, `ModalImpressaoLoteQr.tsx` e `ModalImportadorJazigos.tsx`; integração de estado de seleção na `DataTable` e no `InventarioView.tsx`.
- **API (`apps/api`)**: Reutilização dos endpoints existentes (`POST api/cemiterios/jazigos`, `POST api/cemiterios/jazigos/{id}/estado`), processados em lote no frontend com tratamento de erros individuais e concorrência otimista.
