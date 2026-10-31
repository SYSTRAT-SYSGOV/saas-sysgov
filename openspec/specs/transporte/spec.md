# transporte Specification

## Purpose
Transporte escolar das prefeituras: cadastro de frota (própria, locada e terceirizada), motoristas, empresas e vistorias com alertas de vencimento; paradas, rotas e itinerários por ano letivo; alocação de alunos com controle de capacidade, acessibilidade e regularidade; importação por CSV; Censo (Registro 60) com pré-validação, escolha de campos e modelos de exportação; painel de lotação e auditoria. Consolida as cinco fases do módulo. Guia de uso em `docs/modules/transporte.md`.

**Estado atual do Censo:** o requisito "Arquivo do Registro 60 no leiaute oficial do Educacenso" é o alvo. Hoje o módulo gera o **leiaute básico em CSV** (`basico-1`), provisório, porque o órgão ainda não obteve o documento oficial do Inep; o leiaute oficial entra como nova implementação da interface `Leiaute`, sem alterar as regras.

## Requirements

### Requirement: Isolamento por tenant do módulo Transporte
Todas as tabelas `transporte_*` DEVEM ter `tenant_id` com índices compostos iniciando por ele, e todos os models DEVEM usar `TenantAware`. Dados de um tenant NUNCA devem aparecer para outro.

#### Scenario: Frota de outro tenant
- **GIVEN** o tenant A tem 3 veículos e o tenant B tem 2
- **WHEN** um usuário do tenant B lista os veículos
- **THEN** a resposta traz apenas os 2 veículos do tenant B

#### Scenario: Criação sem tenant resolvido
- **WHEN** um registro do módulo é criado sem tenant no contexto
- **THEN** o sistema lança `LogicException` e nada é gravado

### Requirement: Permissões e perfis do módulo Transporte
O módulo DEVE declarar as permissões `transporte.view`, `transporte.frota.manage`, `transporte.rotas.manage`, `transporte.alocacoes.manage`, `transporte.alocacoes.override_capacity`, `transporte.censo.export` e `transporte.audit`, e DEVE criar os perfis Coordenação de Transporte, Operador e Consulta por seeder idempotente. A autorização DEVE ser conferida no servidor, por objeto, por Policy.

#### Scenario: Usuário só com consulta
- **GIVEN** um usuário com o perfil Consulta
- **WHEN** ele tenta criar um veículo
- **THEN** o servidor responde 403 e nada é gravado

#### Scenario: Seeder repetido
- **WHEN** o seeder de RBAC roda duas vezes
- **THEN** as permissões e os perfis não são duplicados

### Requirement: Cadastro de empresas de transporte
O sistema DEVE permitir cadastrar uma empresa a partir de uma **pessoa jurídica** do Cadastro de Pessoas, com `tipo` `prestadora` (serviço terceirizado) ou `locadora` (aluguel de veículos). Toda empresa DEVE ter número do contrato e vigência (início e fim, com fim igual ou posterior ao início). Uma pessoa jurídica só pode ser empresa uma vez por tenant. A frota própria da prefeitura NÃO é uma empresa: é a origem `propria` do veículo.

#### Scenario: Empresa prestadora
- **WHEN** um usuário autorizado cadastra a pessoa jurídica "Viação Rio Claro" como `prestadora` com contrato 12/2026 de 01/02/2026 a 31/12/2026
- **THEN** a empresa é criada ativa e aparece com o CNPJ vindo do Cadastro de Pessoas

#### Scenario: Empresa sem contrato
- **WHEN** o cadastro de empresa `locadora` não informa a vigência
- **THEN** o sistema responde 422 e indica o campo

#### Scenario: Pessoa física informada
- **WHEN** o cadastro aponta uma pessoa física como empresa
- **THEN** o sistema responde 422

#### Scenario: Contrato vencido
- **GIVEN** uma empresa com vigência até ontem
- **WHEN** a empresa é consultada
- **THEN** ela é exibida como "contrato vencido" e entra nos alertas como crítica

### Requirement: Cadastro de motoristas e elegibilidade pelo CTB
O sistema DEVE permitir cadastrar um motorista a partir de uma **pessoa física** do Cadastro de Pessoas, guardando CNH (número único por tenant, categoria `D` ou `E`, primeira habilitação e validade), curso especializado (certificado e validade) e exame toxicológico (data e validade), com vínculo opcional a uma empresa. O sistema DEVE calcular a elegibilidade: CNH D/E com validade futura, idade acima de 21 anos, curso e toxicológico com validade futura, devolvendo os motivos de inelegibilidade. Ativar um motorista inelegível DEVE ser recusado.

#### Scenario: Motorista elegível
- **GIVEN** uma pessoa de 40 anos
- **WHEN** é cadastrada como motorista com CNH categoria D válida, curso e toxicológico válidos
- **THEN** o motorista é criado ativo e `elegivel` é verdadeiro

#### Scenario: CNH categoria B
- **WHEN** o cadastro informa CNH categoria B
- **THEN** o sistema responde 422 e não cria o motorista

