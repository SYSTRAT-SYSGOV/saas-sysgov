# EvaluationRules (i-Educar legado) — Perguntas abertas

> Perguntas para o usuário/alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Negócio

1. Existem instituições que usam a regra inclusiva (`regra_diferenciada_id`) em produção? Como deve ser a migração dela? 🔴
2. O campo `pontos` (multiplicadores por etapa, CSV) está em uso real nas regras vigentes? Precisa de paridade completa no alvo? 🟡
3. Quantas regras existem por tenant no banco de produção há valores fora dos domínios do validador (ex.: `mediaRecuperacao` acima de 9,999)? 🔴

## Dados e modelo

4. `RegraRecuperacaoMes.php` consta no inventário mas não existe no snapshot — existiu em alguma versão? Alguma regra em produção depende de comportamento dele? 🔴
5. `regra_avaliacao_serie_ano` não tem PK nem unique `(serie_id, ano_letivo)` no DDL; no alvo deve virar PK composta? 🟡
6. As tabelas `*_excluidos` devem ser migradas como histórico ou substituídas por soft delete nativo do framework alvo? 🟡
7. `mediaRecuperacaoParalela` é validado como string no modelo — qual o valor correto do domínio (mencionado como `numeric(5,3)` no DDL)? 🟡
8. `qtdCasasDecimais` não tem validação no modelo; no alvo deve ser limitado (ex.: 0..3)? 🟡

## Contratos

9. O validador solto `RegraAvaliacaoValidator` (nota máx > mín, falta máx > mín) deve ser ativado no alvo ou descartado? 🟡
10. As duas regras seed (quantitativa/qualitativa) devem ser preservadas como dados default em novas instalações? 🟢
11. O contrato HTTP 422 com `message` (sem envelope de código) do diário deve ser mantido exatamente, ou o alvo pode evoluir a estrutura da resposta? 🟡
12. `EvaluationRuleNotDefinedInLevel` dispara em runtime (sem FK no vínculo série→regra em alguns fluxos); alvo deve criar FK dura ou manter exceção tipada? 🟡

## Escopo e sobreposição

13. As telas de edição usam `LegacyRemedialRule` e `ParallelRemedialCalculationType` novos junto do `CoreExt_DataMapper` — no alvo, qual das duas camadas sobrevive? 🟡
14. A resolução por série+ano (`regra_avaliacao_serie_ano`) e a resolução por matrícula (coluna da matrícula) divergem quando? Existe congelamento de regra por matrícula? 🔴

## Não funcionais

15. Há regra com `tipoNota = NUMERICACONCEITUAL` em produção (exige as duas tabelas de arredondamento)? 🔴
16. `desconsiderar_lancamento_frequencia` (2020-12) já é usado por todas as instituições ou é exceção? 🔴
17. `aprovar_pela_frequencia_apos_exame` (2024-09) e `reprovar_automaticamente_apos_dependencias` (2024-12): requisitos regulatórios a preservar com a mesma semântica? 🟡
18. Regrasuntas como `disciplinasAglutinadas` (varchar CSV de componentes) têm consumo vivo no cálculo? 🟡

## Migração

19. FKs órfãs (fórmula/tabela de arredondamento apontando para registros inexistentes) devem ser corrigidas na migração ou reportadas? 🔴
20. O alvo deve auditar exclusões de regra/matrizes `serie_ano` como o legado faz (`*_excluidos` + triggers)? 🟡

---

*Cumulativo: 447 perguntas em 23 units.*
