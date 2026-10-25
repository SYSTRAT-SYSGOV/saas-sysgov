# TabelaArredondamento (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Módulo `ieducar/modules/TabelaArredondamento`: tabelas de arredondamento de notas numéricas e conceituais, seus valores/ranges, a lógica `round()` e o validador/CRUD. Pontes Eloquent: `LegacyRoundingTable`, `LegacyValueRoundingTable`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Recorte (evitar duplicação)

- A **unit `RegraAvaliacao`** cobre a escolha das tabelas na regra (FKs `tabela_arredondamento_id` e `tabela_arredondamento_id_conceitual`); a unit `EvaluationRules` já registra a validação de compatibilidade.
- O **consumo** do arredondamento nas notas/médias (Boletim: `round($nota, 1)`, `round($media, 2, casasDecimais, qtdeEtapas)`) é da unit `Avaliacao` — aqui está a mecânica de `round()` e os contratos.
- Esta unit documenta **tabelas + valores + algoritmo de arredondamento + telas + DDL**. 🟢 `ieducar/modules/TabelaArredondamento/*`

---

## Visão Geral

Cada instituição mantém tabelas de arredondamento por sistema de nota (`tipo_nota` em `RegraAvaliacao_Model_Nota_TipoValor`, defeito 1 = numérica, com NENHUM e NUMERICACONCEITUAL excluídos das escolhas): **numéricas** (1) e **conceituais** (2). Cada tabela tem N valores com faixas (`valor_minimo`..`valor_maximo`), rótulo (`nome` — conceito ou fração da casa decimal) e ação para casas decimais (arredondar para baixo/para cima/para casa decimal exata). 🟢 `Tabela.php`, DDL, seeds

> ⚠️ O inventor (modules.json) declara `nome varchar(255)` na tabela e omite `normalizar_media`; o DDL real tem `varchar(50)` e a coluna `normalizar_media` chegou por migração (2025-12-23). Divergência do inventário. 🟡

---

## Responsabilidades

- Guardar a tabela (instituição, nome 5..50, tipo de nota, flag "arredondar nota da etapa" `arredondarNota`, flag `normalizarMedia`). 🟢
- Guardar os N valores da tabela: `nome` (varchar(5)), `descricao` (50), `observacao` (191), `valorMinimo`/`valorMaximo` `numeric(5,3)`, `acao` (enum 0..3) e `casaDecimalExata` (smallint). 🟢 `TabelaValor.php`, DDL valor
- Arredondar nota OU média (`round($value, $tipoNota, $limitDecimalRound, $qtdeEtapas)`): `tipoNota` 1 = nota de etapa, 2 = média. 🟢 `Tabela.php:95-160`
- Validar a tabela no cadastro: nome 5..50, tipo de nota escolha (sem NENHUM). 🟢 `Tabela.php:82-93`
- CRUD das tabelas/valores nas telas (processo 949, nível institucional; exclusão **desabilitada** na tela de edição), com busca ajax das tabelas por tipo de nota (`TabelaTipoNotaAjax` XML). 🟢
- Fornecer `predictValue` (previsão do conceito mínimo para atingir um valor esperado via fórmula) — **sem chamador no snapshot**. 🟡

---

## Regras de Negócio

### Algoritmo `round()` 🟢 `Tabela.php:95-160`

| Passo | Regra |
|---|---|
| 1 | Limita o valor a `$limitDecimalRound` casas (`Portabilis_Utils_Float::limitDecimal`, default 1). |
| 2 | Tabela de valores vazia → devolve o valor limitado **sem arredondar**. |
| 3 | Nota (tipo 1) em tabela NUMERICA com `arredondarNota` vazio → devolve valor limitado (não arredonda nota de etapa); com `arredondarNota = 1`, arredonda também. |
| 4 | Conceitual: se for média (tipo 2) e `normalizarMedia = 1` com `qtdeEtapas > 0` → divide a média pelo nº de etapas antes de procurar a faixa. |
| 5 | Conceitual: escala por 10^3 (`_precision = 3`), `floor` e procura faixa `min <= valor <= max`; retorna o `nome` do conceito (E, D, C, B, A nos seeds). Se nenhuma faixa contiver, usa o **último conceito** da lista (fallback silencioso). |
| 6 | Numérica: compara a **parte decimal** da nota (string após o ponto) com `nome` do valor da tabela; quando casados, aplica `acao`: 1 = `floor` da nota inteira; 2 = `ceil`; 3 = substitui a parte decimal por `casaDecimalExata` (ex.: nota 7.5 com acao 3 e casaDecimalExata 8 → 7.8). Sem casa casada → valor limitado. |

### Validações da tela de edição 🟢 `EditController.php:484-620`

| Regra | Mensagem |
|---|---|
| Valor mínimo/máximo no mínimo 100 (inclusive) | "Erro no formulário" |
| Valores mínimos repetidos | "Erro no formulário. Os valores devem ser diferentes entre os tipos de conceitos." |
| `min > max` dentro do conceito | "Erro no formulário. Valor mínimo não pode ser maior que valor máximo dentro do mesmo conceito." |
| Faixas descontínuas/sobrepostas (`min <= max anterior`) | "Erro no formulário. Números preenchidos fora do alcance." |
| Instância `isValid()` falso | "Erro no formulário" (na prática nunca falso: a coleção de validadores de `TabelaValor` está **vazia**) | 🟡 |