#### Scenario: Toxicológico vencido
- **WHEN** um motorista ativo é consultado e o toxicológico venceu ontem
- **THEN** `elegivel` é falso, o motivo `toxicologico_vencido` é listado e o motorista entra nos alertas como crítico

#### Scenario: Menor de 21 anos
- **GIVEN** uma pessoa com 20 anos
- **WHEN** tenta-se ativá-la como motorista
- **THEN** o sistema responde 422 com o motivo `idade_minima`

#### Scenario: Mesma pessoa duas vezes
- **GIVEN** a pessoa já é motorista no tenant
- **WHEN** outro cadastro usa a mesma pessoa
- **THEN** o sistema responde 409

### Requirement: Cadastro de veículos
O sistema DEVE permitir cadastrar veículos com descrição, placa única por tenant, capacidade de passageiros maior que zero, tipologia Inep entre 1 e 11, tipo de rede (`rural`, `urbana` ou `mista`), indicadores de uso exclusivo e de acessibilidade, **origem** (`propria`, `locada` ou `terceirizada`) e motorista padrão opcional. Veículo `proprio` NÃO tem empresa; `locado` exige empresa `locadora` e `terceirizado` exige empresa `prestadora`. A placa DEVE ser normalizada (maiúsculas, sem hífen nem espaços) e aceitar o formato antigo e o Mercosul. A inativação DEVE exigir motivo.

#### Scenario: Veículo próprio
- **WHEN** um veículo de origem `propria` é cadastrado sem empresa
- **THEN** ele é criado e não depende de contrato

#### Scenario: Veículo locado sem locadora
- **WHEN** um veículo de origem `locada` é cadastrado sem empresa, ou com uma empresa `prestadora`
- **THEN** o sistema responde 422

#### Scenario: Locadora com contrato vencido
- **GIVEN** um veículo `locado` cuja locadora tem o contrato vencido
- **WHEN** o veículo é consultado
- **THEN** ele é exibido como irregular pelo motivo `contrato_vencido`

#### Scenario: Placa normalizada
- **WHEN** um veículo é cadastrado com a placa "abc-1d23"
- **THEN** o sistema grava "ABC1D23"

#### Scenario: Placa duplicada
- **GIVEN** já existe o veículo "ABC1D23" no tenant
- **WHEN** outro veículo é cadastrado com "abc1d23"
- **THEN** o sistema responde 409

#### Scenario: Capacidade inválida
- **WHEN** a capacidade informada é zero
- **THEN** o sistema responde 422

#### Scenario: Inativação sem motivo
- **WHEN** um veículo é inativado sem motivo
- **THEN** o sistema responde 422 e o veículo continua ativo

### Requirement: Vistoria semestral do DETRAN
O sistema DEVE registrar cada vistoria com data, número do certificado e validade (igual ou posterior à data), mantendo todo o histórico. Um veículo DEVE ser considerado **regular** somente quando estiver ativo e a vistoria de maior validade não tiver vencido. Registrar uma vistoria nova NUNCA apaga as anteriores.

#### Scenario: Vistoria nova torna o veículo regular
- **GIVEN** um veículo com a última vistoria vencida
- **WHEN** o usuário registra uma vistoria com validade futura
- **THEN** o veículo passa a regular e a vistoria antiga continua no histórico

#### Scenario: Veículo sem vistoria
- **GIVEN** um veículo recém-cadastrado
- **WHEN** ele é consultado
- **THEN** a situação é "sem vistoria" e ele não é regular

#### Scenario: Validade anterior à data
- **WHEN** a vistoria informa validade anterior à data da vistoria
- **THEN** o sistema responde 422

### Requirement: Alertas de vencimento
O sistema DEVE listar alertas de CNH, curso especializado, exame toxicológico, vistoria e contrato **vencidos** (críticos) ou que vencem em até 30 dias (atenção), informando o tipo, o item (motorista, veículo ou empresa) e a data. Itens inativos NÃO geram alerta.

#### Scenario: CNH a vencer
- **GIVEN** um motorista ativo com a CNH vencendo em 12 dias
- **WHEN** os alertas são consultados
- **THEN** há um alerta de atenção `cnh` com a data de vencimento

#### Scenario: Vistoria vencida
- **GIVEN** um veículo ativo com vistoria vencida
- **WHEN** os alertas são consultados
- **THEN** há um alerta crítico `vistoria` com a placa e a data

#### Scenario: Item inativo
- **GIVEN** um veículo inativo com vistoria vencida
- **WHEN** os alertas são consultados
- **THEN** não há alerta para ele

#### Scenario: Sem pendências
- **WHEN** nenhum documento está vencido nem a vencer
- **THEN** a lista vem vazia

### Requirement: Exclusão lógica sem perda de histórico
Empresas, motoristas e veículos DEVEM ser excluídos de forma lógica. Registros usados por rotas ou alocações NÃO podem ser excluídos; devem ser inativados.

#### Scenario: Veículo excluído
- **WHEN** um veículo sem uso é excluído
- **THEN** ele some das listagens padrão e a placa pode ser reutilizada

