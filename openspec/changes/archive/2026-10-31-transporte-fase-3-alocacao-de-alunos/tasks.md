# Tarefas — Transporte, Fase 3: Alocação de alunos

## 1. Backend — estrutura
- [x] 1.1 Migration `transporte_alocacoes` (com `tenant_id`, índices compostos e colunas do design)
- [x] 1.2 Model `Alocacao` `TenantAware`, enums `MediacaoDidatica` e `PoderPublico`
- [x] 1.3 Confirmado (D24): o Multiprofissional usa `Aluno::withoutGlobalScope('escola')`; o Transporte adota o mesmo mecanismo, inclusive na relação `Alocacao::aluno()`
- [x] 1.4 Confirmado (D21): o Escola não dispara evento de domínio na mudança de situação; usei `Aluno::updated` e `Aluno::deleted` registrados no `TransporteServiceProvider`

## 2. Backend — regras
- [x] 2.1 `AlocacaoService::alocar`: transação, `lockForUpdate` da rota, aluno ativo e ano letivo, parada no itinerário, duplicidade, capacidade, rota sem veículo, acessibilidade, revalidação de contrato/vistoria/motorista, turno com aviso
- [x] 2.2 Exceção de capacidade: permissão, justificativa obrigatória, evento `alocacao.excesso_autorizado` na auditoria
- [x] 2.3 `AlocacaoService::encerrar` e encerramento automático por mudança do aluno
- [x] 2.4 `OcupacaoService`: contagem, percentual, faixa e "não calculável"
- [x] 2.5 Dado sensível (D22): a observação nunca vem em listagem; só a ficha, para quem gerencia, com a leitura auditada. Acréscimo: a observação também não é gravada no `audit_logs` (o retrato registra apenas `[informada]`)
- [x] 2.6 Policies, Controllers, Form Requests, Resources e rotas (`/rotas/{rota}/alunos`)

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant (incluindo aluno de outro tenant → 404)
- [x] 3.2 Alocação válida, parada fora do itinerário, aluno transferido, ano diferente, duplicada, poder público inválido
- [x] 3.3 Capacidade: limite, exceção autorizada, sem justificativa, sem permissão, rota sem veículo
- [x] 3.4 Concorrência: duas alocações para 1 vaga (uma passa)
- [x] 3.5 Revalidação: vistoria vencida, contrato vencido, motorista inelegível
- [x] 3.6 Acessibilidade e dado sensível (resposta sem a observação; leitura auditada)
- [x] 3.7 Turno divergente com aviso; encerramento manual; encerramento automático
- [x] 3.8 Ocupação: 50 %, 100 % (amarelo), 101 % (vermelho), sem veículo

## 4. Frontend
- [x] 4.1 Tipos e cliente de alocações e ocupação em `api.ts` do módulo (mesmo desvio das fases anteriores: sem `@sysgov/sdk`)
- [x] 4.2 Painel da rota: alunos alocados, ocupação com faixa e rótulo de texto (não só cor)
- [x] 4.3 Modal de alocação com seletor de aluno, parada, uso rural, poder público e necessidade especial
- [x] 4.4 Encerrar alocação (modal com data e motivo) e histórico
- [x] 4.5 Permissões na interface, fonte técnica, `generate:registry`, typecheck e vitest

## 5. Entrega
- [x] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador: alocar até lotar, exceção, encerrar
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`

## 6. Acréscimos e desvios
- [x] 6.1 Os avisos (`turno_divergente`) são calculados na leitura, sem coluna: o turno da turma pode mudar depois
- [x] 6.2 Endpoint de busca de alunos da rota (`GET /rotas/{rota}/alunos/busca`): ativos, do ano letivo da rota, de qualquer escola do tenant e que ainda não estão nela
- [x] 6.3 Parada com aluno ativo não sai do itinerário (409) e rota que já teve alocação não é excluída (409), só inativada
- [x] 6.4 A ocupação também vem na listagem de rotas, com a faixa em texto na tela (não só em cor)
