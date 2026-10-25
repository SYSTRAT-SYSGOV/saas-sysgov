# Calendario (i-Educar legado), Perguntas

> Perguntas em aberto que dependem de validação humana, derivadas das lacunas desta unit. Insumo da fase de revisão (`revisao`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

| # | Pergunta | Origem | Impacto | Dono | Prazo |
|---|----------|--------|---------|------|-------|
| Q-01 | Como os dias letivos são computados hoje para a exigência da LDB, dada a ausência de cômputo executável no Código? | `_reversa_sdd/Calendario/legacy-mapping.md:76-83` | Alto — conformidade legal | Jurídico e Arquitetura | Antes da migração |
| Q-02 | As marcações do calendário são usadas em algum relatório ou processo fora das telas do módulo, e há uso pedagógico real? | busca de consumo confirmada | Alto — consumer previsto deve nascer | Pedagogo | Antes do piloto |
| Q-03 | Quem, na rede, tem a permissão do processo 620 e do 576, e de que nível? | `educar_calendario_ano_letivo_cad.php:44` e `educar_calendario_dia_motivo_cad.php:42` | Médio — governança de quem marca os dias | Arquitetura | Antes do piloto |
| Q-04 | A marcação de dias extra letivos por turma é uso corrente (sábados letivos, reposição), e quais turmas ficam à parte do calendário da escola? |`ieducar/modules/Calendario/Model/TurmaDataMapper.php:19-25` | Médio — modelagem das marcações | Pedagogo | Antes do piloto |
| Q-05 | Um dia marcado sem motivo, só com descrição, é marcação válida ou resíduo de uso, e o modelo novo deve permitir? | `educar_calendario_dia_cad.php:195-201` | Médio — coerência das marcações | Arquitetura | Antes da migração |
| Q-06 | A dupla gravação do dia na criação causou registros dobrados na base real? | `educar_calendario_dia_cad.php:240-242` | Alto — integridade da marcação | Dados | Antes da migração |
| Q-07 | A exclusão do motivo com dias referidos, do cabeçalho com marcações e do dia com anotações ocorre sem verificação; como está a base real nessas classes? | `educar_calendario_dia_motivo_cad.php:131-144` e `educar_calendario_ano_letivo_cad.php:198-215` | Alto — integridade referencial | Dados | Antes da migração |
| Q-08 | As marcações de dias por turma são apagadas junto com o dia na exclusão, ou ficam órfãs na base? | `educar_calendario_dia_cad.php:368-375` | Médio — dados órfãos | Dados | Antes da migração |
| Q-09 | A sessão de navegação do calendários causa perda de contexto entre telas em produção, e o modelo novo deve substituir por parâmetros? | `educar_calendario_ano_letivo_lst.php:84-89` | Baixo — usabilidade | Arquitetura | Antes do piloto |
| Q-10 | A exclusão da anotação mantém o vínculo do dia na base, e o modelo novo deve desfazer o vínculo? | `educar_calendario_anotacao_cad.php:167-174` | Médio — dados órfãos | Dados | Antes da migração |
| Q-11 | Os meses de início e de término do ano letivo são derivados das etapas; há escolas com etapas em fora do intervalo simples (bimestres isolados) na base real? | `educar_calendario_ano_letivo_lst.php:305-370` | Médio — marcação da grade | Dados | Antes da migração |
| Q-12 | O calendário padrão da rede com escola nula do modelo novo deve entrar na migração, ou só nas escolas? | `_reversa_sdd/Calendario/legacy-mapping.md:24` | Médio — governança do calendário | Arquitetura | Antes da migração |
| Q-13 | Os santos como tipos previsto no modelo novo (recesso, planejamento, conselho de classe) existem hoje como motivos com siglas próprias na base? | `_reversa_sdd/Calendario/legacy-mapping.md:48-57` e `educar_calendario_dia_motivo_cad.php:80-85` | Médio — migração dos motivos | Dados | Antes da migração |
| Q-14 | As cores da grade (rosa, laranja escuro, verde escuro, amarelo, azul claro) devem se manter no modelo novo como identidade visual? | `educar_calendario_ano_letivo_lst.php:238-370` | Baixo — apresentação | Produto | Antes do piloto |
| Q-15 | A marcação de dia em dia de fim de semana sem motivo está em uso (sábado letivo sem registro por turma), e o modelo novo deve validar o dia da semana? | `_reversa_sdd/Calendario/legacy-mapping.md:78` | Médio — coerência das marcações | Pedagogo | Antes do piloto |
| Q-16 | A publicação e o travamento do calendário do modelo novo exigem fluxo de aprovação com a secretaria, e quem aprova? | `_reversa_sdd/Calendario/legacy-mapping.md:41` | Alto — governança | Jurídico e Arquitetura | Antes do piloto |
| Q-17 | As anotações por dia devem migrar como eventos com público-alvo e notificações, e o histórico se mantém? | `_reversa_sdd/Calendario/legacy-mapping.md:27-28` | Médio — eventos | Produto | Antes do piloto |
| Q-18 | A duplicidade de calendário por escola e ano é refletida nos testes (a criação atualiza o primeiro registro), e o modelo novo deve bloquear bilateralmente? | `educar_calendario_ano_letivo_cad.php:116-141` | Médio — unicidade | Arquitetura | Antes da migração |
| Q-19 | Como o travamento do calendário se relaciona com a virada do ano letivo servido pelas unidades de ano letivo e de fechamento? | `_reversa_sdd/Calendario/legacy-mapping.md:82-83` | Alto — fechamento do ano | Arquitetura | Antes do piloto |
| Q-20 | Existe necessidade registrada das escolas do diagnóstico dos dias faltantes (como no modelo novo) em relatório impresso do legado? | `_reversa_sdd/Calendario/legacy-mapping.md:81` | Baixo — relatório | Produto | Antes do piloto |

> Total: 20 perguntas. Acumulado do plano: 227 perguntas em 12 units (207 de 11 units anteriores).
