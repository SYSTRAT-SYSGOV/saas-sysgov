# AcademicYear (i-Educar legado) — Tarefas de Migração

> Sequência de trabalho para reconstruir o módulo no alvo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fase 0 — Descoberta

- [ ] Inventariar linhas existentes de `escola_ano_letivo`, `ano_letivo_modulo` e `bloqueio_ano_letivo` por tenant (volume real pós-migração). 🔴
- [ ] Mapear todos os consumidores leitores de `escola_ano_letivo` e `ano_letivo_modulo` no snapshot (Avaliacao, DiarioClasse, Educacenso, Reports, Calendario leem etapa corrente/datas — confirmar quais usam `ano_letivo_modulo` vs `ReleasePeriod`). 🟡
- [ ] Confirmar que `bloqueio_ano_letivo` não tem consumer de aplicação (grep já vazio neste snapshot) e decidir destino no alvo: aplicar ou descartar. 🔴

## Fase 1 — Modelo de dados

- [ ] Criar entidades: `SchoolAcademicYear` (escola+ano, status, flags de cópia, auditoria), `AcademicYearStage` (etapa: sequencial, tipo, datas, dias letivos), `StageType` (tipos de etapa por instituição com `num_etapas`). 🟢
- [ ] Substituir `anos_letivos smallint[]` por tabela associativa normalizada (curso×ano, série×ano, série-disciplina×ano, componente×ano) — arrays PostgreSQL não são portáveis. 🔴
- [ ] Modelar `SchoolYearLock` (instituição+ano, janela datas permitidas) — decidir se entra no alvo com enforcement real. 🔴
- [ ] Migrar valor `andamento` 0/1/2 para enum tipado. 🟢

## Fase 2 — Regras de negócio

- [ ] Implementar validação de datas: sobreposição com outros anos letivos da mesma escola + completude (inicio/fim) + ordem. 🟢
- [ ] Implementar validação de número de etapas vs `StageType.num_etapas`. 🟢
- [ ] Decidir política de conflito intra-envio (etapas sobrepostas no mesmo formulário — legado NÃO valida): recomenda-se validar. 🟡
- [ ] Implementar impedimento de redução de etapas com nota/falta lançada nas etapas removidas (falta por componente, falta geral, nota por componente, parecer, área — mesma lista de consultas do legado). 🟢
- [ ] Definir substituto do `iDiarioService` (diário online externo, config `url_novo_educacao`/`token_novo_educacao`) ou desativar a checagem. 🔴
- [ ] Implementar abertura (barrado se status ≠ não iniciado) e fechamento (barrado se já finalizado ou não iniciado; exige zero matrículas `aprovado=3` ativas `ultima_matricula=1`, exceto `tipo_ensino.atividade_complementar`). 🟢

## Fase 3 — Cópia do ano anterior

- [ ] Implementar cópia de turmas (por nome, idempotente), disciplinas de turma, etapas por turma e multisseriadas. 🟢
- [ ] Implementar cópia de professores (vínculo + disciplinas) e alocações (professores e demais servidores), com datas de vínculo/alocação vindas em branco no destino. 🟢
- [ ] Implementar ajuste de datas copiadas com substituição do ano e correção de 29/02→28/02 em anos não bissextos (no alvo, usar manipulação de data real em vez de `str_replace` textual). 🟢
- [ ] Implementar extensão do "anos letivos da escola" em cursos/séries/disciplinas/componentes + replicação do vínculo série↔regra de avaliação por ano (por referência: unit `RegraAvaliacao`). 🟢
- [ ] Corrigir lacunas do legado na cópia: garantir vínculo de disciplinas por etapa de turma consistente e pendências de `teacher_id` (ver unit `QuadroHorario`/`Servidores`). 🟡

## Fase 4 — CRUD e telas

- [ ] CRUD de etapas por escola/ano (criar, editar com delete+recriar — no alvo, preferir upsert por sequencial; desativar/excluir o ano). 🟢
- [ ] Corrigir o bug do legado na exclusão via tela (`$excluiu` indefinida — mensagem "Exclusão não realizada." sempre exibida) + distinguir "cancelado" de "finalizado" na desativação. 🟢 🟡
- [ ] Tela/controle de bloqueio por instituição/ano (21251) — apenas se o enforcement for implementado. 🔴
- [ ] Resource API de consulta de anos letivos (index). 🟢

## Fase 5 — Lote (9999120)

- [ ] Controller de lote: criar/abrir/fechar em múltiplas escolas com pré-validação completa e resposta estruturada (processed/ignored/errors por escola). 🟢
- [ ] Revisar transação do legado: commit único para todo o lote (sem catch no loop). No alvo, decidir: transação por escola ou rollback global. 🟡
- [ ] Regra de não-admin: "copiar turmas" fixo true; checkboxes de cópia de professores/servidores conforme perfil. 🟢

## Fase 6 — Verificação

- [ ] Testes: validação de datas entre anos, redução de etapas com lançamentos, fechamento com matrícula em andamento (e exceção atividade complementar), idempotência da cópia. 🟢
- [ ] Testar transições de status: abrir ano já aberto e fechar ano finalizado devem ser proibidos. 🟢
- [ ] Teste de paridade de relatório do lote (contagens de turmas/alocações/vínculos copiados por escola). 🟢
