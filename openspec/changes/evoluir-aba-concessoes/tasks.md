# Tasks

## 1. Backend - Banco de Dados e Models

- [x] 1.1 Criar migration para tabela concession_historico (append-only) com campos: id, tenant_id, concession_id, de_estado, para_estado, motivo, usuario_id, processo_referencia, created_at e verificar com php artisan migrate
- [x] 1.2 Criar migration para tabela concession_documentos com campos: id, tenant_id, concession_id, tipo (termo|escritura|inventario|procuracao|outro), arquivo (storage), hash, created_at e verificar com php artisan migrate
- [x] 1.3 Criar migration para tabela concession_herdeiros com campos: id, tenant_id, concession_id, nome, parentesco, documento, titular_indicado (bool), ordem, created_at e verificar com php artisan migrate
- [x] 1.4 Modificar migration existente de concessões para adicionar campos: tipo (perpetua|temporaria), base_legal, estado, data_inicio, data_fim (null p/ perpétua), prazo_anos, taxa_manutencao_centavos, vigencia_manifestacao_dias, lock_version e verificar com php artisan migrate
- [x] 1.5 Criar model ConcessionHistorico com TenantAware, casts adequados e relacionamento com Concession
- [x] 1.6 Criar model ConcessionDocumento com TenantAware, casts adequados e relacionamento com Concession
- [x] 1.7 Criar model ConcessionHerdeiro com TenantAware, casts adequados e relacionamento com Concession
- [x] 1.8 Atualizar model Concession com novos campos, TenantAware, relacionamentos com as novas models e scope para estados ativos
- [x] 1.9 Executar composer static e php -l para verificar que não há erros de estática ou de linguagem

## 2. Backend - Policies e Autorização

- [x] 2.1 Criar policy ConcessionPolicy com métodos para visualizar, criar, atualizar, excluir e executar transições de estado baseado na permissão cemiterios.concessoes.manage
- [x] 2.2 Registrar o policy no AuthServiceProvider
- [x] 2.3 Verificar que não há erros de autorização com php artisan test --filter=PolicyTest

## 3. Backend - Services e Business Logic

- [ ] 3.1 Implementar métodos no ConcessionService (ou GisService) para todas as transições de estado: solicitar, aprovar, vencer, notificar_manifestacao, tornar_caduca, reverter, suceder, transferir
- [ ] 3.2 Implementar lógica de validação para cada transição (ex: apenas temporárias podem vencer, sucessão requer titular falecido)
- [ ] 3.3 Implementar método para calcular data_fim com base no prazo_anos e data_inicio
- [ ] 3.4 Implementar método para verificar se concessão está vencendo baseado na vigencia_manifestacao_dias
- [ ] 3.5 Implementar método para publicar evento de outbox quando taxa de manutenção vence
- [ ] 3.6 Implementar métodos CRUD para documentos concessionários (upload, download, delete)
- [ ] 3.7 Implementar métodos para gestão de herdeiros (adicionar, remover, definir titular indicado)
- [ ] 3.8 Garantir que todas as modificações usem lock_version para optimistic locking
- [ ] 3.9 Executar composer test para verificar que não há regressões

## 4. Backend - Controllers e API

- [ ] 4.1 Implementar ConcessionController com endpoints para:
    - GET /concessoes (listagem com filtros)
    - GET /concessoes/{id}
    - POST /concessoes (criar)
    - PUT /concessoes/{id} (atualizar)
    - POST /concessoes/{id}/transicao (mudar estado)
    - POST /concessoes/{id}/sucessao (registrar herdeiros)
    - POST /concessoes/{id}/transferencia (transferir inter vivos)
    - POST /concessoes/{id}/documentos (upload de documentos)
    - GET /concessoes/{id}/historico
    - GET /concessoes/vencendo
    - GET /concessoes/vencidas
    - POST /concessoes/{id}/taxa-manutencao (gerar guia)
- [ ] 4.2 Aplicar middleware de autorização cemiterios.concessoes.manage em todos os endpoints
- [ ] 4.3 Validar lock_version nas operações de atualização e transição
- [ ] 4.4 Implementar filtro por estado, tipo, park, vencendo, vencida na listagem
- [ ] 4.5 Executar testes de feature para verificar todos os endpoints e cenários de erro

