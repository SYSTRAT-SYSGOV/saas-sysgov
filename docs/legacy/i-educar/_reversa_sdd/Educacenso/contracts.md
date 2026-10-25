# Educacenso (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de exportação do Censo Escolar. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de entrada do módulo (legado intranet)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/intranet/educar_educacenso_index.php` | — | Página de entrada do Educacenso | Breadcrumb da tela de exportação 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:35-37` |
| GET | `/intranet/educar_exportacao_educacenso.php` | `escola`, `ano`, `instituicao` | Página de exportação com os campos `#ref_cod_escola`, `#ano`, `#ref_cod_instituicao`, `#escola_em_andamento` e `#enable_export` | Carrega o script do módulo quando há escola 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:58-71` |
| POST | `/intranet/educar_exportacao_educacenso.php` | `exportacao`, `escola` | Arquivo `.txt` em ISO-8859-1 | Nome do arquivo formado pelo código INEP e pela data e hora 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:41-53` |

### Campos do formulário de exportação 🟢 `ieducar/intranet/educar_exportacao_educacenso.php:58-70`

| Campo | Tipo | Papel |
|-------|------|-------|
| `ref_cod_escola` | inteiro | Escola cujo Censo será exportado |
| `ano` | inteiro | Ano letivo de referência |
| `ref_cod_instituicao` | inteiro | Instituição, dona da data de referência do Educacenso |
| `escola_em_andamento` | `1` ou `0` | Define a lista de registros auditados |
| `enable_export` | `0` ou `1` | Chave de configuração que habilita o download |

---

## 2. Contrato da API de análise (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/EducacensoAnalise?valida-instituicao` | `instituicao` | `{ "valid": true }` | Falso quando a instituição não tem `data_educacenso` 🟢 `EducacensoAnaliseController.php:2233-2238` |
| GET | `/module/Api/EducacensoAnalise?school-is-active` | `school_id` | `{ "active": true }` | Falso para situação 2 ou 3 🟢 `EducacensoAnaliseController.php:61-70` |
| GET | `/module/Api/EducacensoAnalise?registro-00` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `EducacensoAnaliseController.php:2244-2245` |
| GET | `/module/Api/EducacensoAnalise?registro-10` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `:2246-2247` |
| GET | `/module/Api/EducacensoAnalise?registro-20` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `:2248-2249` |
| GET | `/module/Api/EducacensoAnalise?registro-30` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `:2250-2251` |
| GET | `/module/Api/EducacensoAnalise?registro-40` | `escola` | `{ "title", "mensagens" }` | 🟢 `:2252-2253` |
| GET | `/module/Api/EducacensoAnalise?registro-50` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `:2254-2255` |
| GET | `/module/Api/EducacensoAnalise?registro-60` | `escola`, `ano` | `{ "title", "mensagens" }` | 🟢 `:2256-2257` |
| GET | `/module/Api/EducacensoAnalise?registro-89` | `escola`, `ano` | `{ "title", "mensagens" }` | Segunda fase 🟢 `:2258-2259` |
| GET | `/module/Api/EducacensoAnalise?registro-90` | `escola`, `ano` | `{ "title", "mensagens" }` | Segunda fase 🟢 `:2260-2261` |
| GET | `/module/Api/EducacensoAnalise?registro-91` | `escola`, `ano` | `{ "title", "mensagens" }` | Segunda fase 🟢 `:2262-2263` |

### Formato da mensagem de pendência 🟢 `EducacensoAnaliseController.php:101-110`

```json
{
  "text": "Dados para formular o registro 30 da escola ESCOLA X não encontrados. Verifique se a data de nascimento da pessoa PESSOA Y foi informada.",
  "path": "(Pessoas > Cadastros > Pessoas físicas > Editar > Campo: Data de nascimento)",
  "linkPath": "/intranet/atendidos_cad.php?cod_pessoa_fj=12345",
  "fail": true
}
```

| Campo | Tipo | Uso observado |
|-------|------|---------------|
| `text` | texto | Descrição da inconsistência, com o nome da escola e o nome da pessoa 🟢 `Register30CommonDataAnalysis.php:31-38` |
| `path` | texto | Caminho do campo no cadastro, entre parênteses 🟢 `Register30CommonDataAnalysis.php:37` |
| `linkPath` | texto | URL da tela que corrige a inconsistência 🟢 `Register30CommonDataAnalysis.php:38` |
| `fail` | booleano | `true` impede a exportação, `false` é apenas aviso 🟢 `Educacenso.js:183` |

### Envelope da análise 🟢 `EducacensoAnaliseController.php:88` e `:405`

