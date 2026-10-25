# TabelaArredondamento (i-Educar legado) — Fluxos

> Fluxos observados no código. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Cadastro da tabela (processo 949)

1. Listagem via `LegacyRoundingTable` (Eloquent); edição via CoreExt (`EditController`, com valores em grade). 🟢
2. Criação: `tipoNota` escolhido entre numérica (1) e conceitual (2) (NENHUM e NUMERICACONCEITUAL excluídos da lista). Edição: tipo passa a exibição (imutável). 🟢
3. Ao salvar: valida valores até 100, mínimos repetidos, min > max e contiguidade de faixas; decimais com vírgula normalizados. 🟢
4. Em edição: `deleteAllValues()` → reinsert de todos os valores por `TabelaValorDataMapper` (ids novos a cada salvação). Em criação: `parent::_save()` (mapper da tabela) e valores pelo mesmo caminho. 🟢
5. `TabelaTipoNotaAjax` fornece o XML de tabelas por tipo de nota para as telas de regra. 🟢

## Fluxo 2 — Arredondamento de nota de etapa (consumo)

1. Professor lança nota; o `Boletim` arredonda para exibição/condição: `round($nota, 1)` usando a tabela da regra (numérica ou conceitual, conforme `tipoNota` da regra). 🟢
2. Tabela numérica com `arredondarNota` vazio → só limita casas (sem ação). Com `arredondarNota = 1` → casa decimal casada aplica acao. 🟢
3. Tabela conceitual nota de etapa → faixa devolve o conceito (A/B/C/D/E). 🟢

## Fluxo 3 — Arredondamento de média (consumo)

1. `Boletim::arredondaMedia`: `round($media, 2, qtdCasasDecimais, qtdeEtapas)`. 🟢
2. Conceitual com `normalizarMedia = 1`: média dividida pela quantidade de etapas antes das faixas. 🟢
3. Numérica: casa decimal casada aplica floor/ceil/casa exata; sem casamento, valor só limitado. 🟢
4. Situação de notas reutiliza `round($score->nota, 1)`. 🟢
5. Histórico escolar (`SchoolHistoryService`) arredonda a média do histórico com `round($grade, 2)`. 🟢

## Fluxo 4 — Seleção de valores válidos na tela de lançamento

1. `NotaController` carrega `findTabelaValor()` da tabela da regra. 🟢
2. As opções de nota disponíveis no lançamento são os `nome` dos valores (conceitos ou frações). 🟢

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Tabela sem valores | nota só limitada em casas (sem conceito/acao) | 🟢 |
| Fora de todas as faixas (conceitual) | último conceito adotado silenciosamente | 🟢 |
| Casa decimal sem linha casada (numérica) | valor mantido (só limite de casas) | 🟢 |
| Faixas inválidas no form | bloqueio com 4 mensagens distintas | 🟢 |
| Exclusão da tabela pela tela | bloqueado (`_deleteOption = false`) | 🟢 |
| Tipo de nota da tabela alterado na edição | impossível (imutável) | 🟢 |

## Pontos de Fail-silente (coleta para o Revisor)

- Fallback do último conceito em `round` (valor fora das faixas) — nunca avisa. 🟡
- Comparação de casa decimal por coerção PHP (`'5' == '0.5'` é falso): nomes fracionários em tabelas numéricas só casam com a parte decimal de um dígito? — semântica frágil a sanear no alvo. 🟡
- `isValid()` dos valores nunca falso (validadores vazios): o guard "Erro no formulário" do insert é morto. 🟡
- `predictValue` + `_getBestResultFromValuesArray` sem chamador (código morto integrado a fórmulas). 🟡
