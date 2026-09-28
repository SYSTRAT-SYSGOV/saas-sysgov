# cemiterio/inventario Specification (Delta)

## ADDED Requirements

### Requirement: Alertas e Indicadores de Inteligência Regulológica
O sistema SHALL computar e exibir indicadores e alertas visuais de inteligência regulológica para cada unidade de sepultamento, contemplando:
1. **Concessão Vencida ou a Vencer**: Alerta amarelo quando a concessão temporária expirar em menos de 60 dias e alerta vermelho quando já estiver expirada sem renovação formal.
2. **Elegibilidade para Exumação**: Alerta verde/azul sanitário quando uma inumação cumprir o interstício legal mínimo (3 anos para adultos, 2 anos para crianças) desde a data do óbito/sepultamento, sinalizando aos gestores que os despojos estão legalmente aptos para translado ao ossuário geral ou gaveta ossária familiar.
3. **Sinalização de Ruína e Abandono**: Alerta para jazigos classificados com estado de conservação Crítico ou com edital de abandono aberto.

Os prazos, dias decorridos e datas limite DEVEM ser expressos em tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).

#### Scenario: Jazigo com concessão temporária a expirar em menos de 60 dias
- **WHEN** o usuário visualiza a lista ou o Drawer de um jazigo cuja concessão temporária vence nos próximos 60 dias
- **THEN** o sistema exibe badge semântico de atenção indicando o vencimento iminente e a quantidade exata de dias restantes em JetBrains Mono

#### Scenario: Inumação que atingiu o prazo legal mínimo para exumação
- **WHEN** o jazigo possui inumação com data de sepultamento superior ao interstício sanitário municipal (ex: $\ge 3$ anos)
- **THEN** o sistema exibe o indicador visual "Elegível para Exumação" tanto na tabela quanto no painel de detalhes do jazigo

### Requirement: Filtragem Rápida por Critérios Regulatórios no Inventário
O sistema SHALL disponibilizar no painel de filtros avançados opções de segmentação rápida por critérios regulatórios:
- **Todos os status regulatórios** (padrão)
- **Elegível para Exumação**
- **Concessão a Vencer (< 60 dias)**
- **Concessão Vencida**
- **Em Processo de Notificação / Abandono**

#### Scenario: Filtro de jazigos elegíveis para exumação
- **WHEN** o gestor cemiterial seleciona o filtro "Elegível para Exumação"
- **THEN** a tabela exibe unicamente as sepulturas que possuem ocupantes com tempo de inumação igual ou superior ao prazo regulamentar, auxiliando o planejamento de abertura de novas vagas

#### Scenario: Filtro de concessões a vencer para notificação
- **WHEN** a administração cemiterial seleciona o filtro "Concessão a Vencer"
- **THEN** a tabela exibe unicamente os jazigos cujos contratos expiram em até 60 dias, permitindo gerar lista para contato e emissão de avisos
