# AcademicYear (i-Educar legado) — Perguntas

> 20 perguntas para o dono do produto / migração. Sem respostas neste documento.
> Confiança: sempre 🟢, o texto das perguntas no mais imediato.

---

1. A tabela `bloqueio_ano_letivo` deve ser mantida no alvo e aplicada ao lançamento de notas/faltas, ou o corte oficial é apenas `ReleasePeriod`/`POST_OUT_PERIOD` (processo 999849)? 🔴
2. Nas telas do legado, essa janela apareceu historicamente como "travamento da etapa do professor" — existe código fora do snapshot (branch/deploy anterior) que a consumia? 🔴
3. Quem usa o endpoint do lote `/ano-letivo-em-lote` em produção — equipe central por rede inteira ou secretarias por escola? 🟡
4. O processo do lote (9999120) deve exigir admin global no alvo, ou RECEDES por instituição devem poder processar apenas as próprias escolas? 🟡
5. A transação única de todo o lote deve ser mantida, ou cada escola deve ser um commit independente (falha parcial tolerada)? 🟡
6. Deve o alvo validar conflito de datas entre etapas do MESMO envio (o legado não valida)? 🟡
7. A substituição textual do ano na data copiada por `str_replace` deve ser substituída no alvo por lógica real de data (bissexto automático)? Presumimos que sim. 🟡
8. A exceção de fechamento para `atividade_complementar` deve continuar, ou o alvo deve adicionar situações de matrícula equivalentes à exceção? 🟡
9. O fechamento deve continuar permitindo encerrar mesmo com pendências de nota (legado só olha matrículas "em andamento")? 🟡
10. `deleteAcademicYear` marca `andamento=2` (igual a finalizado) — no alvo o "exclusão" deve ser um status próprio (cancelado) com rastreabilidade? 🟡
11. A edição de etapas com delete+recriar deve ser revisada para upsert no alvo (evita perda de sequencial/auditoria)? 🟡
12. O `iDiarioService` (novo_educacao) ainda está em uso para checar lançamentos na redução de etapas? Se sim, qual contrato (endpoint/token)? 🔴
13. Quem mantém os tipos de etapa (`pmieducar.modulo`) por instituição — há catálogo padrão a preservar na migração de dados? 🟡
14. Os arrays `anos_letivos` são provisionados por migração de dados para turma/curso/série — qual política quando o array contém anos descontínuos (buracos históricos)? 🔴
15. A cópia de professores/alocações sempre deve gerar vínculos com datas em branco (como no legado), ou o alvo deve copiar as datas reais do ano anterior? 🟡
16. Regra de perfil: o checkbox "copiar turmas" para não-admin no legado é forçado true — manter essa restrição de perfil? 🟢 🟡
17. Há agendamento automático de abertura/fechamento de ano (job) em qualquer deploy conhecido, ou open/close é sempre manual por tela/lote? 🔴
18. O bug de mensagem da exclusão pela tela (561) foi percebido pelos usuários/gera registro de suporte? Só afeta UX, não dados. 🟢
19. A Resource API de anos letivos (`ResourceSchoolAcademicYearController`) tem consumidor externo a preservar no alvo (contrato público)? 🟡
20. O histórico do `bloqueio_ano_letivo` deve ser migrado como dado (janelas existentes) mesmo sem enforcement, para auditoria? 🔴

---

**Acumulado: 387 perguntas em 20 units.**
