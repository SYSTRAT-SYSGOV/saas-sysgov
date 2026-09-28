# Spec Delta: cemiterio/inventario

## ADDED Requirements

### Requirement: Histórico de Vistorias e Laudos Técnicos no Drawer da Unidade
O sistema SHALL exibir no Drawer de Detalhes da Unidade de Sepultamento (`DetalheJazigo`) uma seção dedicada ao histórico de vistorias técnicas de conservação. A seção DEVE apresentar a data de cada inspeção em tipografia `JetBrains Mono` (`font-mono tabular-nums`), classificação do estado de conservação (Ótimo, Bom, Regular, Ruim, Crítico), nível de risco associado (Baixo, Médio, Alto) com badges semânticos de severidade fiscal, parecer técnico descritivo e galeria de fotos anexadas.

#### Scenario: Visualização de vistorias com laudo e fotos
- **WHEN** o usuário abre o Drawer de um jazigo que possui vistorias cadastradas
- **THEN** o sistema exibe os cartões cronológicos das vistorias com notas do fiscal e miniaturas clicáveis das fotografias

#### Scenario: Ausência de vistorias cadastradas
- **WHEN** o jazigo inspecionado não possui nenhuma vistoria registrada
- **THEN** o sistema exibe estado vazio indicando a ausência de vistorias com botão de atalho para registrar a primeira inspeção

### Requirement: Registro Ágil de Vistoria a partir do Inventário
O sistema SHALL permitir aos usuários autorizados registrar uma nova vistoria técnica diretamente a partir do Drawer do jazigo. O formulário DEVE coletar obrigatoriamente data da vistoria, estado de conservação, classificação de risco, observações técnicas e suporte a anexar fotografias, gravando o evento no histórico e atualizando a interface em tempo real.

#### Scenario: Registro bem-sucedido de nova vistoria
- **WHEN** o fiscal preenche os dados da vistoria e confirma o formulário
- **THEN** o sistema envia os dados para a API, anexa as fotos, atualiza a lista de vistorias no Drawer e recalcula o histórico da unidade
