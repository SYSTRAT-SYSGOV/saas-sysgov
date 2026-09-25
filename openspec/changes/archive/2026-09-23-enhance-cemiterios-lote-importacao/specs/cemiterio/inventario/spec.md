# Spec Delta: cemiterio/inventario

## ADDED Requirements

### Requirement: Seleção Múltipla e Operações Coletivas em Lote (Bulk Actions)
O sistema SHALL permitir ao usuário selecionar individualmente ou coletivamente unidades de sepultamento na listagem tabular (`DataTable`) através de caixas de seleção (checkboxes). Ao haver ao menos uma unidade selecionada, uma barra de ações flutuante (Bulk Action Bar) DEVE ser exibida na tela, disponibilizando operações em massa: Interdição Coletiva para Ruína/Manutenção, Emissão Coletiva de Plaquetas com QR Code em grade de impressão e Exportação dos itens selecionados.

#### Scenario: Seleção em massa e exibição da barra de ações
- **WHEN** o usuário seleciona múltiplos jazigos na tabela através dos checkboxes
- **THEN** a barra de ações em lote é exibida exibindo o total de registros selecionados e os botões de ação coletiva

#### Scenario: Interdição em lote com justificativa obrigatória
- **WHEN** o usuário aciona a ação de interdição coletiva para as unidades selecionadas
- **THEN** o sistema abre modal exigindo justificativa técnica formal e aplica a transição de estado registrando a auditoria individualmente por unidade

#### Scenario: Emissão de plaquetas QR Code em lote
- **WHEN** o usuário solicita imprimir plaquetas para os jazigos selecionados
- **THEN** o sistema renderiza uma folha com as plaquetas organizadas em grade com seus respectivos códigos e QR Codes para impressão conjunta

### Requirement: Assistente de Importação em Massa de Unidades de Sepultamento
O sistema SHALL disponibilizar um assistente de importação assistida de unidades de sepultamento a partir de arquivos CSV/planilhas. O assistente DEVE disponibilizar modelo padrão para download, processar o arquivo enviado, validar em memória a integridade das linhas (código único, setor existente, capacidade numérica, dimensões válidas) e exibir pré-visualização categorizada (válidos e com erros) antes da confirmação de gravação.

#### Scenario: Validação prévia de inconsistências na importação
- **WHEN** o usuário envia um arquivo CSV contendo linhas com códigos duplicados ou setores inexistentes
- **THEN** o assistente sinaliza visualmente cada linha com inconsistência e impede a importação de registros inválidos

#### Scenario: Gravação bem-sucedida de novas unidades
- **WHEN** o usuário confirma a importação de um conjunto de unidades válidas
- **THEN** o sistema cadastra sequencialmente os novos jazigos e atualiza imediatamente o inventário e os indicadores de KPIs
