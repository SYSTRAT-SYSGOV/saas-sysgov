# Tarefas — Transporte, Fase 3: Alocação de alunos

## 1. Backend — estrutura
- [ ] 1.1 Migration `transporte_alocacoes` (com `tenant_id`, índices compostos e colunas do design)
- [ ] 1.2 Model `Alocacao` `TenantAware`, enums `MediacaoDidatica` e `PoderPublico`
- [ ] 1.3 Confirmar (D24) como o Multiprofissional lê `escola_alunos` de várias escolas e adotar o mesmo mecanismo
- [ ] 1.4 Confirmar (D21) se o Escola dispara evento ao mudar a situação do aluno; senão, observer no model `Aluno` registrado no provider do Transporte

## 2. Backend — regras
- [ ] 2.1 `AlocacaoService::alocar`: transação, `lockForUpdate` da rota, aluno ativo e ano letivo, parada no itinerário, duplicidade, capacidade, rota sem veículo, acessibilidade, revalidação de contrato/vistoria/motorista, turno com aviso
- [ ] 2.2 Exceção de capacidade: permissão, justificativa obrigatória, evento `alocacao.excesso_autorizado` na auditoria
- [ ] 2.3 `AlocacaoService::encerrar` e encerramento automático por mudança do aluno
- [ ] 2.4 `OcupacaoService`: contagem, percentual, faixa e "não calculável"
- [ ] 2.5 Dado sensível (D22): Resource sem a observação para quem não gerencia; leitura da ficha auditada
- [ ] 2.6 Policies, Controllers, Form Requests, Resources e rotas (`/rotas/{rota}/alunos`)

## 3. Backend — testes
- [ ] 3.1 Isolamento de tenant (incluindo aluno de outro tenant → 404)
- [ ] 3.2 Alocação válida, parada fora do itinerário, aluno transferido, ano diferente, duplicada, poder público inválido
- [ ] 3.3 Capacidade: limite, exceção autorizada, sem justificativa, sem permissão, rota sem veículo
- [ ] 3.4 Concorrência: duas alocações para 1 vaga (uma passa)
- [ ] 3.5 Revalidação: vistoria vencida, contrato vencido, motorista inelegível
- [ ] 3.6 Acessibilidade e dado sensível (resposta sem a observação; leitura auditada)
- [ ] 3.7 Turno divergente com aviso; encerramento manual; encerramento automático
- [ ] 3.8 Ocupação: 50 %, 100 % (amarelo), 101 % (vermelho), sem veículo

## 4. Frontend
- [ ] 4.1 SDK: tipos e cliente de alocações e ocupação
- [ ] 4.2 Painel da rota: alunos alocados, ocupação com faixa e rótulo de texto (não só cor)
- [ ] 4.3 Modal de alocação com seletor de aluno, parada, uso rural, poder público e necessidade especial
- [ ] 4.4 Encerrar alocação (modal com data e motivo) e histórico
- [ ] 4.5 Permissões na interface, fonte técnica, `generate:registry`, typecheck e vitest

## 5. Entrega
- [ ] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador: alocar até lotar, exceção, encerrar
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`
