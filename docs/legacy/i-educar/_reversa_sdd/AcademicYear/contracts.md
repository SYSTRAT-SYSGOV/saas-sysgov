# AcademicYear (i-Educar legado) — Contratos

> Superfícies observáveis: endpoints HTTP, entidades de dados e integrações. Campos conforme código legado.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Endpoints HTTP

### Tela legada (procedural, processo 561)
| Ação | Endpoint | Parâmetros | Comportamento |
|---|---|---|---|
| Form etapas | `intranet/educar_ano_letivo_modulo_cad.php?ref_cod_escola={X}&ano={Y}&ref_cod_modulo={M}` | escola, ano, módulo | Gera formulário com etapas do ano anterior e datas sugeridas ajustadas automaticamente. 🟢 |
| Novo/Editar (POST) | mesmo endpoint | `data_inicio[]`, `data_fim[]`, `ref_cod_modulo`, `dias_letivos[]`, checkboxes de cópia | Valida datas (outros anos) e nº etapas vs `modulo.num_etapas`; cria/atualiza etapas via `AcademicYearService`. 🟢 |
| Excluir (POST) | mesmo endpoint | escola+ano | `deleteAcademicYear` (andamento=2, ativo=0, etapas removidas). Bug de mensagem: "Exclusão não realizada." sempre. 🟢 |

### Tela de bloqueio (processo 21251)
| Ação | Endpoint | Chave | Campos |
|---|---|---|---|
| Cad/Editar | `intranet/educar_bloqueio_ano_letivo_cad.php?ref_cod_instituicao={I}&ref_ano={A}` | instituição+ano | `data_inicio` ("Data inicial permitida") e `data_fim` ("Data final permitida"). 🟢 |

### Lote (Laravel, processo `ACADEMIC_YEAR_IMPORT = 9999120`, admin)
| Método | Rota | Nome |
|---|---|---|
| GET | `/ano-letivo-em-lote` | `academic-year.edit` (form de admin; sem admin vê variante reduzida) |
| POST | `/ano-letivo-em-lote/processar` | `academic-year.process` (`acao` = `create` / `open` / `close`) |
| GET | `/ano-letivo-em-lote/status` | `academic-year.status` |

**Payload de entrada:** `{ ano, escola[], periodos[]{ data_inicio, data_fim }, acao, copiar_turmas?, copiar_alocacoes_e_vinculos_professores?, copiar_alocacoes_demais_servidores? }` 🟢

**Resposta (shape observado no código):**
```jsonc
{
  "ano": 2025,
  "processed": [ { "school_id": 1, "school_name": "...", "data": {...} } ],
  "skipped":  [ { "school_id": 2, "school_name": "...", "error": "Ano letivo 2025 já está aberto." } ],
  "errors":   [ { "school_id": 3, "school_name": "...", "type": "error", "error": "mensagem pt-BR" } ]
}
```
(Campos exatos do relatório por escola ainda contêm contadores de cópia — turmas, professores, alocações — como mensagem informativa.) 🟡

### Resource API
- `GET {resource}` → `ResourceSchoolAcademicYearController@index` — coleção JSON de `LegacySchoolAcademicYear` com filtros do builder (`getResource`). 🟢

---

## Entidades legadas (persistência)

### `pmieducar.escola_ano_letivo`
| Coluna | Tipo | Notas |
|---|---|---|
| `ref_cod_escola` + `ano` | PK composta | uma linha por escola/ano. 🟢 |
| `ref_usuario_cad` / `ref_usuario_exc` | int | auditoria (`data_exclusao` não preenchida no delete do serviço). 🟡 |
| `andamento` | smallint | 0=não iniciado, 1=em andamento, 2=finalizado. 🟢 |
| `ativo` | smallint | desativação lógica. 🟢 |
| `turmas_por_ano` | smallint | flag. 🟢 |
| `copia_turmas`, `copia_dados_professor`, `copia_dados_demais_servidores` | bool/smallint | flags de cópia usadas no código do ano. 🟢 |

### `pmieducar.ano_letivo_modulo`
| Coluna | Tipo | Notas |
|---|---|---|
| `ref_ano` + `ref_ref_cod_escola` + `sequencial` | chave | etapa dentro do ano da escola. 🟢 |
| `ref_cod_modulo` | int FK → `modulo` | tipo de etapa. 🟢 |
| `data_inicio`, `data_fim` | date | janela da etapa. 🟢 |
| `dias_letivos` | int/nulo | opcional. 🟢 |
| `escola_ano_letivo_id` | FK nova | ponte para `escola_ano_letivo` (modelo novo usa). 🟢 |

### `pmieducar.modulo` (`LegacyStageType`)
| Coluna | Notas |
|---|---|
| `cod_modulo`, `nm_tipo`, `num_etapas`, `ref_cod_instituicao`, `ativo` | catálogo de etapas por instituição. 🟢 |

### `pmieducar.bloqueio_ano_letivo`
| Coluna | Notas |
|---|---|
| `ref_cod_instituicao` + `ref_ano` | PK composta (1 janela por instituição/ano). 🟢 |
| `data_inicio`, `data_fim` | janela "permitida". Sem colunas de auditoria além do padrão; sem consumer de aplicação. 🔴 |

### Colunas-array `anos_letivos` (padrão de dados)
- `pmieducar.escola_curso.anos_letivos smallint[] DEFAULT '{}'::smallint[] NOT NULL` (também em `escola_serie`, `escola_serie_disciplina` e `componente_curricular_ano_escolar`). 🟢
- Consulta padrão no serviço: `? = ANY(anos_letivos)` + `NOT (? = ANY(anos_letivos))` + `array_append(anos_letivos, ?::smallint)`. 🟢

---

## Integrações

| Integração | Direção | Contrato | Confiança |
|---|---|---|---|
| `iDiarioService` (novo_educacao) | saída HTTP | URL/token de `config legacy.url_novo_educacao`/`token_novo_educacao`; consulta lançamentos por etapa antes da redução de etapas. | 🟢 |
| `ReleasePeriodService` + `Process::POST_OUT_PERIOD` | referência | a trava real do lançamento de notas/faltas vive no diário (unit `DiarioClasse`), não aqui. | 🟢 |
| `RegraAvaliacao` | referência | `LegacyEvaluationRuleGradeYear` copiado para o novo ano (unit `RegraAvaliacao`). | 🟢 |
| `Servidores` | referência | `EmployeeAllocation` copiado (unit `Servidores` para detalhes de alocação/vínculo). | 🟢 |
| Educacenso | referência | exportação lê datas de etapa/ano letivo (unit `Educacenso`). | 🟡 |

## Erros de aplicação

- `AcademicYearServiceException` — regra violada (datas, etapas, bloqueio), mensagem pt-BR propagada à tela. 🟢
- Lote: erros coletados por escola (sem perda do relatório inteiro; transação única no serviço). 🟢 🟡
