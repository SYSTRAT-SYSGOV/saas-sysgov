# TabelaArredondamento (i-Educar legado) — Contratos

> Superfícies observáveis das tabelas de arredondamento. Confiança: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tabela `modules.tabela_arredondamento` (contrato fonte)

| Coluna | Tipo | Default | Campo do modelo |
|---|---|---|---|
| `id` | integer (sequence) | nextval | id |
| `instituicao_id` | integer NOT NULL | — | instituicao |
| `nome` | varchar(50) NOT NULL | — | nome |
| `tipo_nota` | smallint NOT NULL | 1 | tipoNota (enum RegraAvaliacao_Model_Nota_TipoValor; 1 numérica / 2 conceitual — 0 e 3 bloqueados no form) |
| `updated_at` | timestamp NULL | now() (trigger) | — |
| `arredondar_nota` | int2 NOT NULL | 0 | arredondarNota (boolean) |
| `normalizar_media` | boolean | false (2025-12-23) | normalizarMedia |

- PK `(id, instituicao_id)` + unique(id) + `tabela_arredondamento_id_seq`. 🟢

## Tabela `modules.tabela_arredondamento_valor`

| Coluna | Tipo | Default | Campo do modelo |
|---|---|---|---|
| `id` | integer (sequence) | nextval | — |
| `tabela_arredondamento_id` | integer NOT NULL (index + FK 2020-01) | — | tabelaArredondamento |
| `nome` | varchar(5) NOT NULL | — | nome (conceito "A" ou fração "0.5" nas tabelas numéricas) |
| `descricao` | varchar(50) | — | descricao |
| `valor_minimo` | numeric(5,3) | — | valorMinimo |
| `valor_maximo` | numeric(5,3) | — | valorMaximo |
| `casa_decimal_exata` | smallint | — | casaDecimalExata (para acao 3) |
| `acao` | smallint | — | acao (enum 0..3) |
| `observacao` | varchar(191) | — | observacao |

🟢 DDL + mapeadores; `attributeMap` só lista campos não-identidade (nome/descricao/observacao mapeados por identidade).

## Enum de ação (`TabelaArredondamento_Model_TipoArredondamentoMedia`)

```php
NAO_ARREDONDAR = 0                // 'Não utilizar arredondamento para esta casa decimal'
ARREDONDAR_PARA_NOTA_INFERIOR = 1 // 'Arredondar para o número inteiro imediatamente inferior'
ARREDONDAR_PARA_NOTA_SUPERIOR = 2 // 'Arredondar para o número inteiro imediatamente superior'
ARREDONDAR_PARA_NOTA_ESPECIFICA = 3 // 'Arredondar para a casa decimal específica' (usa casa_decimal_exata)
```
🟢

## API da entidade (contrato interno)

```php
// TabelaArredondamento_Model_Tabela
public round($value, $tipoNota, $limitDecimalRound = 1, $qtdeEtapas = null)  // tipoNota: 1 nota de etapa / 2 média
public findTabelaValor(): array            // valores da tabela (memoizado)
public deleteAllValues(): bool             // DELETE físico por clsBanco (id da tabela)
protected predictValue(...)                // sem chamador no snapshot 🟡

// TabelaArredondamento_Model_TabelaDataMapper
public findTabelaValor(Tabela $instance): array

// TabelaArredondamento_Model_TabelaValor
// getDefaultValidatorCollection() -> [] (validadores vazios) 🟡
```
🟢

## Consumo (contratos observados)

| Consumidor | Uso | Confiança |
|---|---|---|
| `Avaliacao_Service_Boletim::arredondaNota` (tip 1) | `round($nota, 1)` com tabela numérica/conceitual da regra + `qtdCasasDecimais` | 🟢 `Boletim.php:2288-2291` |
| `Boletim::arredondaMedia` | `round($media, 2, qtdCasasDecimais, qtdeEtapas)` | 🟢 `Boletim.php:2355-2364` |
| `Boletim` (situção de notas) | `round($score->nota, 1)` | 🟢 `:3063-3065` |
| `SchoolHistoryService` | `round($grade, 2)` | 🟢 `:156` |
| `NotaController` | `findTabelaValor()` como opções de nota | 🟢 `:138` |

## Dados default (seeds)

- Tabela 1 numérica "Tabela padrão de notas numéricas": 21 faixas de 0,5 em 0,5 (0-0.4, 0.5-0.9, ..., 10-10), `acao` NULL.
- Tabela 2 conceitual "Tabela padrão de notas conceituais": E (0-1.9), D (2-4.9), C (5-6.9), B (7-8.9), A (9-10).
🟢 `database/sqls/inserts/modules.tabela_arredondamento(_valor).sql`

## Tela (contrato)

- Processo **949**, nível **institucional**; salvar habilitado; **exclusão desabilitada**. 🟢
- Campos do form: `valor_id`, `valor_nome`, `valor_descricao`, `valor_observacao`, `valor_minimo`, `valor_maximo`, `valor_acao`, `valor_casa_decimal_exata`. 🟢
- Mensagens de erro: valores a partir de 100 ("Erro no formulário"); mínimos repetidos; min > max; gaps ("Números preenchidos fora do alcance."). 🟢
- `TabelaTipoNotaAjax`: XML `<tabela id="…">nome</tabela>` filtrado por `tipoNota` GET. 🟢
