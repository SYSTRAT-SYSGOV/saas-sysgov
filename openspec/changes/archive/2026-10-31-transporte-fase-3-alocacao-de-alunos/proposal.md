# Proposal

## Why

O repasse do PNATE e o Registro 60 dependem de saber **quais alunos usam qual rota e em qual parada**. No legado, o vínculo era um resumo no cadastro do aluno, sem checar lotação, turno, acessibilidade nem a regularidade do veículo. A superlotação de veículo escolar é infração de trânsito e risco real para as crianças.

## What Changes

- **Alocação** de aluno (`escola_alunos`) a uma rota e a uma parada do itinerário, com data de início, turno, declaração de uso de transporte rural e poder público responsável (1 estadual, 2 municipal, 3 compartilhado).
- **Controle de capacidade** do veículo, feito em transação com lock na rota; excesso só com `transporte.alocacoes.override_capacity` e justificativa auditada.
- **Acessibilidade**: aluno com necessidade especial de transporte só vai para rota com veículo acessível.
- **Revalidação a cada alocação** de contrato, vistoria e motorista; rota irregular não recebe aluno novo.
- **Encerramento** da alocação com data e motivo (histórico preservado); encerramento **automático** quando o aluno deixa de estar ativo (transferido, remanejado) ou é excluído.
- **Condições do Registro 60 na alocação**: atendimento curricular, mediação didática e país de residência (padrões `true`, `presencial`, `BR`), que a Fase 4 usa para anular a declaração de transporte público.
- **Ocupação por rota** (alunos × capacidade, percentual e faixa verde/amarelo/vermelho).
- **Frontend**: alunos da rota, alocar/encerrar, ocupação por rota.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta alocação de alunos, capacidade, acessibilidade, encerramento e ocupação.

## Impact

- **Backend**: tabela `transporte_alocacoes`; `AlocacaoService`; listener de situação do aluno. **Lê** `escola_alunos` do Escola (sem alterá-lo); a leitura entre escolas segue o mesmo mecanismo do Multiprofissional.
- **Depende das Fases 1 e 2** mescladas.
- **Dado sensível**: a necessidade especial de transporte de uma criança é dado de saúde (LGPD, art. 11). O texto livre só é visível a quem gerencia alocações, é auditado e não sai em nenhuma exportação (ver `design.md`).
