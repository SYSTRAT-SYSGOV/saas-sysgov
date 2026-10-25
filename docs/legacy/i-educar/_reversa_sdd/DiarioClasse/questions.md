# DiarioClasse (i-Educar legado), Perguntas Abertas

> Perguntas levantadas na extração da unit de diário de classe e frequência, para decidir na etapa de valorarização ou com o dono do produto.
> Cada pergunta indica a confiança da observação de origem: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Perguntas

| # | Pergunta | Por que importa | Evidência de origem | Confiança |
|---|----------|-----------------|---------------------|-----------|
| Q-01 | A consolidação legada (`educa_stage_absence_summaries`) fica como fonte oficial no novo modelo, ou passa a derivar do diário atômico? | Duplicidade entre consolidação e chamada por aula gera duas verdades | migrações legadas contra `legacy-mapping.md:116-140` | 🔴 |
| Q-02 | A etapa especial 'Rc' (recuperação) é preservada como código próprio ou convertida em etapa numérica fictícia? | A conversão varchar → `SMALLINT` do bastão quebra com 'Rc' | `FaltaController.php:128` 🟢 e `legacy-mapping.md:152` | 🔴 |
| Q-03 | O cap de quantidade de faltas (0–100 na tela, livre na API) é harmonizado em qual valor? | Comportamento divergente entre as duas entradas hoje | `FaltaController.php:135` vs `DiarioApiController.php:1082-1091` | 🟡 |
| Q-04 | A mestre `falta_aluno` com regime fixo continua única por matrícula, ou o novo modelo admite regime por componente na mesma matrícula? | Troca de regra com dados existentes pode exigir reclassificação | migração `create_modules_falta_aluno_table` 🟢 | 🟡 |
| Q-05 | A permissão 999849 de lançamento fora do período é substituída pela exceção auditada do bastão, com registro de autor e motivo? | O legado abona sem registro nenhum; o novo exige trilha | `DiarioApiController.php:287-299` 🟢 e `app/Process.php:71` | 🔴 |
| Q-06 | Os períodos de lançamento sem vínculo continuam liberando tudo (opt-in), ou viram opt-out? | Virar opt-out trava toda a rede que hoje não usa períodos | `ReleasePeriodService.php:45-47` 🟢 | 🔴 |
| Q-07 | O escopo de período ganha turma e componente, como está no bastão, ou fica por escola/etapa (paridade)? | O legado é por escola/etapa/tipo; o bastão promete mais granularidade | `ReleasePeriodService.php:22-53` e `legacy-mapping.md` | 🟡 |
| Q-08 | Aulas geminadas são obrigatórias no lançamento inicial, ou o diário atômico começa com uma aula por registro? | O teste de integralidade da frequência muda com lesson_count | `legacy-mapping.md:693-694` 🔴 | 🔴 |
| Q-09 | O abono do atestado (`is_excused`) zerar o cômputo da falta no percentual, ou preserva o percentual mínimo de 75% da LDB? | As duas leituras coexistem no bastão (abono vs. percentual mínimo) | `legacy-mapping.md:690-692` 🟡 | 🔴 |
| Q-10 | Atestados aprovados revisam chamadas anteriores automaticamente no momento da aprovação, ou manualmente pelo operador? | A retroatividade em massa é vulnerável a erros | `legacy-mapping.md:433` (ação declarada) 🔴 | 🔴 |
| Q-11 | O corte da data base de remanejamento na grade permanece só para presença nas listas, ou vira regra de edição? | Hoje só filtra a exibição das enturmações | `DiarioApiController.php:824-843` 🟢 | 🟡 |
| Q-12 | As regras de faltas anteriores e remoção escada-invertida seguem exatamente as mensagens do legado, ou texto novo? | Reaproveitamento da experiência e dos testes de migração | `DiarioApiController.php:135`, `:252-274` 🟢 | 🟡 |
| Q-13 | A frequência continua em função de banco, ou migra para serviço de aplicação com contagem dos registros? | O diário atômico permite recalcular sem as FUNÇÕES; a paridade exige replicar o truncamento a uma casa | funções SQL 🟢 | 🔴 |
| Q-14 | O fallback triplo de carga (turma → escola-série-disciplina → componente-ano-escolar) e o do curso mantém a ordem do legado? | A ordem muda o resultado quando há cargas dissonantes | `modules.frequencia_por_componente.sql:22-88` 🟢 | 🟡 |
| Q-15 | O parecer acoplado à tela de falta permanece no mesmo formulário no novo modelo? | Ancoragem da experiência do professor | `FaltaController.php:138-140` 🟢 | 🟡 |
| Q-16 | Falta/atraso do servidor com `justificada` fica na unit `Servidores` (paridade) ou migra para as justificativas do diário? | A tabela é de pessoal, mas o nome sugere motivos escolares | telas do processo 635 🟢 | 🟡 |
| Q-17 | A compensação de faltas do servidor ganha efeito sobre a grade de aulas do professor ausente? | No legado é registro administrativo sem efeito no diário | compensado tela 🟢 e busca | 🔴 |
| Q-18 | O botão de replicar faltas para todos fica configurável pela chave de config, ou padrão visível? | Liga a unit ao dicionário de configurações | `DiarioController.php:34` 🟢 | 🟡 |
| Q-19 | A chamada atômica exige horário da grade (`timetable_slot_id`) obrigatório no lançamento inicial? | O legado não tem grade vinculada ao lançamento | `legacy-mapping.md:39` 🔴 | 🔴 |
| Q-20 | Níveis de alerta de evasão ficam fixos em 75% (crítico) e 85% (atenção), ou parametrizáveis por rede conforme a LDB? | O bastão fixa; redes usam 25%/30% de faltas como limite | `legacy-mapping.md:351-357` 🟡 vs `:23` | 🔴 |

---

## Perguntas em conflito com o bastão

- Q-01, Q-08: o bastão assume o diário atômico como fonte; o legado só tem consolidação por etapa.
- Q-02: o bastão converte etapa em `SMALLINT` sem tratar o 'Rc'.
- Q-05, Q-06, Q-07: os períodos e a exceção já têm forma real no legado (janela opt-in e permissão de exceção real), e o bastão promete motor novo sem reconhecer isso; anote também a unit `Configuracao`.
- Q-10, Q-13, Q-19: o bastão declara ações retroativas; o legado não tem base para elas.

**Total desta unit: 20 perguntas.**
