# Spec Delta

## Purpose

Governa a experiência completa de gestão da listagem de concessões cemiteriais: filtros avançados
combináveis, indicadores financeiros por concessão, exportação da listagem filtrada e consulta de
histórico auditável, permitindo que operadores localizem e fiscalizem rapidamente concessões vencendo,
inadimplentes ou com pendência de regularização entre milhares de registros.

## ADDED Requirements

### Requirement: Filtros Avançados Combináveis na Listagem de Concessões
O sistema SHALL permitir filtrar a listagem de concessões, de forma combinável, por setor/quadra dentro da
necrópole ativa, modalidade (temporária/perpétua), situação (vigente/expirada/extinta), pendência de
regularização de sucessão hereditária, situação financeira (adimplente/inadimplente/sem guias emitidas) e
faixa de vencimento (vencidas, a vencer em até 30/60/90 dias, ou sem prazo por serem perpétuas), além de
busca textual por número da concessão, processo administrativo, código do jazigo, nome ou documento do
concessionário. O filtro nunca inclui necrópole, pois a aba de Concessões já opera exclusivamente sobre a
necrópole ativa selecionada, conforme `cemiterio/isolamento-contextual-abas`.

#### Scenario: Filtrar concessões a vencer nos próximos 30 dias
- **WHEN** o operador seleciona a faixa de vencimento "a vencer em até 30 dias" no painel de filtros
- **THEN** a listagem exibe somente concessões temporárias vigentes cujo término está entre a data atual e
  os próximos 30 dias, mantendo os demais filtros ativos combinados

#### Scenario: Combinar filtro de setor com situação
- **WHEN** o operador seleciona um setor/quadra específico e a situação "vigente"
- **THEN** a listagem exibe somente concessões vigentes cujo jazigo pertence ao setor selecionado, dentro
  da necrópole ativa

#### Scenario: Filtrar concessões inadimplentes
- **WHEN** o operador seleciona a situação financeira "Inadimplente" no painel de filtros
- **THEN** a listagem exibe somente concessões com ao menos uma guia emitida e vencida sem baixa de
  pagamento

### Requirement: Indicador de Situação Financeira por Concessão
O sistema SHALL exibir, para cada concessão na listagem, um indicador visual de situação financeira
calculado a partir das guias vinculadas a ela, distinguindo concessões adimplentes, inadimplentes e sem
nenhuma guia emitida.

#### Scenario: Concessão com guia vencida exibe indicador de inadimplência
- **WHEN** uma concessão possui ao menos uma guia com situação "emitida" e vencimento anterior à data atual
- **THEN** a linha correspondente na listagem exibe o indicador de "Inadimplente"

### Requirement: Exportação da Listagem Filtrada de Concessões
O sistema SHALL permitir exportar, nos formatos CSV, XLSX e PDF, exatamente o conjunto de concessões
resultante dos filtros ativos no momento da exportação, incluindo as colunas de identificação, jazigo,
concessionário, modalidade, datas, situação e situação financeira.

#### Scenario: Exportação respeita filtros ativos
- **WHEN** o operador aplica filtros de necrópole e situação e em seguida aciona a exportação em CSV
- **THEN** o arquivo gerado contém somente as concessões que atendem aos filtros aplicados, e não a
  totalidade das concessões do tenant

### Requirement: Histórico Auditável por Concessão
O sistema SHALL permitir que um operador com permissão de gestão de concessões consulte, a partir da
listagem, o histórico cronológico dos eventos de auditoria já registrados para uma concessão específica
(criação, renovações, transferência por sucessão hereditária e extinção), sem necessidade de navegar para
fora da aba de Concessões.

#### Scenario: Consulta de histórico de concessão renovada
- **WHEN** o operador abre o histórico de uma concessão que já foi renovada uma vez
- **THEN** o sistema exibe, em ordem cronológica, ao menos os eventos de criação e de renovação da
  concessão, cada um com data, usuário responsável e resumo da alteração
