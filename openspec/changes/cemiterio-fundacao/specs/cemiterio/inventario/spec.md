# Spec Delta

## Purpose

Mantém o inventário físico dos cemitérios do município — cemitérios, setores/quadras e jazigos/ossuários — com
o estado de cada unidade, sua capacidade e o controle de ocupação que bloqueia sepultamentos indevidos.

## ADDED Requirements

### Requirement: Cadastro de cemitérios
<!-- rastreabilidade: RF-01 -->
O sistema SHALL permitir cadastrar, editar, listar e desativar (exclusão lógica) múltiplos cemitérios do tenant,
com nome, código único no tenant, endereço, tipo (municipal, distrital, outro), situação (ativo/inativo),
responsável e limite geográfico (ver `cemiterio/gis`). Um cemitério com jazigos ocupados SHALL NOT ser excluído,
apenas inativado.

#### Scenario: Código duplicado no mesmo município
- **WHEN** o usuário cadastra um cemitério com código já usado por outro cemitério do mesmo tenant
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Mesmo código em municípios diferentes
- **WHEN** os tenants A e B cadastram cemitérios com o mesmo código
- **THEN** ambos os cadastros são aceitos e cada tenant enxerga apenas o seu

### Requirement: Cadastro de setores e quadras
<!-- rastreabilidade: RF-02 -->
O sistema SHALL permitir cadastrar setores/quadras vinculados a um cemitério do mesmo tenant, com código único
dentro do cemitério, descrição, tipo de zona (jazigos, gavetas, ossuário, cova pública) e área em metros
quadrados, calculada a partir da geometria quando ela existir.

#### Scenario: Setor vinculado a cemitério de outro tenant
- **WHEN** a requisição informa o identificador de um cemitério pertencente a outro tenant
- **THEN** o sistema responde como recurso inexistente (404) e não cria o setor

#### Scenario: Área calculada pela geometria
- **WHEN** o setor tem polígono desenhado no mapa
- **THEN** a área exibida é a área do polígono em metros quadrados

### Requirement: Cadastro de jazigos e ossuários
<!-- rastreabilidade: RF-03 -->
O sistema SHALL permitir cadastrar unidades de sepultamento (jazigo, gaveta, ossuário/nicho, cova pública)
vinculadas a um setor, com código único no cemitério, tipo, capacidade máxima de restos (inteiro ≥ 1),
dimensões, coordenadas (ponto central derivado da geometria) e estado. A ocupação atual SHALL ser derivada das
inumações e remoções registradas e SHALL NOT ser editável manualmente.

#### Scenario: Capacidade inválida
- **WHEN** o usuário cadastra um jazigo com capacidade 0
- **THEN** o sistema rejeita com erro de validação

### Requirement: Máquina de estados do jazigo
<!-- rastreabilidade: RF-04 -->
Cada jazigo SHALL estar em exatamente um estado: Disponível, Concedido, Ocupado, Capacidade Máxima ou Em
Ruína/Manutenção. O sistema SHALL aplicar somente as transições: Disponível→Concedido (concessão ativada);
Concedido→Ocupado (primeira inumação confirmada); Ocupado→Capacidade Máxima (ocupação atinge a capacidade);
Capacidade Máxima→Ocupado e Ocupado→Concedido (exumação, trasladação ou cancelamento de inumação libera espaço);
Concedido→Disponível (concessão expirada ou extinta sem restos); Disponível→Ocupado somente para cova pública
(inumação sem concessão); qualquer estado→Em Ruína/Manutenção e retorno ao estado anterior. As transições para
Ocupado e Capacidade Máxima são automáticas, resultantes de operações; toda transição SHALL ser registrada no
histórico do jazigo com data, autor e motivo.

#### Scenario: Transição manual inválida
- **WHEN** um usuário tenta mudar manualmente um jazigo Disponível para Ocupado
- **THEN** o sistema rejeita a transição e mantém o estado Disponível

#### Scenario: Ocupação atinge a capacidade
- **WHEN** uma inumação é confirmada em um jazigo de capacidade 3 que já tinha 2 restos
- **THEN** o jazigo passa automaticamente para Capacidade Máxima e a transição fica no histórico

### Requirement: Bloqueio de sepultamento em capacidade máxima ou manutenção
<!-- rastreabilidade: RF-05; UC-01 -->
O sistema SHALL recusar qualquer inumação em jazigo nos estados Capacidade Máxima ou Em Ruína/Manutenção,
retornando o motivo do bloqueio.

#### Scenario: Tentativa em jazigo lotado
- **WHEN** um atendente solicita inumação em jazigo em Capacidade Máxima
- **THEN** o sistema recusa a solicitação com erro de regra de negócio (422) informando "capacidade máxima"

### Requirement: Alocação concorrente de jazigo
<!-- rastreabilidade: RNF-06 -->
Alterações de estado e ocupação de um jazigo SHALL usar controle de concorrência otimista: uma atualização
baseada em versão desatualizada do jazigo SHALL ser rejeitada com conflito (409), sem efeitos parciais.

#### Scenario: Duas concessões simultâneas no mesmo jazigo
- **WHEN** dois atendentes tentam conceder o mesmo jazigo Disponível ao mesmo tempo
- **THEN** exatamente uma operação é efetivada e a outra recebe 409 com orientação para recarregar

### Requirement: Histórico do jazigo
<!-- rastreabilidade: RF-19 -->
O sistema SHALL disponibilizar, para cada jazigo, a linha do tempo de estados, concessões, inumações,
exumações, trasladações, vistorias e obras, ordenada por data.

#### Scenario: Consulta de histórico
- **WHEN** um usuário autorizado consulta o histórico de um jazigo
- **THEN** o sistema retorna os eventos em ordem cronológica, sem causa da morte para quem não tem permissão restrita
