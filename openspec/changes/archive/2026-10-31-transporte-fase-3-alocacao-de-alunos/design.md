# Design — Transporte, Fase 3: Alocação de alunos

As decisões comuns (D1 a D10) estão em `transporte-fase-1-fundacao-e-frota/design.md`.

## Modelo de dados

`transporte_alocacoes`: `aluno_id` (→ `escola_alunos`), `rota_id`, `parada_id` (obrigatória, e deve pertencer ao itinerário da rota), `turno`, `usa_transporte_rural`, `poder_publico` (1, 2 ou 3, nulo), `necessidade_especial`, `necessidade_observacao` (texto, sensível), `atendimento_curricular` (padrão `true`), `mediacao_didatica` (`presencial|semipresencial|distancia`, padrão `presencial`), `pais_residencia` (`char(2)`, padrão `BR`), `data_inicio`, `data_fim`, `motivo_fim`, `justificativa_excesso`, `observacoes`. Índices `(tenant_id, rota_id, data_fim)` e `(tenant_id, aluno_id)`.

## Decisões

### D17. Unicidade da alocação ativa no Service, não em coluna gerada
O Carlos usa coluna gerada `active_key` com `UNIQUE`. Aqui os testes rodam em SQLite e a expressão `IF()` não é portável. A unicidade (um aluno, uma alocação ativa por rota) é garantida no `AlocacaoService`, dentro da mesma transação que faz o `lockForUpdate` da rota. Duplicidade devolve 409. Um aluno **pode** estar em mais de uma rota (por exemplo, ida e volta em rotas distintas), como no Carlos; se o órgão quiser uma só por aluno, é uma regra a acrescentar.

### D18. Capacidade em transação
`AlocacaoService::alocar` abre transação, trava a linha da rota (`lockForUpdate`), conta as alocações ativas, compara com `veiculo.capacidade` e só então grava. Rota **sem veículo** não aceita alocação (409): sem capacidade conhecida não há como controlar. Com a permissão `transporte.alocacoes.override_capacity` e uma justificativa não vazia, a alocação acima da capacidade é criada, a justificativa fica em `justificativa_excesso` e o evento `alocacao.excesso_autorizado` vai para a auditoria.

### D19. Aluno ativo e ano letivo
Aluno alocável = `escola_alunos.situacao = 'ativo'`, com turma de `ano_letivo` igual ao da rota. Aluno sem turma é recusado (422). A escola do aluno **não precisa** ser a escola de destino da rota; o aviso aparece, o bloqueio não (alunos de zona rural podem ser levados a uma escola-polo).

### D20. Turno
A alocação nasce com o turno da rota. O turno da turma do aluno é comparado por nome normalizado (minúsculas, sem acento: contém "manh", "tard", "noit" ou "integral"). Se divergir, a alocação é **criada com aviso** `turno_divergente`; se o nome do turno não for reconhecível, sem aviso. A Fase 4 lista os avisos na pré-validação.

### D21. Encerramento automático
Quando o aluno passa a `transferido` ou `remanejado`, ou é excluído, as alocações ativas dele são encerradas na data do evento, com motivo `aluno_{situacao}`. Implementação: observer/listener no Transporte registrado no `TransporteServiceProvider`, sem alterar o módulo Escola. Tarefa de confirmação: verificar se o Escola já dispara eventos de domínio para a mudança de situação; se não, usar um observer do model `Aluno`.

### D22. Dado sensível (LGPD)
`necessidade_observacao` é dado de saúde de criança. Regras: aparece só para `transporte.alocacoes.manage`; leitura e escrita auditadas; **nunca** entra em exportação, relatório ou resposta de listagem geral (só na ficha da alocação). A flag booleana `necessidade_especial` pode aparecer nas telas que precisam dela (acessibilidade).

### D23. Ocupação
`ocupacao` = alocações ativas ÷ capacidade do veículo. Faixas: **verde** até 80 %; **amarelo** de 81 % a 100 %; **vermelho** acima de 100 %. Rota sem veículo: ocupação "não calculável" e pendência.

### D24. Leitura de alunos de várias escolas
`escola_alunos` usa `EscolaAware`. O seletor de aluno da rota precisa listar alunos da escola do aluno, não do contexto atual. Tarefa de confirmação: usar o mesmo mecanismo do Multiprofissional para ler alunos sem fixar a escola.
