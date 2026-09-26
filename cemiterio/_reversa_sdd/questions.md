# Perguntas para Validação — cemiterio

> Gerado pelo Revisor em 2026-09-24. Consolida os itens 🔴 dos `questions.md` de cada unit. Responda o campo **Resposta** e me avise quando terminar (ou responda diretamente no chat).

---

## Pergunta 1 — Identidade entre cemitérios (🔴 CRÍTICA, bloqueia múltiplas tarefas)

**Contexto:** `seguranca-usuarios-permissoes` (Q-identidade) e `importacao-csv` T-08/T-09 — usuários, coveiros e pedreiros são cadastros independentes por cemitério no legado, mas migrados como tabelas globais no schema alvo.
**Spec afetada:** `seguranca-usuarios-permissoes/questions.md`, `importacao-csv/tasks.md`, `schema-destino/tasks.md` T-04, ADR 0004
**Pergunta:** Os usuários/coveiros/pedreiros do Central e de Independência são as mesmas pessoas (login/cadastro compartilhado) ou universos de código independentes que colidem por coincidência de numeração?
**Impacto:** Determina se `funcionario`/`pedreiro`/`usuario`/`usuario_grupo` precisam de `cemiterio_id` no schema alvo, ou se a unificação atual é correta.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 2 — Mapeamento de `PW_PERMIS` está correto?

**Contexto:** `importacao-csv` e `seguranca-usuarios-permissoes` — decodificação em 5 blocos de 4 caracteres, incerteza reconhecida no próprio comentário do código original.
**Spec afetada:** `importacao-csv/questions.md`, `seguranca-usuarios-permissoes/questions.md`, `permissions.md`
**Pergunta:** O mapeamento de posições (Incluir/Alterar/Excluir/Consultar/Relatório) está correto? Há como validar contra o comportamento real da aplicação Clipper?
**Impacto:** Se errado, usuários migrados podem ter permissões diferentes das originais (excesso ou falta de acesso).

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 3 — Qual a política de migração de senha?

**Contexto:** `importacao-csv` Q2 — senha de 6 caracteres em texto puro, hoje migrada com SHA256 sem salt (ADR 0002).
**Spec afetada:** `importacao-csv/questions.md`, `permissions.md` (SEC-001/SEC-002)
**Pergunta:** Forçar reset de senha no primeiro login do sistema novo, migrar com hash adequado mantendo a senha atual, ou as duas coisas?
**Impacto:** Muda a implementação de `importacao-csv` T-07 e `seguranca-usuarios-permissoes` T-03.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 4 — Por que a tentativa via OLEDB (`read_dbf.ps1`) foi abandonada?

**Contexto:** `extracao-dbf` Q1 — script alternativo não usado no fluxo de produção, motivo não documentado.
**Spec afetada:** `extracao-dbf/questions.md`
**Pergunta:** Foi limitação de ambiente (driver 32-bit) ou preferência de implementação?
**Impacto:** Confirma se a abordagem atual (parser custom) é a única viável ou só a preferida.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 5 — Vale a pena corrigir o `print()`/`logging` para recuperar dados reais de coveiro/pedreiro?

**Contexto:** `extracao-dbf` Q2 — hoje a extração falha silenciosamente para `FUNCIONA`/`PEDREIRO`/sequência/`PRINTERS`, mascarado pelo hardcode no importador.
**Spec afetada:** `extracao-dbf/questions.md`, `importacao-csv/tasks.md` T-08
**Pergunta:** Os nomes reais de coveiros/pedreiros são relevantes para o sistema novo, a ponto de justificar a correção antes de produção?
**Impacto:** Se sim, prioriza `extracao-dbf` T-07 e `importacao-csv` T-08. Se não, o hardcode pode ser mantido como está (documentado como conhecido).

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 6 — `FALECIDO.DBF` tinha propósito além de índice de ocupação?

**Contexto:** `legado-cemiterio-central` Q1 — não lido por nenhum script de importação, mas pode ter tido uso na aplicação Clipper original.
**Spec afetada:** `legado-cemiterio-central/questions.md`, RN008 em `domain.md`
**Pergunta:** Confirma que é seguro descartar `FALECIDO.DBF` definitivamente na migração?
**Impacto:** Se havia outro uso, pode haver comportamento a preservar no sistema novo.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 7 — `PEDREIRO.DBF` do Central, códigos 2-4 corrompidos: há registro em papel?

**Contexto:** `legado-cemiterio-central` Q2 — corrupção no próprio arquivo DBF, não recuperável por engenharia reversa.
**Spec afetada:** `legado-cemiterio-central/questions.md`
**Pergunta:** Existe registro físico anterior à digitalização que permita reconstruir esses 3 registros?
**Impacto:** Determina se esses sepultamentos ficam com `pedreiro_id` nulo/placeholder permanentemente.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 8 — Backups `.ARJ` (2009-2011) do Central são relevantes?

**Contexto:** `legado-cemiterio-central` Q3 — não analisados nesta extração.
**Spec afetada:** `legado-cemiterio-central/questions.md`
**Pergunta:** Vale investir tempo analisando esses backups antes de considerar a extração do Central completa?
**Impacto:** Pode conter dado histórico relevante ou ser puramente arquivo morto.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 9 — Por que `OBA.DBF`/`TTT.DBF` existem só em Independência?

**Contexto:** `legado-cemiterio-independencia` Q1 — assimetria entre unidades sem explicação documentada.
**Spec afetada:** `legado-cemiterio-independencia/questions.md`, RN010 em `domain.md`
**Pergunta:** É um processo de negócio específico dessa unidade, ou o Central já teve e perdeu essas tabelas?
**Impacto:** Se for processo de negócio real, o sistema novo pode precisar oferecê-lo como opcional por cemitério, não fixo de uma unidade.

**Resposta:** <!-- preencha aqui -->

---

## Pergunta 10 — Registros de `OBA.DBF` sempre resolvem para um `lote` existente?

**Contexto:** `legado-cemiterio-independencia` Q2 — validação técnica, pode ser respondida por consulta nos dados já extraídos em vez de um humano.
**Spec afetada:** `legado-cemiterio-independencia/questions.md`
**Pergunta:** Ao reconciliar `OBA.DBF` com `LOTES.DBF`, todos os registros encontram um lote correspondente?
**Impacto:** Taxa de falha alta sinalizaria dado órfão ou numeração de um sistema ainda mais antigo.

**Resposta:** <!-- preencha aqui -->
