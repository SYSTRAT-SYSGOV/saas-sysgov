# Tasks: Ações em Lote e Importação Assistida de Jazigos

## 1. Seleção Múltipla e Barra de Ações em Lote

- [x] 1.1 Adicionar suporte a seleção múltipla de linhas na `DataTable` de `InventarioView.tsx` com checkbox individual e checkbox global "selecionar todos os filtrados", verificando que a contagem de selecionados é precisa.
- [x] 1.2 Criar o componente `BarraAcoesLote.tsx` utilizando componentes `@sysgov/ui`, exibindo contador de itens selecionados em JetBrains Mono (`tabular-nums font-mono`), botão para desmarcar seleção e botões para ações em lote.

## 2. Ações Coletivas em Lote (Interdição e Impressão de QR Codes)

- [x] 2.1 Criar o componente `ModalAcaoLoteManutencao.tsx` para alteração de estado coletivo (interditar para manutenção ou restaurar) com justificativa obrigatória e feedback de progresso da execução.
- [x] 2.2 Criar o componente `ModalImpressaoLoteQr.tsx` com grade de etiquetas com QR Code vetorial e layout de impressão otimizado para folhas de etiquetas A4.

## 3. Assistente de Importação Assistida de Jazigos (CSV)

- [x] 3.1 Criar o componente `ModalImportadorJazigos.tsx` com opção de download de planilha modelo CSV, upload com validação de dados em memória e pré-visualização de linhas válidas e inválidas.
- [x] 3.2 Integrar a gravação das novas unidades importadas chamando a API de criação de jazigos e disparando a recarga automática da listagem e dos KPIs.

## 4. Integração na Tela de Inventário e Testes

- [x] 4.1 Adicionar o botão "Importar Planilha" na barra de gestão de cadastros de `InventarioView.tsx` e conectar a barra flutuante de ações em lote.
- [x] 4.2 Desenvolver testes unitários com Vitest para os novos componentes (`BarraAcoesLote.test.tsx`, `ModalAcaoLoteManutencao.test.tsx`, `ModalImpressaoLoteQr.test.tsx` e `ModalImportadorJazigos.test.tsx`).
- [x] 4.3 Executar a suíte de testes `npm test --workspace apps/web-client` e garantir 100% de testes verdes e sem regressões.