### Requirement: Auditoria do módulo Transporte
Toda criação, edição, inativação e exclusão do módulo DEVE ser registrada no `audit_logs` com o estado antes e depois. A consulta da auditoria DEVE exigir `transporte.audit`.

#### Scenario: Edição auditada
- **WHEN** a capacidade de um veículo muda de 20 para 24
- **THEN** o `audit_logs` guarda o antes e o depois, o usuário e o IP

#### Scenario: Consulta sem permissão
- **WHEN** um usuário sem `transporte.audit` abre a auditoria
- **THEN** o servidor responde 403

### Requirement: Telas da frota no portal do Cliente
O portal do Cliente DEVE ter o módulo "Transporte Escolar" com visão geral (alertas), empresas, motoristas e veículos, usando somente componentes de `@sysgov/ui`, exibindo placa, CNH, CNPJ e datas em fonte técnica (`font-mono tabular-nums`) e escondendo as ações de escrita de quem não tem `transporte.frota.manage`.

#### Scenario: Placa em fonte técnica
- **WHEN** a lista de veículos é exibida
- **THEN** a placa aparece em caixa alta e fonte monoespaçada

#### Scenario: Botão sem permissão
- **WHEN** um usuário só com `transporte.view` abre os veículos
- **THEN** não há botões de criar, editar ou excluir

### Requirement: Pontos de parada georreferenciados
O sistema DEVE permitir cadastrar pontos de parada com nome, endereço de referência e coordenadas opcionais, validando latitude entre -90 e 90 e longitude entre -180 e 180. Latitude e longitude DEVEM ser informadas juntas ou ficar ambas vazias.

#### Scenario: Ponto com coordenadas válidas
- **WHEN** um ponto é cadastrado com latitude -25,43 e longitude -49,27
- **THEN** ele fica disponível para compor itinerários e aparece no mapa

#### Scenario: Coordenada fora da faixa
- **WHEN** a latitude informada é 120
- **THEN** o sistema responde 422 e não cria o ponto

#### Scenario: Só uma coordenada
- **WHEN** o cadastro traz latitude e não traz longitude
- **THEN** o sistema responde 422

#### Scenario: CEP indisponível
- **WHEN** a consulta de CEP falha no navegador
- **THEN** os campos de endereço continuam editáveis e o cadastro pode ser salvo

### Requirement: Cadastro de rotas
O sistema DEVE permitir cadastrar rotas com nome, escola de destino, ano letivo, turno (`manha`, `tarde`, `noite` ou `integral`), tipo de rede, empresa, veículo e motorista opcionais, quilometragem pavimentada e não pavimentada (não negativas, 2 casas decimais) e horários de saída, chegada e retorno. O total de quilômetros DEVE ser a soma das duas extensões.

#### Scenario: Rota criada
- **WHEN** um usuário autorizado cadastra uma rota com escola, ano letivo 2026 e turno da manhã
- **THEN** a rota é criada ativa

#### Scenario: Total de quilômetros
- **WHEN** a rota informa 12,50 km pavimentados e 7,25 km não pavimentados
- **THEN** o sistema apresenta 19,75 km de total

#### Scenario: Quilometragem negativa
- **WHEN** qualquer extensão informada é negativa
- **THEN** o sistema responde 422

#### Scenario: Escola de outro tenant
- **WHEN** a rota aponta para uma escola de outro tenant
- **THEN** o sistema responde 422

### Requirement: Regularidade de empresa, veículo e motorista na rota
Ao criar ou editar uma rota, o sistema DEVE recusar com 409, indicando o item, quando a empresa da rota ou a empresa do veículo (locadora ou prestadora) tiver contrato vencido, o veículo estiver inativo ou sem vistoria válida, ou o motorista estiver inativo ou inelegível. Uma rota já gravada que ficar irregular depois NÃO deve ser alterada: ela DEVE ser exibida como irregular, com os motivos.

#### Scenario: Veículo com vistoria vencida
- **WHEN** a rota é salva com um veículo cuja vistoria venceu
- **THEN** o sistema responde 409 e indica o veículo e a data de vencimento

#### Scenario: Motorista inelegível
- **WHEN** a rota é salva com um motorista com toxicológico vencido
- **THEN** o sistema responde 409

#### Scenario: Rota que ficou irregular
- **GIVEN** uma rota regular cujo veículo teve a vistoria vencida ontem
- **WHEN** a rota é listada
- **THEN** ela aparece com o selo "irregular" e o motivo `vistoria_vencida`, sem ter sido alterada

#### Scenario: Veículo próprio
- **GIVEN** um veículo de origem `propria`, ativo e com vistoria válida
- **WHEN** a rota é salva com ele e sem empresa
- **THEN** não há bloqueio por contrato

#### Scenario: Veículo locado com contrato vencido
- **GIVEN** um veículo `locado` cuja locadora tem o contrato vencido
- **WHEN** a rota é salva com ele
- **THEN** o sistema responde 409 indicando a locadora e a data

### Requirement: Itinerário ordenado
O sistema DEVE manter, para cada rota, uma sequência de paradas com ordem única, sem repetir a parada na mesma rota, com horários previstos de embarque e desembarque opcionais. A reordenação DEVE ser atômica.

