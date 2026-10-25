# HistoricoEscolar (i-Educar legado), Contracts

> Contratos de dados, serviços e interfaces do subsistema de histórico escolar. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de dados

### 1.1 Cabeçalho do histórico

| Coluna legado (`pmieducar.historico_escolar`) | Tipo | Semântica | Alvo sugerido (bastão) | Confiança |
|---|---|---|---|---|
| `id` | serial | Chave técnica | id | 🟢 |
| `ref_cod_aluno` | integer NOT NULL | Aluno | student_id | 🟢 |
| `sequencial` | integer NOT NULL | Número da etapa por aluno (máx + 1) | sequence | 🟢 |
| `ano` | integer NOT NULL | Ano da etapa | year | 🟢 |
| `carga_horaria` | double precision | Carga horária total | total_workload | 🟢 |
| `dias_letivos` | integer | Dias letivos | school_days | 🟢 |
| `escola` | varchar(255) NOT NULL | Nome textual da escola | school_name | 🟢 |
| `escola_cidade` | varchar(255) NOT NULL | Cidade da escola | school_city | 🟢 |
| `escola_uf` | varchar(3) | UF da escola | school_state_abbreviation | 🟢 |
| `observacao` | text | Observação livre | notes | 🟢 |
| `aprovado` | smallint NOT NULL default 1 | Código de situação (1–14) | final_status | 🟢 |
| `ativo` + `data_cadastro` + `data_exclusao` + `ref_usuario_cad/exc` | timestamps/ints | Vida do registro + autores | created_at/deleted_at/created_by/deleted_by | 🟢 |
| `faltas_globalizadas` | integer | Faltas globalizadas (regime geral) | global_absences | 🟢 |
| `nm_serie` | varchar(255) | Nome textual da série | grade_stage_name | 🟢 |
| `origem` | smallint default 1 | Origem (no legado, sempre 1 em ambas as entradas) | origin_type | 🟡 |
| `extra_curricular` | smallint | Marca extra-curricular | extracurricular | 🟢 |
| `ref_cod_matricula` | integer | Matrícula que originou (processamento) | registration_id | 🟢 |
| `import` | smallint | Registro importado | imported | 🟢 |
| `frequencia` | double precision | Percentual de frequência | frequency | 🟢 |
| `registro` / `livro` / `folha` | varchar | Assentamento notarial | registration_cert / book / sheet | 🟢 |
| `nm_curso` | varchar | Nome textual do curso | course_name | 🟢 |
| `aceleracao` | smallint | Programa de aceleração | accelerated | 🟢 |
| `dependencia` | boolean | Etapa cursada em dependência | dependency | 🟢 |
| `posicao` | smallint | Posição na coluna do modelo impresso | matrix_position | 🟢 |
| `historico_grade_curso_id` | integer | Grade de modelo impresso | grade_stage_type | 🟢 |

Fonte: migração `create_pmieducar_historico_escolar_table` contra `_reversa_sdd/HistoricoEscolar/legacy-mapping.md:15-60`.

### 1.2 Disciplinas do histórico

| Coluna legado (`pmieducar.historico_disciplinas`) | Tipo | Semântica | Alvo sugerido | Confiança |
|---|---|---|---|---|
| `id` | serial | Chave técnica | id | 🟢 |
| `ref_ref_cod_aluno` + `ref_sequencial` | integer(s) | Vínculo funcional ao cabeçalho (aluno + sequencial) | school_history_id | 🟢 |
| `sequencial` | integer NOT NULL | Ordem da linha (máx + 1 por cabeçalho) | sequence | 🟢 |
| `historico_escolar_id` | integer | Vínculo tardio populado por migração de 2026 | school_history_id | 🟢 |
| `nm_disciplina` | varchar(255) | Texto livre da disciplina | discipline_name | 🟢 |
| `nota` | varchar(255) | Nota textual livre (aceita "AP") | final_score | 🟢 |
| `faltas` | smallint | Faltas da disciplina | absences | 🟢 |
| `carga_horaria_disciplina` | double precision | Carga da disciplina | workload | 🟢 |
| `dependencia` | boolean | Dependência por disciplina | dependency | 🟢 |
| `tipo_base` | smallint | 1 comum, 2 diversificada | base_type | 🟢 |
| `ordenamento` | smallint | Ordem de exibição | order / sort_order | 🟢 |
| `import` | smallint | Importado | imported | 🟢 |

Fonte: migração `create_pmieducar_historico_disciplinas_table`, modelos `LegacySchoolHistoryDiscipline` e migrações 2026.

### 1.3 Grade de modelo impresso

| Coluna legado (`pmieducar.historico_grade_curso`) | Semântica | Confiança |
|---|---|---|
| `id` (`GRADE_SERIE=1`, `GRADE_ANO=2`, `GRADE_EJA=3`) | Modelo do relatório por organização de séries/anos/EJA | 🟢 |
| `descricao_etapa` | Descrição da etapa no modelo | 🟢 |
| `qtd_etapas` | Quantidade de etapas do modelo | 🟢 |

Fonte: migração + seed + constantes em `app/Models/LegacySchoolHistory.php`.

### 1.4 Códigos de situação (`aprovado` / final_status)

