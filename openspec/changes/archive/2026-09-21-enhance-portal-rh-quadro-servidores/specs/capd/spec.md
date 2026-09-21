# Spec Delta

## ADDED Requirements

### Requirement: Classificação Organizacional Real no Quadro de Servidores
A aba "Quadro Geral de Servidores" SHALL exibir a secretaria e o departamento reais de cada
servidor, derivados do organograma cadastrado no OrgChart (mesma classificação por `org_unit_id`
com fallback textual já usada na aba de Distribuição por Pasta & Departamento), em vez de uma
heurística de texto genérica. Um servidor sem unidade organizacional correspondente SHALL ser
exibido como "Não Classificado", nunca com uma sigla inventada a partir do texto livre de lotação.

#### Scenario: Servidor vinculado a uma unidade real do organograma
- **WHEN** o usuário visualiza o Quadro Geral de Servidores de um tenant com organograma
  cadastrado
- **THEN** a coluna de secretaria/departamento de cada servidor corresponde exatamente à unidade
  organizacional real à qual ele está classificado, igual à aba de Distribuição

#### Scenario: Servidor sem correspondência no organograma
- **WHEN** um servidor não possui `org_unit_id` nem lotação textual reconhecível por nenhuma
  unidade cadastrada
- **THEN** a coluna de secretaria/departamento exibe "Não Classificado"

### Requirement: Painel de Detalhe do Servidor no Quadro Geral
Ao clicar numa linha do Quadro Geral de Servidores, o sistema SHALL abrir um painel de detalhe
exibindo os dados cadastrais básicos do servidor, o histórico de avaliações de todos os ciclos
avaliativos (não apenas o ciclo ativo), os quinquênios registrados e os afastamentos do servidor.

#### Scenario: Consulta de detalhe de um servidor com histórico
- **WHEN** o usuário clica na linha de um servidor que possui avaliações em mais de um ciclo
- **THEN** o painel de detalhe lista as avaliações de todos os ciclos em que o servidor foi
  avaliado, não somente a do ciclo selecionado na aba