#### Scenario: Parada adicionada ao fim
- **WHEN** uma parada é adicionada a uma rota com 3 paradas
- **THEN** ela recebe a ordem 4

#### Scenario: Parada repetida
- **WHEN** a mesma parada é adicionada duas vezes à rota
- **THEN** o sistema responde 409 e mantém o itinerário

#### Scenario: Reordenação
- **WHEN** o usuário envia a lista das paradas em nova ordem
- **THEN** a nova ordem é gravada de uma vez, sem violar a unicidade da ordem

#### Scenario: Reordenação com parada de fora
- **WHEN** a lista inclui uma parada que não pertence à rota
- **THEN** o sistema responde 422 e a ordem anterior é mantida

#### Scenario: Remoção de parada
- **WHEN** uma parada é retirada do meio do itinerário
- **THEN** as demais são renumeradas sem lacuna

### Requirement: Consulta de rotas e de paradas por rota
O sistema DEVE listar rotas com paginação, filtrando por ano letivo, escola, turno, tipo de rede e situação, devolvendo a contagem de paradas. O sistema DEVE listar as paradas de uma rota na ordem do itinerário.

#### Scenario: Filtro por ano e turno
- **WHEN** o usuário filtra por ano letivo 2026 e turno da manhã
- **THEN** o sistema devolve só as rotas correspondentes, com a contagem de paradas

#### Scenario: Paradas de rotas diferentes
- **GIVEN** duas rotas com paradas distintas
- **WHEN** as paradas de uma delas são consultadas
- **THEN** só as paradas dela aparecem, na ordem do itinerário

### Requirement: Exclusão e inativação de paradas e rotas
Parada usada em algum itinerário NÃO pode ser excluída (409); pode ser inativada. Rota só pode ser excluída se nunca teve alocação (Fase 3); caso contrário, é inativada.

#### Scenario: Parada em uso
- **WHEN** o usuário exclui uma parada que está num itinerário
- **THEN** o sistema responde 409 e sugere inativar

### Requirement: Mapa do itinerário
O portal do Cliente DEVE exibir o itinerário de uma rota em mapa, com marcadores numerados na ordem e uma linha ligando-os, e DEVE listar as paradas sem coordenadas fora do mapa, com o aviso "sem coordenada".

#### Scenario: Rota georreferenciada
- **WHEN** o usuário abre o mapa de uma rota com todas as paradas coordenadas
- **THEN** os marcadores aparecem numerados na ordem do itinerário

#### Scenario: Parada sem coordenada
- **WHEN** uma parada não tem latitude e longitude
- **THEN** ela aparece na lista lateral com o aviso e não gera marcador

### Requirement: Auditoria e permissões de paradas e rotas
Toda mutação de paradas, rotas e itinerários DEVE ser auditada, e DEVE exigir `transporte.rotas.manage`; a consulta exige `transporte.view`.

#### Scenario: Usuário sem permissão de rotas
- **GIVEN** um usuário só com `transporte.frota.manage`
- **WHEN** ele tenta criar uma rota
- **THEN** o servidor responde 403

### Requirement: Alocação de aluno em rota e parada
O sistema DEVE permitir alocar um aluno ativo do cadastro escolar a uma rota e a uma parada **do itinerário daquela rota**, exigindo que a turma do aluno seja do mesmo ano letivo da rota, registrando a data de início, o uso de transporte rural e o poder público responsável (1 estadual, 2 municipal, 3 compartilhado). O sistema NÃO DEVE permitir duas alocações ativas do mesmo aluno na mesma rota.

#### Scenario: Alocação válida
- **GIVEN** um aluno ativo, de turma do ano letivo 2026, e uma rota de 2026 com a parada no itinerário
- **WHEN** um usuário com `transporte.alocacoes.manage` aloca o aluno nessa parada
- **THEN** a alocação é criada ativa e passa a contar na ocupação da rota

#### Scenario: Parada fora do itinerário
- **WHEN** a parada informada não pertence ao itinerário da rota
- **THEN** o sistema responde 422 e não cria a alocação

#### Scenario: Aluno transferido
- **WHEN** o aluno tem situação `transferido`
- **THEN** o sistema responde 422

#### Scenario: Ano letivo diferente
- **WHEN** a turma do aluno é de 2025 e a rota é de 2026
- **THEN** o sistema responde 422

#### Scenario: Aluno já alocado na rota
- **GIVEN** o aluno tem alocação ativa na rota
- **WHEN** uma nova alocação dele na mesma rota é pedida
- **THEN** o sistema responde 409

#### Scenario: Poder público inválido
- **WHEN** o poder público responsável informado é 4
- **THEN** o sistema responde 422

### Requirement: Controle de capacidade do veículo
O sistema DEVE recusar com 409 a alocação que ultrapasse a capacidade do veículo da rota, conferindo a contagem em transação com lock na rota para que alocações simultâneas não passem do limite. Rota sem veículo NÃO DEVE receber alocação. A exceção DEVE exigir a permissão `transporte.alocacoes.override_capacity` e uma justificativa, que DEVE ser auditada.

