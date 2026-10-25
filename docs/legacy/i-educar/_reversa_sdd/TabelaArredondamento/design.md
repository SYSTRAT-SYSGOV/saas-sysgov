# TabelaArredondamento (i-Educar legado) — Design

> Estrutura de dados, contratos, fluxos, dependências e riscos das tabelas de arredondamento.
> Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Modelo relacional (schema `modules`)

| Tabela | Chaves | Colunas | Confiança |
|---|---|---|---|
| `tabela_arredondamento` | PK (id, instituicao_id) + unique(id); sequence | `id`, `instituicao_id`, `nome varchar(50) NOT NULL`, `tipo_nota smallint NOT NULL DEFAULT 1`, `updated_at timestamp DEFAULT now()` (trigger), `arredondar_nota int2 NOT NULL DEFAULT 0`, `normalizar_media boolean DEFAULT false` (2025-12) | 🟢 |
| `tabela_arredondamento_valor` | PK id (sequence); index em `tabela_arredondamento_id`; FK para tabela | `nome varchar(5) NOT NULL`, `descricao varchar(50)`, `valor_minimo numeric(5,3)`, `valor_maximo numeric(5,3)`, `casa_decimal_exata smallint`, `acao smallint`, `observacao varchar(191)` | 🟢 |

### Classes

| Classe | Papel | Fonte |
|---|---|---|
| `TabelaArredondamento_Model_Tabela` | entidade + `round()`, `predictValue()` (sem chamador), `findTabelaValor()`, `deleteAllValues()` (DELETE direto por `clsBanco`) | 🟢 |
| `TabelaArredondamento_Model_TabelaValor` | entidade valor; validadores padrão **vazios** (`getDefaultValidatorCollection` = []) | 🟢 |
| `TabelaArredondamento_Model_TabelaDataMapper` | CRUD tabela; PK composta; filler `findTabelaValor(instance)` | 🟢 |
| `TabelaArredondamento_Model_TabelaValorDataMapper` | CRUD valores (`attributeMap` só mapeia campos não-identidade; `nome`/`descricao`/`observacao` mapeados por identidade) | 🟢 |
| `TabelaArredondamento_Model_TipoArredondamentoMedia` | enum acao: 0 NAO_ARREDONDAR, 1 INFERIOR, 2 SUPERIOR, 3 NOTA_ESPECIFICA | 🟢 |
| `App\Models\LegacyRoundingTable`, `LegacyValueRoundingTable` | pontes Eloquent | 🟢 |

### Semântica de `round()`

```text
round($value, $tipoNota, $limitDecimalRound = 1, $qtdeEtapas = null)
  $tipoNota: 1 = nota de etapa, 2 = média
  conceitual($tipo_nota da tabela = 2):
      média normalizada (÷ etapas) quando normalizarMedia=1 e qtdeEtapas>0
      escala 10^3 + floor; faixa min..max inclusive; retorno = nome do conceito
      fora de toda faixa → último conceito (fallback silencioso)
  numérica($tipo_nota da tabela = 1):
      compara parte decimal (string) com valor->nome
      quando casado: acao 1 floor / 2 ceil / 3 troca parte decimal por casaDecimalExata
      sem casamento → valor só limitado em casas
  tipoNota da tabela == 3 (NUMERICACONCEITUAL): nunca ocorre (bloqueado no form)
```
🟢 `Tabela.php:95-160`

---

## Fluxo Principal — arredondamento no consumo

1. `Boletim` (unit `Avaliacao`) decide a tabela: conceitual da regra (`tabelaArredondamentoConceitual`) ou numérica (`tabelaArredondamento`), conforme `tipoNota` da regra. 🟢 `Boletim.php:2288-2364, 3063-3065`
2. Nota de etapa: `round($nota, 1)`; médias: `round($media, 2, qtdCasasDecimais, qtdeEtapas)`. 🟢
3. `round` carrega os valores memoizados (`findTabelaValor`), limita casas, aplica faixas/acao conforme semântica acima. 🟢
4. `SchoolHistoryService` reutiliza `round($grade, 2)` para o histórico. 🟢 `app/Services/SchoolHistoryService.php:156`
5. `NotaController` lista `findTabelaValor()` como opções válidas de nota na tela de lançamento. 🟢 `NotaController.php:138`

