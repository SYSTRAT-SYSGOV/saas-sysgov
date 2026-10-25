# TabelaArredondamento (i-Educar legado) — Perguntas abertas

> Perguntas para o usuário/alvo. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Negócio

1. Quais tabelas de arredondamento existem em produção por tenant (numéricas e conceituais) e como se relacionam com os sistemas de nota das regras? 🔴
2. Alguma instituição usa `arredondar_nota = 1` (arredondar nota da etapa)? E `normalizar_media = 1`? 🔴
3. Há tabelas numéricas em produção com ações por casa decimal (acao 1/2/3) — ou o padrão é a tabela seed "sem ação"? 🔴

## Semântica do algoritmo

4. O fallback do último conceito (fora das faixas) deve ser paridade ou erro explícito no alvo? 🟡
5. A comparação da casa decimal com o `nome` do valor por coerção PHP (`'5' == '0.5'`) é bug ou projeto? Como devem funcionar nomes fracionários em tabelas numéricas no alvo? 🟡
6. A normalização da média (÷ etapas) usa a média formal da regra para conceituais — confirmar que `qtdeEtapas` lido pelo Boletim é sempre o número de etapas da régua (turma/regra). 🟡
7. `NUMERICACONCEITUAL` (tipo 3): tabela nunca é criada com tipo 3 — no alvo a validação de compatibilidade deve se manter na unit de regras como hoje? 🟡

## Dados

8. Faixas com gaps ou min > max já gravadas no banco de produção (fora da validação da tela)? A migração deve corrigir silenciosamente ou reportar? 🔴
9. Valores com `valor_minimo = valor_maximo` (faixas de ponto único, como "4.000-4.000" do seed) são prescritivos de design? 🟢
10. `descricao` e `observacao` de valor são exibidos em algum relatório/boletim ou só na tela? 🟡
11. A PK composta (id, instituicao_id) + unique(id): manter como chave composta no alvo? 🟡

## Exclusão e histórico

12. Tabelas referenciadas por regras excluídas: há órfãos em produção? Bloqueio no alvo? 🔴
13. A remoção de valores por delete-all + reinsert perde histórico — o alvo deve versionar valores das tabelas? 🟡
14. Por que a exclusão da tabela está desabilitada na tela (`_deleteOption = false`)? Exclusão por banco acontece em produção? 🔴

## Integração e futuro

15. `predictValue` (previsão do conceito para atingir uma média) não tem chamador — descartar no alvo ou implementar como feature? 🟡
16. O XML do `TabelaTipoNotaAjax` deve virar JSON no alvo? 🟡
17. O histórico escolar (`SchoolHistoryService`) arredonda com a tabela da regra `round($grade, 2)` — manter mesma tabela ou regra própria? 🟡
18. `casa_decimal_exata` é smallint (ex.: acao 3 transforma 7.5 em 7.8) — a nota original não arredondada é preservada no lançamento e o conceito é só exibição? 🟡
19. Quando a regra é NUMERICACONCEITUAL (tipo 3), as duas tabelas da regra são usadas (numérica para nota, conceitual para média) — confirmar que a escolha por `round(..., $tipoNota)` cobre todas as situações (paridade na unit `Avaliacao`). 🟡
20. Existem modificações locais (fórum/customização do tenant) nas tabelas de arredondamento não cobertas pelo snapshot? 🔴

---

*Cumulativo: 487 perguntas em 25 units.*
