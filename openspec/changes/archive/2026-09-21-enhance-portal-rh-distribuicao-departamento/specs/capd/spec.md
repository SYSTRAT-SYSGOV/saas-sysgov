# Spec Delta

## ADDED Requirements

### Requirement: Estrutura Organizacional Real na Aba de Distribuição
A aba "Distribuição por Pasta & Departamento" do Portal de RH e Secretaria Municipal de Gestão de
Pessoas SHALL exibir as secretarias e departamentos reais cadastrados no organograma do tenant
(módulo OrgChart), incluindo seus responsáveis reais, em vez de uma estrutura organizacional fixa
não vinculada ao tenant autenticado.

#### Scenario: Tenant com organograma próprio cadastrado
- **WHEN** o usuário abre a aba de Distribuição por Pasta & Departamento de um tenant com
  secretarias e departamentos cadastrados no OrgChart
- **THEN** a aba exibe exatamente as secretarias e departamentos daquele tenant, com o nome do
  responsável real de cada unidade, e não a estrutura de nenhum outro tenant

### Requirement: Indicadores Agregados Reais na Distribuição
Os indicadores agregados no topo da aba de Distribuição (total de secretarias, total de
departamentos, total de chefias nomeadas, total de servidores lotados e percentual de vínculos
institucionais) SHALL ser calculados a partir dos dados reais carregados pela aba, não a partir de
valores fixos.

#### Scenario: Contagens batem com os dados exibidos
- **WHEN** o usuário visualiza os indicadores agregados do topo da aba de Distribuição
- **THEN** o total de secretarias e departamentos exibido corresponde exatamente à quantidade de
  cards renderizados abaixo, e o total de servidores lotados corresponde à soma dos servidores
  listados em todos os departamentos

### Requirement: Classificação de Servidores por Unidade Organizacional
Cada servidor SHALL ser associado à sua unidade organizacional preferencialmente pelo vínculo
direto (`org_unit_id`); na ausência desse vínculo, o sistema SHALL usar correspondência textual
como alternativa. Um servidor que não corresponder a nenhuma unidade organizacional conhecida
SHALL ser exibido em uma categoria explícita de "não classificados", nunca descartado
silenciosamente.

#### Scenario: Servidor sem vínculo organizacional direto e sem correspondência textual
- **WHEN** um servidor não possui `org_unit_id` preenchido e seus dados textuais de lotação não
  correspondem a nenhuma unidade organizacional cadastrada
- **THEN** esse servidor aparece na categoria "não classificados" da aba de Distribuição, e é
  contabilizado no indicador agregado de servidores lotados