| Código | Descrição | Confiança |
|--------|-----------|-----------|
| 1 | Aprovado (Apro) | 🟢 |
| 2 | Reprovado (Repr) | 🟢 |
| 3 | Em andamento (Curs) | 🟢 |
| 4 | Transferido (Tran) | 🟢 |
| 5 | Reclassificado (Recl) | 🟢 |
| 6 | Abandono (DeFr) | 🟢 |
| 12 | Aprovado com dependência (AprDep) | 🟢 |
| 13 | Aprovado pelo conselho (AprCo) | 🟢 |
| 14 | Reprovado por faltas (RpFt) | 🟢 |

Fonte: `app/Models/SchoolHistoryStatus.php:9-44`.

---

## 2. Contratos de serviço

### 2.1 `SchoolHistoryService`

```php
// Contrato observado (assinaturas reais no legado)
getNextSequencial(int $alunoId): int                 // máximo + 1 por aluno 🟢
getSchoolName(int $escolaId): string                // nome educacional + complemento 🟢
gerarHistoricoTransferencia(int $registrationId, int $userId): void   // gera histórico Tran 🟢
insertGlobalAverage(int $studentId, int $historySequencial, int $disciplineSequencial): void
```

Fonte: `app/Services/SchoolHistoryService.php:19-157`, chamado de `educar_transferencia_solicitacao_cad.php:263` e `ProcessamentoApiController.php:857`.

### 2.2 Contrato do processamento (API AJAX do módulo)

| Operação | Parâmetros principais | Efeito | Confiança |
|----------|----------------------|--------|-----------|
| `get-matriculas` | cola/instituição/escola/curso/série/turma/ano (opcionais) | Lista matrículas com situação do histórico e estado do processamento | 🟢 `ProcessamentoApiController.php:997-1089` |
| `post-processamento` | matrícula + opções de fonte por campo + posição + assentamento + média por área/geral | Cria ou reprocessa o cabeçalho e as disciplinas, transacional | 🟢 `:549-601` |
| `delete-historico` / `get-historico` | matrícula | Remoção lógica / leitura do histórico existente | 🟢 `:436-467` |
| `dump-historicos` | matrículas | Inspeção dos históricos | 🟡 |

### 2.3 Combinações de fonte do processamento (campo → valores)

| Campo | Valores possíveis | Confiança |
|-------|------------------|-----------|
| Dias letivos | obrigatório, numérico | 🟢 |
| Grade curso | obrigatório, validada em Banco | 🟢 `ProcessamentoApiController.php:185-201` |
| Percentual de frequência | 0 = do boletim, 1 = manual | 🟢 `:527-536` |
| Situação | 0 = do boletim, 1 = manual (enum de matrícula) | 🟢 `:501-525` |
| Disciplinas | 0 = do boletim, 1 = manuais (nome, nota, falta, carga por linha) | 🟢 |
| Notas | 0 = do boletim, 1 = valor fixo AP, 2 = manual | 🟢 `ProcessamentoController.php:165-185` |
| Faltas | 0 = do boletim, 1 = valor fixo, 2 = manual | 🟢 |
| Faltas globalizadas | do boletim (só regime geral) | 🟢 `:538-547` |
| Média por área / média geral | ligadas por marcação | 🟢 `ProcessamentoController.php:222-233` |

---

## 3. Contratos de interface (telas)

| Tela | Processo | Nível | Papel | Confiança |
|------|----------|-------|-------|-----------|
| `educar_historico_escolar_lst.php` | — | menu do aluno | Listagem por aluno | 🟢 |
| `educar_historico_escolar_cad.php` | 578 | 7 | Vida pregressa (novo, editar, copiar, excluir) | 🟢 |
| `educar_historico_escolar_det.php` | — | — | Detalhe + regra de restrição | 🟢 |
| módulo histórico-escolar | 999613 | 7 | Processamento consolidado | 🟢 |
| `educar_transferencia_solicitacao_cad.php` | — | — | Gatilho do histórico de transferência | 🟢 |

Fonte: cabeçalhos dos arquivos em `ieducar/intranet/` e `ieducar/modules/HistoricoEscolar/`.

---

## 4. Contratos cruzados com outras units

| Unit | Contrato | Direção | Confiança |
|------|----------|---------|-----------|
| `Avaliacao` | Boletim fornece situação, percentual de presença, notas e faltas | Entrada do processamento | 🟢 |
| `RegraAvaliacao` | Regime de faltas globalizadas; tabela de arredondamento da média geral | Entrada | 🟢 |
| `TabelaArredondamento` | Arredondamento da linha "Média Geral" | Entrada | 🟢 |
| `Configuracao` | Bandeiras `controlar_posicao_historicos`, `restringir_historico_escolar`, `gerar_historico_transferencia` (tabela `instituicao`) | Entrada | 🟢 |
| `Enrollments` | Matrículas e última matrícula do aluno (vínculo de escola da restrição) | Entrada | 🟢 |
| `ComponenteCurricular` | Componentes e áreas de conhecimento para disciplinas e média por área | Entrada | 🟢 |
| `Unification` | Movimentação de históricos para o aluno vencedor | Referência | 🟢 |
| `Reports` | Documento timbrado (novo, sem base legada) | Consumidor | 🔴 |

---

## 5. Lacunas de contrato

- Não há contrato de agendamento ou fila para o processamento; tudo é requisição síncrona por matrícula. 🔴
- Não há trilha de auditoria de alteração de valores do histórico (somente autor de cadastro/exclusão). 🟡
- A distinção `origin_type` de destino não tem paridade legada: `origem` gravada é sempre 1 nas duas entradas. 🟡
- Nota é texto livre sem domínio numérico no banco; a normalização no alvo precisa de regra para os valores legados ("AP", vírgula decimal). 🟡
