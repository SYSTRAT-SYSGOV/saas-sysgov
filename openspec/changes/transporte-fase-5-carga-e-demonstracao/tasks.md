# Tarefas — Transporte, Fase 5: Carga e demonstração

## 0. Decisões para aprovação
- [ ] 0.1 Decidir a ponte opcional com o Passeio (D33): recomendação é não incluir; se aprovada, acrescentar as tarefas 4.x
- [ ] 0.2 Confirmar se algum município tem dados do i-Educar para migrar (hoje fora do escopo)

## 1. Backend — importação
- [ ] 1.1 `ImportacaoTransporteService`: leitura com `LeitorCsv`, validação por linha, pré-visualização e relatório de divergências
- [ ] 1.2 Importadores de veículos, motoristas (por CPF, sem criar pessoa) e paradas
- [ ] 1.3 Job em fila com confirmação; limites de tamanho e linhas; células lidas como texto
- [ ] 1.4 Modelos de CSV para baixar; Controllers, Requests, Resources e rotas; auditoria da carga
- [ ] 1.5 Policies (`frota.manage` e `rotas.manage`)

## 2. Backend — demonstração
- [ ] 2.1 `TransporteDadosDemonstracaoSeeder` idempotente (empresas, motoristas, veículos e vistorias, paradas, rotas, itinerários, alocações em três faixas)
- [ ] 2.2 Garantir que passa pelas regras do módulo (capacidade, elegibilidade, acessibilidade) e não cria usuário com senha conhecida
- [ ] 2.3 Rodar o seeder numa cópia do banco antes de qualquer execução em produção

## 3. Testes
- [ ] 3.1 Importação: pré-visualização, divergências, confirmação, reenvio sem duplicar, placa existente, CPF inexistente, categoria B
- [ ] 3.2 Segurança: limite de linhas, extensão, fórmula como texto, isolamento de tenant, auditoria
- [ ] 3.3 Seeder: primeira e segunda execução, faixas de ocupação, alertas gerados

## 4. Frontend
- [ ] 4.1 Telas de importação (envio, pré-visualização, confirmação, relatório) em Veículos, Motoristas e Paradas
- [ ] 4.2 `generate:registry`, typecheck e vitest

## 5. Documentação e fechamento
- [ ] 5.1 `docs/modules/transporte.md`
- [ ] 5.2 phpunit, phpstan e front verdes; CI verde
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`; rodar o seeder em produção só com backup e autorização
- [ ] 5.4 `openspec archive` das cinco changes e spec `openspec/specs/transporte/spec.md` com Purpose em pt-BR