#### Scenario: Limite atingido
- **GIVEN** uma rota com veículo de capacidade 2 e 2 alunos alocados
- **WHEN** um terceiro aluno é alocado sem permissão de exceção
- **THEN** o sistema responde 409 informando a capacidade (2) e a ocupação (2)

#### Scenario: Exceção autorizada
- **WHEN** um usuário com `override_capacity` aloca o terceiro aluno com a justificativa "Único transporte durante a reforma da van"
- **THEN** a alocação é criada, a rota passa a vermelha e o evento `alocacao.excesso_autorizado` é auditado com a justificativa

#### Scenario: Exceção sem justificativa
- **WHEN** o usuário com `override_capacity` pede a alocação acima do limite sem justificativa
- **THEN** o sistema responde 409

#### Scenario: Concorrência
- **GIVEN** uma rota com 1 vaga e duas alocações enviadas ao mesmo tempo
- **WHEN** as duas são processadas
- **THEN** só uma é criada e a outra recebe 409

#### Scenario: Rota sem veículo
- **WHEN** se tenta alocar um aluno em rota sem veículo
- **THEN** o sistema responde 409

### Requirement: Revalidação a cada alocação
A cada alocação, o sistema DEVE revalidar o contrato da empresa, a vistoria do veículo e a elegibilidade do motorista da rota, recusando com 409, e indicando o item, qualquer irregularidade.

#### Scenario: Vistoria vencida depois de criada a rota
- **GIVEN** uma rota cujo veículo teve a vistoria vencida
- **WHEN** um aluno é alocado
- **THEN** o sistema responde 409 indicando o veículo

### Requirement: Necessidade especial e acessibilidade
O sistema DEVE permitir indicar que o aluno precisa de transporte adaptado e DEVE recusar com 409 a alocação dele em rota cujo veículo não seja acessível. A observação textual da necessidade DEVE ser tratada como dado sensível: visível só a quem tem `transporte.alocacoes.manage`, auditada na leitura e na escrita, e ausente de listagens gerais e exportações.

#### Scenario: Veículo não adaptado
- **WHEN** um aluno com necessidade especial é alocado em rota com veículo não acessível
- **THEN** o sistema responde 409 indicando a exigência de veículo adaptado

#### Scenario: Consulta sem permissão de gerir
- **GIVEN** um usuário só com `transporte.view`
- **WHEN** ele lista as alocações da rota
- **THEN** a observação da necessidade não vem na resposta

#### Scenario: Leitura auditada
- **WHEN** um gestor abre a ficha da alocação com a observação
- **THEN** a leitura é registrada no `audit_logs`

### Requirement: Turno da alocação
A alocação DEVE usar o turno da rota. Quando o turno da turma do aluno for reconhecível e divergir do turno da rota, o sistema DEVE criar a alocação com o aviso `turno_divergente`, sem bloquear.

#### Scenario: Turno divergente
- **GIVEN** a rota é da manhã e a turma do aluno é da tarde
- **WHEN** o aluno é alocado
- **THEN** a alocação é criada com o aviso `turno_divergente`

### Requirement: Encerramento de alocação
O sistema DEVE permitir encerrar a alocação informando a data de término e o motivo, mantendo o registro no histórico e liberando a vaga. A data de término NÃO pode ser anterior à de início.

#### Scenario: Desvínculo
- **WHEN** um usuário encerra a alocação de um aluno
- **THEN** ela fica com data e motivo, sai da ocupação e continua visível no histórico

#### Scenario: Data anterior ao início
- **WHEN** a data de término é anterior à de início
- **THEN** o sistema responde 422

### Requirement: Encerramento automático por mudança do aluno
Quando um aluno com alocação ativa deixa de estar ativo (transferido ou remanejado) ou é excluído do cadastro escolar, o sistema DEVE encerrar as alocações ativas dele na data do evento, com motivo `aluno_{situacao}`.

#### Scenario: Aluno transferido
- **GIVEN** um aluno com alocação ativa
- **WHEN** a situação dele muda para `transferido`
- **THEN** a alocação é encerrada e a rota ganha uma vaga

### Requirement: Ocupação por rota
O sistema DEVE calcular, por rota, a quantidade de alocações ativas, a capacidade do veículo, o percentual de ocupação e a faixa: verde até 80 %, amarelo de 81 % a 100 % e vermelho acima de 100 %. Rota sem veículo DEVE ser "não calculável" e marcada como pendência.

#### Scenario: Ocupação parcial
- **WHEN** a rota tem 20 alunos e veículo de capacidade 40
- **THEN** a ocupação é 50 % e a faixa é verde

#### Scenario: Limite exato
- **WHEN** a rota tem 40 alunos e capacidade 40
- **THEN** a ocupação é 100 % e a faixa é amarela

#### Scenario: Superlotação
- **WHEN** a rota tem 41 alunos e capacidade 40
- **THEN** a faixa é vermelha

### Requirement: Condições do Registro 60 na alocação
A alocação DEVE guardar o atendimento curricular (padrão verdadeiro), a mediação didática (`presencial`, `semipresencial` ou `distancia`; padrão `presencial`) e o país de residência (padrão `BR`), usados pela Fase 4 para anular a declaração de transporte público.