## 5. Backend - Testes

- [ ] 5.1 Criar testes de feature para cenário "Criar concessão temporária"
- [ ] 5.2 Criar testes de feature para cenário "Reversão de temporária vencida"
- [ ] 5.3 Criar testes de feature para cenário "Suceder titular falecido"
- [ ] 5.4 Criar testes de feature para cenário "Transferência não permitida"
- [ ] 5.5 Criar testes de feature para cenário "Caducidade por abandono"
- [ ] 5.6 Criar testes de feature para cenário "Gerar guia de manutenção"
- [ ] 5.7 Criar testes de feature para cenário "Regularização por sucessão"
- [ ] 5.8 Criar testes de feature para cenário "Concessão vencendo"
- [ ] 5.9 Criar testes de feature para cenário "Upload de documento de concessão"
- [ ] 5.10 Executar todos os testes de feature e verificar que passam

## 6. Frontend - API Service

- [ ] 6.1 Atualizar api.ts em apps/web-client/src/modules/cemiterios/ com novos métodos de serviço:
    - getConcessoes(filters)
    - getConcessao(id)
    - createConcessao(data)
    - updateConcessao(id, data)
    - transicaoConcessao(id, transitionData)
    - registraSucessao(concessaoId, herdeirosData)
    - registraTransferencia(concessaoId, transferenciaData)
    - uploadDocumento(concessaoId, file, type)
    - getHistorico(concessaoId)
    - getVencendo()
    - getVencidas()
    - gerarGuiaManutencao(concessaoId)
- [ ] 6.2 Implementar tratamento de respostas e erros conforme padrão existente
- [ ] 6.3 Executar npm run typecheck para verificar que não há erros de TypeScript

## 7. Frontend - Components e Views

- [ ] 7.1 Atualizar ConcessoesView.tsx para usar os novos métodos de API e exibir os novos campos
- [ ] 7.2 Implementar seletor de estado na lista de concessões (Solicitada, Ativa, Vencendo, Vencida, Caduca, Revertida, Sucedida, Transferida, Negada)
- [ ] 7.3 Implementar coluna para tipo de concessão (perpetua/temporaria)
- [ ] 7.4 Implementar botão/aba para registrar sucessão hereditária
- [ ] 7.5 Implementar botão/aba para registrar transferência inter vivos
- [ ] 7.6 Implementar botão/aba para upload de documentos
- [ ] 7.7 Implementar ícone/notificação para concessões vencendo
- [ ] 7.8 Atualizar SucessaoView.tsx para lidar com o novo fluxo de sucessão (se necessário)
- [ ] 7.9 Verificar que os componentes renderizam corretamente com dados de teste

## 8. Frontend - Testes

- [ ] 8.1 Criar testes unitários para o novo service methods em api.ts
- [ ] 8.2 Criar testes de componente para ConcessoesView.tsx cobrindo:
    - Listagem com filtros de estado
    - Ação de registrar sucessão
    - Ação de registrar transferência
    - Upload de documentos
    - Exibição de concessões vencendo
- [ ] 8.3 Executar npm test em apps/web-client para verificar que não há regressões

## 9. Integração e Validação

- [ ] 9.1 Executar npm test no projeto completo para verificar integração entre backend e frontend
- [ ] 9.2 Verificar que o cache é invalidado corretamente quando concessões são atualizadas
- [ ] 9.3 Executar openspec validate evoluir-aba-concessoes --strict para validar que a implementação corresponde às specs
- [ ] 9.4 Documentar quaisquer perguntas abertas que precisem de decisão do time (prazo de manifestação padrão, tratamento de litígios, etc.)

## 10. Limpeza e Documentação

- [ ] 10.1 Remover qualquer código comentado ou debug deixado durante o desenvolvimento
- [ ] 10.2 Atualizar README ou documentação interna se necessário
- [ ] 10.3 Verificar que todos os arquivos seguem o padrão de código do projeto (linting)