## Fluxo 2 — cadastro (processo 949)

1. Listagem via `LegacyRoundingTable` (Eloquent); detalhe e edição CoreExt. 🟢
2. Form: valores em grade de campos (`valor_id`, `valor_nome`, `valor_descricao`, `valor_observacao`, `valor_minimo`, `valor_maximo`, `valor_acao`, `valor_casa_decimal_exata`). 🟢
3. Salvar: validações de range no controlador → `deleteAllValues()` → reinsert via `TabelaValorDataMapper` (com vírgula normalizada). 🟢
4. Exclusão da tabela desabilitada (`_deleteOption = false`). 🟢
5. `TabelaTipoNotaAjax` devolve XML das tabelas por tipo de nota (usado pelo JavaScript da tela de regras). 🟢

## Fluxos de Exceção

| Situação | Comportamento | Confiança |
|---|---|---|
| Tabela sem valores | valor limitado em casas, sem arredondamento | 🟢 |
| Nota de etapa em tabela numérica sem flag | sem arredondamento (só limite) | 🟢 |
| Média fora da última faixa conceitual | adota o último conceito da lista | 🟢 (fallback) |
| Faixas inválidas no form | bloqueio com mensagens específicas | 🟢 |
| `isValid()` do valor falso | teoricamente bloco de erro; nunca ocorre (sem validadores) | 🟡 |
| Edição de tipo de nota da tabela | bloqueado na edição (exibido como texto, não lista) | 🟢 |

---

## Dependências

| Dependência | Papel | Fonte |
|-------------|-------|-------|
| `RegraAvaliacao` / `EvaluationRules` | FKs + validação de compatibilidade da tabela com o sistema de nota | 🟢 |
| `FormulaMedia` | `predictValue` referenciava fórmulas — sem chamador hoje | 🟡 |
| `Avaliacao` (Boletim) | consumidor principal de `round()` | 🟢 |
| `HistoricoEscolar` (SchoolHistoryService) | consumo para arredondar média do histórico | 🟢 |
| `Portabilis_Utils_Float` | `limitDecimal` | 🟢 |
| `Usuario` | acesso processo 949 | 🟢 |

## Decisões de design identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Faixas com min/máx decimais + conceito textual (em vez de tabela de notas isoladas) | DDL + seeds | 🟢 |
| `deleteAllValues` + reinsert: recria ids e simplifica o form | `_save` | 🟢 |
| PK composta (id, instituicao_id) com unique(id) — paridade com FormulaMedia | DDL | 🟢 |
| Validadores do valor vazios → classe confia no controlador para validação | `TabelaValor` | 🟢 🟡 |
| `_precision` fixo 3 (escala 10^3) | `Tabela` | 🟢 |
| `predictValue` (integração com fórmulas) sem consumo — candidato a descarte | grep | 🟡 |

## Estado interno

- `_tabelaValores` memoizado por instância da tabela. 🟢

---

## Riscos e lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Fallback do último conceito | valor fora de todas as faixas adota o último conceito silenciosamente (ex.: média > 10 ou < 0) | algoritmo | 🟢 🟡 |
| Comparação por coerção | casa decimal comparada com `nome` por `==` PHP (numérica); rows com nome fracionário ("0.5") só casam quando a nota tem 1 dígito decimal após o ponto? — semântica frágil | algoritmo | 🟡 |
| Validador valor vazio | a validação do conteúdo só existe no controlador (regra de função duplicada no alvo) | `TabelaValor` | 🟡 |
| delete-all + reinsert | perda de ids e histórico; ids mudam a cada edição | `_save` | 🟡 |
| Inventário desatualizado | nome varchar(255) e `normalizar_media` ausente no modules.json | inventor × DDL | 🟡 |
| Caso vazio NUMERICACONCEITUAL | tabela não pode ser criada com tipo 3, mas regra do tipo 3 usa as duas tabelas (numérica + conceitual) — reconciliar no alvo | form | 🟡 |