#### Scenario: Valores padrão
- **WHEN** uma alocação é criada sem esses campos
- **THEN** ficam `true`, `presencial` e `BR`

### Requirement: Telas de alocação
O portal do Cliente DEVE mostrar, na rota, os alunos alocados (com ocupação e faixa), permitir alocar e encerrar para quem tem `transporte.alocacoes.manage` e usar um seletor de aluno que busque no cadastro escolar. Todos os componentes DEVEM vir de `@sysgov/ui`.

#### Scenario: Seletor de aluno
- **WHEN** o usuário digita parte do nome do aluno
- **THEN** a lista mostra alunos ativos do ano letivo da rota

### Requirement: Isolamento e auditoria das alocações
Alocações DEVEM respeitar o isolamento por tenant, e toda alocação, edição e encerramento DEVE ser auditado.

#### Scenario: Aluno de outro tenant
- **WHEN** a requisição aponta um aluno de outro tenant
- **THEN** o sistema responde 404

### Requirement: Pré-validação do Registro 60
O sistema DEVE gerar, por ano letivo, a pré-validação do transporte para o Censo, listando por aluno as pendências `sem_alocacao_ativa` (aluno que teve alocação no ano e não tem nenhuma ativa), `rota_sem_veiculo`, `rural_sem_declaracao`, `veiculo_nao_adaptado` e `sem_codigo_inep`, e o aviso `turno_divergente`. O sistema DEVE marcar `approved` somente quando não houver pendência; o aviso não impede a aprovação. Exige `transporte.censo.export`.

#### Scenario: Rota sem veículo
- **GIVEN** um aluno alocado em rota sem veículo
- **WHEN** a pré-validação do ano é executada
- **THEN** o aluno aparece com a pendência `rota_sem_veiculo` e `approved` é falso

#### Scenario: Necessidade especial em veículo comum
- **GIVEN** um aluno com necessidade especial alocado em veículo não acessível
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `veiculo_nao_adaptado`

#### Scenario: Aluno rural sem declaração
- **GIVEN** uma alocação em rota rural com `usa_transporte_rural` falso
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `rural_sem_declaracao`

#### Scenario: Aluno sem código Inep
- **GIVEN** o leiaute do ano exige o código Inep do aluno e ele não está cadastrado
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `sem_codigo_inep`

#### Scenario: Sem pendências
- **WHEN** todos os dados estão consistentes
- **THEN** `approved` é verdadeiro e a lista vem vazia

#### Scenario: Só aviso de turno
- **GIVEN** a única ocorrência é um `turno_divergente`
- **WHEN** a pré-validação é executada
- **THEN** o aviso é listado e `approved` continua verdadeiro

#### Scenario: Usuário sem permissão
- **WHEN** um usuário sem `transporte.censo.export` pede a pré-validação
- **THEN** o servidor responde 403

### Requirement: Arquivo do Registro 60 no leiaute oficial do Educacenso
O sistema DEVE gerar o arquivo do Registro 60 conforme o leiaute oficial vigente do Inep para o ano do Censo, com uma linha por alocação ativa do ano letivo, preenchendo transporte público, poder público responsável e as onze tipologias de veículo, e escolhendo o leiaute pelo ano informado. Os campos de matrícula que o módulo não possui DEVEM sair vazios onde o leiaute permitir.

#### Scenario: Aluno transportado por ônibus municipal
- **GIVEN** um aluno com poder público 2 em rota com veículo de tipologia 3
- **WHEN** o arquivo do ano é gerado
- **THEN** a linha tem transporte público 1, poder público 2 e a tipologia ônibus marcada, com as demais zeradas

#### Scenario: Tipologia ferroviária
- **GIVEN** um veículo de tipologia 11
- **WHEN** o arquivo é gerado
- **THEN** a tipologia ferroviário está marcada

#### Scenario: Alocação encerrada
- **GIVEN** um aluno com alocação encerrada
- **WHEN** o arquivo é gerado
- **THEN** ele não tem linha

#### Scenario: Ano sem leiaute implementado
- **WHEN** se pede o arquivo de um ano para o qual não há leiaute implementado
- **THEN** o sistema responde 422 informando os anos disponíveis

#### Scenario: Arquivo de referência
- **GIVEN** o exemplo do documento oficial do ano
- **WHEN** os mesmos dados são gerados pelo sistema
- **THEN** o arquivo é idêntico ao de referência

### Requirement: Anulação da declaração de transporte público
O sistema DEVE deixar vazios os campos de transporte público e zerar as tipologias na linha do aluno cuja alocação não tem atendimento curricular, tem mediação didática `distancia` ou tem país de residência diferente de `BR`.

#### Scenario: Sem atendimento curricular
- **GIVEN** uma alocação com `atendimento_curricular` falso
- **WHEN** o arquivo é gerado
- **THEN** transporte público e poder público ficam vazios

#### Scenario: Ensino a distância
- **GIVEN** uma alocação com mediação `distancia`
- **WHEN** o arquivo é gerado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Residência no exterior
- **GIVEN** uma alocação com país de residência `PY`
- **WHEN** o arquivo é gerado
- **THEN** os campos de transporte público ficam vazios

