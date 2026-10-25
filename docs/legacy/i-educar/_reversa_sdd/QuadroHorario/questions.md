# QuadroHorario (i-Educar legado), Questions

> Perguntas abertas acumuladas da unit. Cada pergunta cita evidência e impacta o projeto `SYS-Educa` (SYSGOV). Ao responder, atualize esta lista.

---

## Bloco A: Migração dos dados (09 itens — quadros e slots existentes)

1. Quadros com `ano` nulo no cabeçalho: obrigar `ano` na migração derivando do ano das turmas, ou preservar nulo? 🟢 evidência: coluna `ano` opcional em `create_pmieducar_quadro_horario_table`.
2. Grades com sobreposição de horários já existentes no legado (turma e professor): migrar como estão (com marcação de conflito) ou bloquear até resolução? 🔴 evidência: não há validação no legado.
3. Aula com `sequencial` repetido por slot da mesma turma/dia/hora (slots "idênticos" criados 2 vezes): deduplicar na migração ou preservar? 🟡 evidência: sem chave de unicidade nas migrações.
4. Slots apagados (`ativo = 0`, com `data_exclusao`): migrar histórico de inatividade ou somente os ativos? 🟢 evidência: `excluirTodos` e `edita` usam `ativo`.
5. Rascunhos pendentes na `_aux` no dia da migração: descartar (são transitórios com TTL 3 h) ou tentar reconciliar? 🟢 evidência: `clsPmieducarQuadroHorarioHorariosAux.php:399-405`.
6. Slot com docente de instituição diferente (`ref_cod_instituicao_servidor`): como modelar no destino multi-tenant (vínculo inter-tenant)? 🟢 evidência: colunas de instituição do servidor/substituto.
7. Substitutos pontuais gravados no slot: converter em registros do histórico de substituição (T-16) com período vago (apenas "vigente até nova alteração")? 🟡 evidência: `ref_servidor_substituto` + não há datas no slot.
8. Datas de auditoria das aulas (sem autor no insert): preencher autor com o do cabeçalho na migração? 🟢 evidência: `clsPmieducarQuadroHorarioHorarios.php:160-237`.
9. Quadros de turmas do próprio sistema e de redes externas ("vida pregressa de horários"): mesmo tratamento? 🟡 evidência: sem distinção de origem nas tabelas.

## Bloco B: Choques, grades e ciclo de trabalho (06 itens)

10. Política do detector de choques: recusa dura, aviso com justificativa ou apenas sinalização visual? 🟡 contra bastão `legacy-mapping.md:177-327`.
11. Escolha de escopo do choque de professor: tenant inteiro (inter-escolas) como o bastão pede, ou por escola com checagem inter-escolas opcional? 🟡 evidência: bastão `:21`.
12. Versionamento de grade: recusa toda edição do publicado (nova versão) ou edição direta com rascunho? 🔴 bastão `:86-98`.
13. O rascunho de sessão (_aux) vira autosave no destino ou desaparece (estado apenas em memória/cliente)? 🟡 evidência: `_aux` com TTL.
14. "Todas as disciplinas" continua replicando um slot por componente no destino, ou os slots passam a ter grupo de componentes? 🟢 evidência: `educar_quadro_horario_horarios_cad.php:554-612`.
15. Capacidade semanal (carga da alocação ≥ slots): a regra fica só na pesquisa de servidor (como no legado) ou vira validação também no detector de choques? 🟢 evidência: `educar_pesquisa_servidor_lst.php:415-470`.

## Bloco C: Papel do quadro para o professor (05 itens)

16. Bandeira `exigir_vinculo_turma_professor`: continuar obrigando vínculo por turma nas escolas com a bandeira ligada, ou unificar origem dos filtros (quadro sempre a fonte)? 🟢 evidência: `Professor.php:370-374`.
17. Professor com horários do quadro inconsistentes com a alocação (carga menor que slots): tentar reconciliar na migração ou aceitar divergência com alerta? 🟡 evidência: não há checagem entre as duas fontes nas migrações.
18. `multi_seriado`: continua como exceção global na validação de capacidade, ou regra por servidor no destino? 🟢 evidência: `educar_pesquisa_servidor_lst.php:471-490`.
19. Componentes derivados do quadro quando o componente mudou na série (componente removido com slot antigo ativo): o filtro do professor continua a exibir? 🟡 evidência: `componentesCurricularesAlocado` filter por quadro.
20. Diário liberado mesmo sem slot no quadro (aula eventual)? Hoje nada impede; formalizar exceção? 🔴 evidência: sem vínculo entre diário e slots além dos filtros.

---

## Respostas já resolvidas no legado (não perguntar)

- Um quadro ativo por turma/ano com recusa por duplicidade. 🟢
- Dias da semana 1–7 e horários de início/fim por slot; matriz DOM–SAB. 🟢
- Rascunho por identificador transitório com TTL de 3 horas. 🟢
- Substituto pontual sobreposto ao slot; substituição formal no afastamento. 🟢

---

## Registro de perguntas da unit

| Bloco | Itens |
|-------|-------|
| A: Migração | 9 |
| B: Choques, grades e ciclo | 6 |
| C: Papel do quadro para o professor | 5 |
| **Total da unit** | **20** |

> Acumulado do projeto: **327 perguntas em 17 units** (307 anteriores + 20 desta unit).