| Campo | Tipo | Observação |
|-------|------|-----------|
| `title` | texto | Rótulo da seção, no formato `Análise exportação - Registro NN` |
| `mensagens` | array | Lista de pendências do registro |
| `any_error_msg` | booleano | Sinaliza erro fatal da análise, com `msgs` no formato legado 🟢 `Educacenso.js:167-169` |

---

## 3. Contrato da API de exportação (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/EducacensoExport?educacenso-export` | `escola`, `ano`, `data_ini`, `data_fim` | `{ "conteudo": "..." }` ou `{ "error": true, "mensagem": "..." }` | Datas no formato brasileiro, convertidas para o PostgreSQL 🟢 `EducacensoExportController.php:94-116` |

| Campo de saída | Tipo | Significado |
|----------------|------|-------------|
| `conteudo` | texto | Arquivo do Censo Escolar completo, delimitado por pipe e com quebra de linha ao fim de cada registro 🟢 `EducacensoExportController.php:199` |
| `error` | booleano | Indica falha na montagem do arquivo 🟢 `EducacensoExportController.php:108-113` |
| `mensagem` | texto | Detalhe da falha, com a orientação do dado faltante 🟢 `EducacensoExportController.php:193` |

---

## 4. Contrato do arquivo exportado

| Aspecto | Valor observado | Fonte |
|---------|-----------------|-------|
| Delimitador de campo | caractere pipe `|` | `src/Modules/Educacenso/ArrayToCenso.php:7` |
| Delimitador de registro | quebra de linha `PHP_EOL` | `ieducar/modules/Api/Views/EducacensoExportController.php:199` |
| Codificação | ISO-8859-1, convertida de UTF-8 | `ieducar/intranet/educar_exportacao_educacenso.php:44` |
| Tipo de conteúdo | `text/plain` | `ieducar/intranet/educar_exportacao_educacenso.php:47` |
| Nome do arquivo | `{cod_escola_inep}_{ddmm_HHii}.txt` | `ieducar/intranet/educar_exportacao_educacenso.php:48` |
| Disposição | `attachment; filename={nome}` | `ieducar/intranet/educar_exportacao_educacenso.php:49` |
| Número de campos | 53 no registro 00, 187 no registro 10, 66 no registro 20, 110 no registro 30, 7 no registro 40, 38 no registro 50, 33 no registro 60 e 2 no registro 99 | `src/Modules/Educacenso/Data/Registro00.php:70-124`, `Data/Registro10.php:33-221`, `Data/Registro20.php:70-137`, `EducacensoExportController.php:259-370`, `:395-403`, `:432-451`, `:479-513` e `:539-542` |

### Registro 99

O registro de fechamento é o literal `99|`, sem totalizadores de linha. 🟢 `ieducar/modules/Api/Views/EducacensoExportController.php:539-542`

---

## 5. Contrato de validação pontual (legado HTTP)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/educacenso/validar/nome` | `values[]` ou `value` | `{ "success": true }` ou `{ "success": false, "error": "..." }` com status 422 | 🟢 `app/Http/Controllers/Educacenso/ValidatorController.php:11` |
| GET | `/educacenso/validar/data-nascimento` | `values[]` ou `value` | idem | 🟢 `ValidatorController.php:12` |
| GET | `/educacenso/validar/certidao-nascimento` | `values[]` ou `value` | idem | 🟢 `ValidatorController.php:13` |

| Chave de rota | Classe de validação | Confiança |
|---------------|--------------------|-----------|
| `nome` | `iEducar\Modules\Educacenso\Validator\NameValidator` | 🟢 |
| `data-nascimento` | `iEducar\Modules\Educacenso\Validator\BirthDateValidator` | 🟢 |
| `certidao-nascimento` | `iEducar\Modules\Educacenso\Validator\BirthCertificateValidator` | 🟢 |

Qualquer valor de rota fora dessa lista devolve `{ "error": "Wrong validator", "success": false }` com status 422. 🟢 `ValidatorController.php:18-21`

Os demais validadores do módulo, existentes no código e não expostos por rota, são: `AdministrativeDomainValidator`, `CargaHorariaTotalValidator`, `CnpjMantenedoraPrivada`, `DeficiencyValidator`, `DifferentiatedLocationValidator`, `FormaOrganizacaoTurma`, `FormasContratacaoEscolaValidator`, `IdadePermitidaValidator`, `InepExamValidator`, `InepNumberValidator`, `NisValidator`, `ResidenceCityValidator`, `SchoolManagers`, `Telefone` e `HasDifferentStepsOfChildEducationValidator`. 🟢 `src/Modules/Educacenso/Validator/`

---