#### Scenario: Caso comum
- **GIVEN** atendimento curricular, mediação presencial e país `BR`
- **WHEN** o arquivo é gerado
- **THEN** a declaração não é anulada

### Requirement: Escolha dos campos a exportar
O sistema DEVE oferecer, por leiaute, um catálogo de campos do Registro 60 em que o usuário marca quais exportar. Campos obrigatórios do leiaute DEVEM vir marcados e NÃO PODEM ser desmarcados. No arquivo oficial, o campo não selecionado DEVE sair vazio na sua posição; no CSV de conferência, DEVE ser omitido. Campos sensíveis DEVEM exigir confirmação explícita, e a observação de necessidade especial NÃO DEVE existir no catálogo.

#### Scenario: Campo opcional desmarcado
- **GIVEN** um campo opcional do leiaute
- **WHEN** o usuário o desmarca e gera o arquivo oficial
- **THEN** a posição do campo continua no arquivo, vazia, e as demais não mudam de lugar

#### Scenario: Campo omitido no CSV
- **WHEN** o mesmo campo desmarcado é usado no CSV de conferência
- **THEN** a coluna não aparece

#### Scenario: Campo obrigatório
- **WHEN** o usuário tenta desmarcar um campo obrigatório do leiaute
- **THEN** a interface o mantém marcado e explica que o leiaute o exige

#### Scenario: Campo sensível
- **WHEN** o usuário marca um campo sensível
- **THEN** o sistema pede confirmação e o campo consta na auditoria da geração

#### Scenario: Observação de necessidade especial
- **WHEN** o catálogo de campos é listado
- **THEN** a observação da necessidade especial não está nele

#### Scenario: Campo selecionado sem dado
- **GIVEN** um campo selecionado que nenhum aluno tem preenchido
- **WHEN** a pré-validação é executada
- **THEN** aparece a pendência `campo_sem_dado` com o nome do campo

### Requirement: Modelos de exportação
O sistema DEVE permitir salvar a seleção de campos como um modelo nomeado, por leiaute e por tenant, reaplicá-lo, editá-lo e excluí-lo, e DEVE ter um modelo padrão "Registro 60 completo" que não pode ser excluído nem alterado.

#### Scenario: Salvar e reaplicar
- **WHEN** o usuário salva a seleção como "Conferência da Secretaria" e a escolhe numa outra sessão
- **THEN** os mesmos campos vêm marcados

#### Scenario: Modelo padrão
- **WHEN** o usuário tenta excluir o modelo "Registro 60 completo"
- **THEN** o sistema responde 409

#### Scenario: Modelo de outro tenant
- **WHEN** um usuário pede o modelo de outro tenant
- **THEN** o sistema responde 404

#### Scenario: Modelo de outro leiaute
- **WHEN** um modelo salvo para um ano é aplicado a um ano cujo leiaute não tem alguns dos campos
- **THEN** os campos inexistentes são ignorados e o usuário é avisado

### Requirement: CSV de conferência
O sistema DEVE oferecer um CSV de conferência (UTF-8 com BOM, separador `;`) com aluno, escola, turno, rota, placa, tipologia e as variáveis de transporte, sem CPF, sem endereço e sem a observação de necessidade especial, neutralizando células iniciadas por `=`, `+`, `-` ou `@`.

#### Scenario: Nome iniciado por sinal
- **GIVEN** um nome de aluno que começa com "="
- **WHEN** o CSV de conferência é gerado
- **THEN** a célula é gravada com um apóstrofo à frente

#### Scenario: Sem dado sensível
- **WHEN** o CSV de conferência é gerado
- **THEN** ele não tem CPF, endereço nem observação de necessidade especial

### Requirement: Auditoria e guarda dos arquivos do Censo
Cada pré-validação e cada geração de arquivo DEVE ser auditada com usuário, ano, tipo de arquivo, quantidade de linhas, versão do leiaute e a lista de campos exportados. O arquivo gerado NÃO DEVE ser guardado no servidor.

#### Scenario: Geração registrada
- **WHEN** o arquivo do Educacenso é gerado
- **THEN** o `audit_logs` tem o evento com o ano, o total de linhas e a versão do leiaute

#### Scenario: Nada guardado
- **WHEN** a geração termina
- **THEN** não resta arquivo no armazenamento do servidor

### Requirement: Painel de lotação
O módulo DEVE ter um painel com: rotas ativas, veículos ativos, alunos transportados, ocupação média (ponderada pela capacidade) e rotas em superlotação, e a lista de rotas com a faixa de ocupação (verde até 80 %, amarelo de 81 % a 100 %, vermelho acima de 100 %), mostrando também o rótulo de texto, não só a cor. Rotas sem veículo DEVEM aparecer como pendência.

#### Scenario: Rota vermelha
- **WHEN** uma rota tem mais alunos que a capacidade
- **THEN** ela aparece em vermelho com o rótulo "Superlotada" e no topo da lista

#### Scenario: Rota sem veículo
- **WHEN** uma rota não tem veículo
- **THEN** ela aparece como pendência, sem percentual

