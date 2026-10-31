# Tarefas — Transporte, Fase 5: Carga e demonstração

## 0. Decisões para aprovação
- [x] 0.1 Ponte opcional com o Passeio (D33): **descartada** (recomendação aceita: não incluir)
- [x] 0.2 Migração do i-Educar: segue fora do escopo (nenhum município com dados informado)

## 1. Backend — importação
- [x] 1.1 `ImportacaoTransporteService`: leitura com `LeitorCsv`, validação por linha, pré-visualização e relatório de divergências
- [x] 1.2 Importadores de veículos, motoristas (por CPF, sem criar pessoa) e paradas
- [x] 1.3 Job em fila com confirmação; limites de tamanho e linhas; células lidas como texto
- [x] 1.4 Modelos de CSV para baixar; Controllers, Requests, Resources e rotas; auditoria da carga
- [x] 1.5 Policies (`frota.manage` e `rotas.manage`)

## 2. Backend — demonstração
- [x] 2.1 `TransporteDadosDemonstracaoSeeder` idempotente (empresas, motoristas, veículos e vistorias, paradas, rotas, itinerários, alocações em três faixas)
- [x] 2.2 Garantir que passa pelas regras do módulo (capacidade, elegibilidade, acessibilidade) e não cria usuário com senha conhecida
- [ ] 2.3 Rodar o seeder numa cópia do banco antes de qualquer execução em produção (**não executado**: o seeder foi testado só no SQLite; em produção, só com backup e autorização)

## 3. Testes
- [x] 3.1 Importação: pré-visualização, divergências, confirmação, reenvio sem duplicar, placa existente, CPF inexistente, categoria B
- [x] 3.2 Segurança: limite de linhas, extensão, fórmula como texto, isolamento de tenant, auditoria
- [x] 3.3 Seeder: primeira e segunda execução, faixas de ocupação, alertas gerados

## 4. Frontend
- [x] 4.1 Telas de importação (envio, pré-visualização, confirmação, relatório) em Veículos, Motoristas e Paradas
- [x] 4.2 `generate:registry`, typecheck e vitest

## 5. Documentação e fechamento
- [x] 5.1 `docs/modules/transporte.md`
- [x] 5.2 phpunit, phpstan e front verdes; CI verde
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`; rodar o seeder em produção só com backup e autorização
- [x] 5.4 `openspec archive` das cinco changes e spec `openspec/specs/transporte/spec.md` com Purpose em pt-BR

## 6. Desvios
- [x] 6.1 A prévia roda cada linha pelos Services do cadastro numa transação desfeita, em vez de reimplementar as regras; só linhas aceitas ocupam placa/CPF para a detecção de repetição no arquivo
- [x] 6.2 Em produção a fila é `sync` (sem worker): a confirmação processa na própria requisição; com worker, roda em segundo plano e a tela acompanha
- [x] 6.3 Parada repetida é **ignorada** (aviso), não divergência, para o reenvio não duplicar
- [ ] 6.4 Importação opcional dos códigos Inep (aluno/turma) por CSV: não feita; a edição é pela tela do Escola