## 6. Contrato de consulta dos registros (legado MVC)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/educacenso/consulta` | `record` (`20`, `40`, `50` ou `60`), `ref_cod_escola`, `year` | Página HTML `educacenso.consult` | Rota nomeada `educacenso.consult` 🟢 `routes/web.php:64-65` |

| Registro | Ordenação | Campos notáveis |
|---------|-----------|-----------------|
| `20` | `nomeTurma`, `codTurma` | `nomeTurma`, `codTurma`, `codCurso`, `codSerie`, `tipoAtendimento` 🟢 `EducacensoController.php:55-64` |
| `40` | `nomePessoa`, `codigoPessoa` | `codigoPessoa`, `nomePessoa`, `inepGestor`, `cargo`, `criterioAcesso`, `tipoVinculo` 🟢 `:66-73` |
| `50` | `nomeDocente`, `nomeTurma`, `codigoPessoa`, `codigoTurma`, `idAlocacao` | `componentes` expandido em descrições de disciplina 🟢 `:75-95` |
| `60` | `nomeAluno`, `codigoPessoa`, `codigoTurma`, `enturmacaoId` | `codigoPessoa`, `inepAluno`, `codigoTurma`, `turmaTurnoId`, `turnoId` 🟢 `:97-108` |

---

## 7. Contrato de persistência das referências INEP

| Tabela legada | Chave | Colunas | Fonte |
|---------------|-------|---------|-------|
| `modules.educacenso_cod_escola` | `(cod_escola, cod_escola_inep)` | `cod_escola_inep bigint`, `nome_inep varchar(255)`, `fonte varchar(255)` | `database/migrations/legacy/2020_01_01_110000_create_modules_educacenso_cod_escola_table.php:11-27` |
| `modules.educacenso_cod_docente` | `(cod_servidor, cod_docente_inep)` | `cod_docente_inep bigint`, `nome_inep`, `fonte` | `2020_01_01_110000_create_modules_educacenso_cod_docente_table.php:11-25` |
| `modules.educacenso_cod_aluno` | `(cod_aluno, cod_aluno_inep)` | `cod_aluno_inep bigint`, `nome_inep`, `fonte` | `2020_01_01_110000_create_modules_educacenso_cod_aluno_table.php:11-25` |
| `modules.educacenso_cod_turma` | `(cod_turma, cod_turma_inep)` | `cod_turma_inep bigint`, `nome_inep`, `fonte` | `2020_01_01_110000_create_modules_educacenso_cod_turma_table.php:11-25` |

O campo `fonte` preserva a origem do código, o que permite manter múltiplas origens para a mesma entidade. 🟢

---

## 8. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/Educacenso/legacy-mapping.md`, seção 4, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| POST | `/api/v1/educa/censo/batches` | criação de lote, equivalente ao início da exportação 🟢 `EducacensoExportController.php:118-147` |
| GET | `/api/v1/educa/censo/batches` | histórico de lotes, ausente no legado 🔴 |
| GET | `/api/v1/educa/censo/batches/{id}` | detalhe do lote e estatísticas, ausente no legado 🔴 |
| POST | `/api/v1/educa/censo/batches/{id}/validate` | análise prévia, equivalente a `registro-NN` 🟢 `EducacensoAnaliseController.php:2244-2263` |
| GET | `/api/v1/educa/censo/batches/{id}/issues` | listagem de pendências, equivalente a `mensagens` 🟢 `EducacensoAnaliseController.php:101-110` |
| POST | `/api/v1/educa/censo/batches/{id}/generate` | geração assíncrona do arquivo, ausente no legado 🔴 |
| GET | `/api/v1/educa/censo/batches/{id}/download` | download com conferência de hash, ausente no legado 🔴 |
| POST | `/api/v1/educa/censo/batches/{id}/import-return` | importação do retorno do INEP, sem implementação no legado 🔴 |
| GET | `/api/v1/educa/censo/mappings/stages` | catálogo de etapas, equivalente a `modules.etapas_curso_educacenso` 🟢 |
| PUT | `/api/v1/educa/censo/mappings/stages` | de/para de etapas 🟢 |
| GET | `/api/v1/educa/censo/mappings/disciplines` | catálogo de disciplinas, equivalente a `modules.componente_curricular.codigo_educacenso` 🟢 |
| PUT | `/api/v1/educa/censo/mappings/disciplines` | de/para de disciplinas 🟢 |
| GET | `/api/v1/educa/censo/consult/{record}` | consulta paginada de conferência, equivalente a `/educacenso/consulta` 🟢 `EducacensoController.php:41-118` |
| GET | `/api/v1/educa/censo/validators/{validator}` | validação pontual, equivalente a `/educacenso/validar/{validator}` 🟢 `ValidatorController.php:16-29` |