#### Scenario: Sem dados
- **WHEN** o tenant não tem rotas
- **THEN** o painel mostra o estado vazio

### Requirement: Alertas no painel
O painel DEVE incluir os alertas de vencimento da frota (Fase 1), com os críticos primeiro.

#### Scenario: Alerta crítico no topo
- **GIVEN** um alerta crítico de vistoria e um de atenção de CNH
- **WHEN** o painel é aberto
- **THEN** o crítico aparece antes do de atenção

### Requirement: Consulta da auditoria do módulo
O módulo DEVE ter tela de auditoria com filtro por período, ação e usuário, exigindo `transporte.audit`.

#### Scenario: Filtro por ação
- **WHEN** o auditor filtra pela ação `alocacao.excesso_autorizado`
- **THEN** só esses eventos aparecem, com a justificativa

### Requirement: Importação de veículos, motoristas e paradas por CSV
O sistema DEVE permitir importar veículos, motoristas e paradas por arquivo CSV, oferecendo um modelo para baixar, uma pré-visualização com linhas válidas, avisos e divergências, e o processamento SOMENTE de forma assíncrona após a confirmação. Linhas com erro NÃO DEVEM impedir as válidas. A importação exige `transporte.frota.manage` (veículos e motoristas) ou `transporte.rotas.manage` (paradas).

#### Scenario: Pré-visualização com divergências
- **GIVEN** um CSV de veículos com 10 linhas, 2 delas com capacidade zero
- **WHEN** o usuário envia o arquivo
- **THEN** a pré-visualização mostra 8 válidas e 2 divergências com o número da linha e o motivo, e nada é gravado ainda

#### Scenario: Confirmação
- **WHEN** o usuário confirma a importação
- **THEN** o processamento vai para a fila e, ao fim, o relatório mostra criados, ignorados e com erro

#### Scenario: Placa já cadastrada
- **GIVEN** a placa "ABC1D23" já existe
- **WHEN** o arquivo traz essa placa
- **THEN** a linha vira divergência e o veículo existente não é alterado

#### Scenario: Reenvio do mesmo arquivo
- **WHEN** o mesmo arquivo é importado duas vezes
- **THEN** a segunda execução não cria duplicatas

### Requirement: Motoristas importados ligam-se a pessoas existentes
A importação de motoristas DEVE localizar a pessoa física pelo CPF no Cadastro de Pessoas e NÃO DEVE criar pessoas. CPF inválido, ausente do cadastro ou repetido no arquivo DEVE gerar divergência.

#### Scenario: CPF inexistente
- **WHEN** a linha traz um CPF que não está no Cadastro de Pessoas
- **THEN** a linha vira divergência `pessoa_nao_encontrada` e nenhuma pessoa é criada

#### Scenario: Motorista inelegível no arquivo
- **WHEN** a linha traz CNH categoria B
- **THEN** a linha vira divergência e o motorista não é criado

### Requirement: Segurança do arquivo importado
O sistema DEVE limitar o tamanho e o número de linhas do arquivo, validar a extensão e o conteúdo como texto, e tratar todas as células como texto (sem interpretar fórmulas).

#### Scenario: Arquivo grande demais
- **WHEN** o arquivo ultrapassa o limite de linhas
- **THEN** o sistema responde 422 e não processa nada

#### Scenario: Célula com fórmula
- **WHEN** uma célula começa com "="
- **THEN** ela é lida como texto literal

### Requirement: Isolamento e auditoria da importação
A importação DEVE respeitar o tenant e ser auditada com o usuário, o arquivo e os totais.

#### Scenario: Auditoria da carga
- **WHEN** uma importação termina
- **THEN** o `audit_logs` guarda quem importou, o nome do arquivo e os totais criados, ignorados e com erro

### Requirement: Dados de demonstração do Transporte
O módulo DEVE ter um seeder de demonstração idempotente que cria empresas, motoristas, veículos com vistorias vigentes, a vencer e vencidas, paradas georreferenciadas, rotas com itinerário e alocações que deixem rotas nas três faixas de ocupação, respeitando as regras do módulo e sem criar usuários com senha conhecida.

#### Scenario: Primeira execução
- **GIVEN** um tenant sem rotas
- **WHEN** o seeder roda
- **THEN** o painel mostra rotas verdes, amarelas e vermelhas e alertas críticos e de atenção

#### Scenario: Segunda execução
- **WHEN** o seeder roda de novo
- **THEN** ele informa que não há nada a fazer e não altera dados

#### Scenario: Sem credenciais conhecidas
- **WHEN** o seeder termina
- **THEN** nenhum usuário com senha fixa foi criado

### Requirement: Documentação do módulo
O repositório DEVE ter `docs/modules/transporte.md` com fluxos, permissões, regras e limites conhecidos, e a spec `transporte` DEVE ser consolidada em `openspec/specs/transporte/spec.md` ao arquivar as fases.

#### Scenario: Documento presente
- **WHEN** a Fase 5 é concluída
- **THEN** `docs/modules/transporte.md` existe e descreve as permissões `transporte.*`
