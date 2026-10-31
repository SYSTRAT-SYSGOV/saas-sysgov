## ADDED Requirements

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