- Salvar em edição: **delete-all + reinsert** — `deleteAllValues()` (DELETE direto por `clsBanco`) recria todos os valores; ids mudam a cada salvação. 🟢
- Decimais com vírgula normalizadas (`str_replace(',', '.')`). 🟢
- `tipoNota` fica **editável apenas na criação** (edita exibe texto, não lista). 🟢 `EditController.php:190-200`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| TA-01 | Tabelas por instituição com tipo de nota (numérica/conceitual) imutável após criação. | Must | 🟢 DDL + tela |
| TA-02 | N valores com faixas contíguas válidas (min repetidos, min>max, sobreposição bloqueados no form). | Must | 🟢 `validatesRange` |
| TA-03 | Arredondamento conceitual por faixa com normalização opcional da média. | Must | 🟢 algoritmo. |
| TA-04 | Arredondamento numérico por casa decimal com 3 ações (inferior/superior/casa exata). | Must | 🟢 algoritmo |
| TA-05 | Flag "arredondar nota da etapa" para tabelas numéricas. | Should | 🟢 |
| TA-06 | Flag `arredondarNota` controla se notas de etapa (tipo 1) em tabelas numéricas passam pelo arredondamento por acao; médias sempre passam. | Should | 🟢 |
| TA-07 | Consumo pelo Boletim (notas etapa, médias) e pelo `SchoolHistoryService` (histórico, `round($grade, 2)`). | Must | 🟢 Boletim.php:2288-2364, 3063-3065 |
| TA-08 | Busca ajax de tabelas por tipo de nota (XML, `TabelaTipoNotaAjax`). | Should | 🟢 |
| TA-09 | Seeds default: tabela numérica (faixas de 0,5 em 0,5 até 10) e conceitual (E/D/C/B/A). | Must | 🟢 seeds |

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Precisão | faixas `numeric(5,3)`; escala interna 10^3 no `round` | `_precision = 3` | 🟢 |
| Integridade | PK (id, instituicao_id) + unique(id) + FK na tabela de valores (migração 2020-01) + trigger `updated_at` | DDL | 🟢 |
| Performance | delete-all + reinsert na edição; N ida/contravolta para cada valor | `_save` | 🟡 |
| Consistência | comparação de casa decimal por coerção PHP (string == string → numérica) | algoritmo | 🟡 |

## Critérios de Aceitação

```gherkin
Dado tabela conceitual E/D/C/B/A (faixas 0-1.9 / 2-4.9 / 5-6.9 / 7-8.9 / 9-10)
Quando arredondar média 7.3 (tipo 2)
Então rótulo "B" 🟢

Dado tabela conceitual com normalizarMedia = 1 e média 20 com 4 etapas
Quando arredondar (tipo 2)
Então normalizada para 5 → rótulo "C" 🟢

Dado tabela numérica padrão (sem acao nos seeds)
Quando arredondar nota 7.3 (tipo 1) com qtdCasasDecimais 2
Então devolve 7.3 limitado (sem acao aplicada) 🟢

Dado tabela numérica com acao para casa "5" = ARREDONDAR_PARA_NOTA_ESPECIFICA casa 8
Quando arredondar nota 7.5
Então devolve 7.8 🟢

Dado nota de etapa 8.49 em tabela numérica com arredondarNota vazio
Quando arredondar (tipo 1)
Então devolve o valor sem arredondar (só limite de casas) 🟢

Dado valores min repetidos na tela
Quando salvar
Então mensagem "Os valores devem ser diferentes entre os tipos de conceitos." 🟢

Dado faixas com gap (min do próximo <= max do anterior)
Quando salvar
Então mensagem "Números preenchidos fora do alcance." 🟢
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Tabela + valores + faixas válidas | Must | núcleo da exibição das notas 🟢 |
| `round()` conceitual/numérico paridade | Must | contrato de exibição 🟢 |
| Seeds default | Must | paridade de instalação 🟢 |
| `predictValue` | Descartar | sem chamador 🟡 |
| delete-all + reinsert | Alvo | revisar idempotência/ids no alvo 🟡 |

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `ieducar/modules/TabelaArredondamento/Model/Tabela.php` | entidade + `round`, `predictValue`, `findTabelaValor`, `deleteAllValues` | 🟢 |
| `ieducar/modules/TabelaArredondamento/Model/TabelaValor.php` | entidade valor (validadores vazios) | 🟢 🟡 |
| `Model/TabelaDataMapper.php` / `Model/TabelaValorDataMapper.php` | CRUD `modules.tabela_arredondamento(_valor)` | 🟢 |
| `Model/TipoArredondamentoMedia.php` | enum acao 0..3 | 🟢 |
| `Views/{Index,Edit,View}Controller.php` | telas processo 949 | 🟢 |
| `Views/TabelaTipoNotaAjax.php` | ajax XML por tipo de nota | 🟢 |
| `app/Models/LegacyRoundingTable.php`, `LegacyValueRoundingTable.php` | pontes Eloquent | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_modules_tabela_arredondamento(_valor)_table.php` | DDL | 🟢 |
| `database/migrations/legacy/2020_01_01_120000_add_foreign_keys_in_modules_tabela_arredondamento_valor_table.php` | FK | 🟢 |
| `database/migrations/2025_12_23_120000_add_normalizar_media_to_tabela_arredondamento.php` | coluna nova 2025 | 🟢 |
| `database/sqls/inserts/modules.tabela_arredondamento(_valor).sql` | seeds | 🟢 |
