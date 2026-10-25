# School (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de escolas e estrutura pedagógica. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato da API de escola (legado AJAX)

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/module/Api/Escola?escola` | `id` | `{ "escola_inep_id": 12345 }` | 🟢 `ieducar/modules/Api/Views/EscolaController.php:53-63` |
| PUT | `/module/Api/Escola?escola` | `id`, `escola_inep_id` | `{ "id": 123 }` com mensagem de sucesso | 🟢 `EscolaController.php:65-83` |
| GET | `/module/Api/Escola?escola-search` | `tipo`, `valor` | Lista de até 8 escolas | 🟢 `EscolaController.php:106-111` |
| GET | `/module/Api/Escola?escolas-para-selecao` | `instituicao` | `{ "options": { "__123": "ESCOLA A" } }` | 🟢 `EscolaController.php:544-572` |
| GET | `/module/Api/Escola?escolas-para-selecao-sem-filtro-por-usuario` | `instituicao` | `{ "options": {...} }` | 🟢 `EscolaController.php:574-584` |
| GET | `/module/Api/Escola?escolas-usuario` | `id` | `{ "escolas": [1, 2] }` | 🟢 `EscolaController.php:529-542` |
| GET | `/module/Api/Escola?escola-ano-letivo` | `escola_id` | Ano letivo em andamento | 🟢 `EscolaController.php:503-513` |
| GET | `/module/Api/Escola?escola-dependencia-administrativa` | `escola_id` | Valor da dependência administrativa | 🟢 `EscolaController.php:515-527` |
| GET | `/module/Api/Escola?parametros-escolas` | `modified` | `{ "escolas": [...] }` | 🟢 `EscolaController.php:598-612` |
| GET | `/module/Api/Escola?endereco-escola` | `escola_id` | País, estado, município, identificadores de país e de estado | 🟢 `EscolaController.php:619-635` |
| GET | `/module/Api/Escola?escola-serie-disciplinas-anos-letivos` | `escola`, `modified` | `{ "escolas": [...] }` | 🟢 `EscolaController.php:637-696` |
| GET | `/module/Api/Escola?etapas-por-escola` | `instituicao_id` | Etapas por escola | 🟢 `EscolaController.php:116-186` |
| GET | `/module/Api/Escola?etapas-da-escola-por-ano` | `ano`, `instituicao_id` | Etapas por ano | 🟢 `EscolaController.php:220-230` |
| GET | `/module/Api/Escola?info-escolas` | filtros | Escolas com endereço e telefones | 🟢 `EscolaController.php:399-463` |
| GET | `/module/Api/Escola?escolas-multiple-search` | filtros | Busca múltipla de escolas | 🟢 `EscolaController.php:465-501` |

### Formato da lista de seleção de escolas 🟢 `ieducar/modules/Api/Views/EscolaController.php:558` e `:568`

```json
{
  "options": {
    "__123": "ESCOLA DE ENSINO FUNDAMENTAL",
    "__456": "ESCOLA MUNICIPAL DE ENSINO MEDIO"
  }
}
```

| Elemento | Formato | Observação |
|----------|---------|------------|
| Chave | `__` prefixado ao identificador da escola | Evita colisão com o valor textual 🟢 `EscolaController.php:558` |
| Valor | Nome da escola em maiúsculas e convertida para UTF-8 | 🟢 `EscolaController.php:568` |

### Atributos dos parâmetros da escola 🟢 `ieducar/modules/Api/Views/EscolaController.php:603`

| Campo | Tipo | Observação |
|-------|------|------------|
| `cod_escola` | inteiro | Identificador da escola |
| `utiliza_regra_diferenciada` | booleano | Indica uso da regra de avaliação diferenciada |
| `updated_at` | data e hora | Instante da última alteração, usado no filtro incremental |

### Formato da matriz de séries e disciplinas 🟢 `ieducar/modules/Api/Views/EscolaController.php:687-695`

```json
{
  "escolas": [
    {
      "escola_id": 123,
      "series_disciplinas_anos_letivos": [
        { "serie_id": 1, "disciplinas_anos_letivos": [ { "1": 2024 }, { "2": 2024 } ] }
      ],
      "series_disciplinas_etapas_utilizadas": [
        { "serie_id": 1, "disciplinas_etapas_utilizadas": [ { "1": 1 } ] }
      ]
    }
  ]
}
```

---

## 2. Contrato da gravação do código INEP da escola

| Campo | Tipo | Regra | Fonte |
|-------|------|-------|-------|
| `id` | inteiro | Escola alvo da gravação | 🟢 `EscolaController.php:67` |
| `escola_inep_id` | inteiro | Código INEP; quando ausente, o código é removido | 🟢 `EscolaController.php:30-31` |

| Atributo gravado | Valor | Fonte |
|------------------|-------|-------|
| `escola` | Identificador da escola | 🟢 `EscolaController.php:33` |
| `escolaInep` | Código INEP informado | 🟢 `EscolaController.php:34` |
| `fonte` | Literal `fonte` | 🟢 `EscolaController.php:37` |
| `nomeInep` | Literal `-` | 🟢 `EscolaController.php:38` |
| `created_at` | Literal `NOW()` | 🟢 `EscolaController.php:41` |

---

## 3. Contrato da API REST de recursos

| Método | Caminho | Entrada | Saída | Processo | Observação |
|--------|---------|---------|-------|----------|------------|
| GET | `/api/schools` | filtros de paginação e de filtro | Coleção paginada de escolas | 561 | 🟢 `app/Http/Controllers/Api/SchoolController.php:16-26` |
| GET | `/api/institutions` | filtros de paginação e de filtro | Coleção paginada de instituições | 753 | 🟢 `app/Http/Controllers/Api/InstitutionController.php:16-20` |
| GET | `/api/resource/schools` | filtros | Coleção de escola com identificador e nome | — | 🟢 `app/Http/Controllers/Api/Resource/School/ResourceSchoolController.php:11-14` |
| GET | `/api/resource/school-academic-years` | filtros | Coleção de ano letivo | — | 🟢 `app/Http/Controllers/Api/Resource/SchoolAcademicYear/ResourceSchoolAcademicYearController.php:11-14` |

| Recurso | Atributos expostos | Observação |
|---------|-------------------|------------|
| Escola do recurso simples | `id`, `name` | A pessoa jurídica é excluída do recurso 🟢 `app/Models/Builders/LegacySchoolBuilder.php:13` |
| Escola paginada | Todos os atributos graváveis do modelo | 🟢 `LegacySchoolBuilder.php:13` |

### Filtros aceitos pelo builder da escola 🟢 `app/Models/Builders/LegacySchoolBuilder.php`

| Filtro | Método | Observação |
|--------|--------|------------|
| `name` | `whereName` | Busca sem acento sobre a pessoa jurídica 🟢 `:16-19` |
| `institution` | `whereInstitution` | Filtra pela instituição mantenedora 🟢 `:32-35` |
| `school` | `whereSchool` | Filtra por identificador 🟢 `:37-40` |
| `localization_zone` | `whereLocalizationZone` | Filtra pela zona de localização 🟢 `:42-45` |
| `differentiated_localization_area` | `whereDifferentiatedLocalizationArea` | Filtra pela localização diferenciada 🟢 `:47-50` |
| `active` | `whereActive` | Filtra pela atividade 🟢 `:43-46` |

---

## 4. Contrato de persistência das entidades do módulo

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.escola` | `cod_escola` | instituição, pessoa jurídica, sigla, situação de funcionamento, dependência administrativa, zona, localização diferenciada, gestor, secretário escolar, caracterização, infraestrutura, equipamentos, profissionais | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_table.php` |
| `pmieducar.instituicao` | `cod_instituicao` | nome, órgão regional, endereço, datas base, obrigatoriedade de campos do Censo, exigência de CPF, matrícula fora do período letivo | `app/Models/LegacyInstitution.php:61-78` |
| `pmieducar.escola_curso` | escola, curso | ativo, autorização, anos letivos | `app/Models/LegacySchoolCourse.php:16-28` |
| `pmieducar.escola_serie` | escola, série | ativo, anos letivos, hora inicial, hora final, hora de início e de fim do intervalo, travar enturmação sem vagas, travar abertura de turma com vagas | `app/Models/LegacySchoolGrade.php:18-33` |
| `pmieducar.escola_ano_letivo` | escola, ano | andamento, ativo, turmas por ano, copiar dados de professor, copiar dados de demais servidores, copiar turmas | `app/Models/LegacySchoolAcademicYear.php:19-28` |
| `pmieducar.bloqueio_ano_letivo` | instituição, ano | data de início, data de fim | `app/Models/LegacySchoolYearLock.php:10-20` |
| `public.school_managers` | employee, escola | cargo, critério de acesso, descrição, tipo de vínculo, gestor principal | `app/Models/SchoolManager.php:12-21` |
| `modules.educacenso_cod_escola` | escola, código INEP | nome no INEP, fonte | `app/Models/SchoolInep.php:11-20` |
| `school_spaces` | — | nome, tamanho, escola | `app/Models/SchoolSpace.php:9-14` |
| `school_notices` | — | instituição, usuário, escola, título, descrição, data, hora, local | `app/Models/SchoolNotice.php:15-24` |
| `pmieducar.escola_serie_disciplina` | escola, série, disciplina | anos letivos, etapas utilizadas | `ieducar/modules/Api/Views/EscolaController.php:676` |
| `relatorio.view_dados_escola` | escola | nome, endereço, telefones, CEP | `app/Models/View/SchoolData.php:8-46` |

---

## 5. Contrato de domínio da configuração institucional

| Parâmetro | Formato | Uso | Fonte |
|-----------|---------|-----|-------|
| `nm_instituicao` | texto | Nome da rede de ensino | 🟢 `app/Models/LegacyInstitution.php:66` |
| `orgao_regional` | texto | Órgão regional-education | 🟢 `LegacyInstitution.php:68` |
| `data_base_remanejamento` | data | Data base do remanejamento, convertida pelo serviço de data 🟢 `LegacyInstitution.php:200-203` |
| `data_base_transferencia` | data | Data base da transferência | 🟢 `LegacyInstitution.php:70` |
| `data_base_matricula` | data | Data base da matrícula | 🟢 `LegacyInstitution.php:72` |
| `data_fechamento` | data | Data de fechamento da ordenação de chamada | 🟢 `LegacyInstitution.php:73` |
| `data_expiracao_reserva_vaga` | data | Expiração da reserva de vaga | 🟢 `LegacyInstitution.php:71` |
| `data_educacenso` | data | Data de corte do Censo Escolar, convertida para data 🟢 `LegacyInstitution.php:126-129` |
| `obrigar_campos_censo` | booleano | Torna obrigatórios os campos do Censo na enturmação | 🟢 `LegacyInstitution.php:136-139` |
| `obrigar_cpf` | booleano | Torna o CPF obrigatório no cadastro de pessoa | 🟢 `ieducar/modules/Api/Views/PessoaController.php:545` |
| `permitir_matricula_fora_periodo_letivo` | booleano | Permite matricular fora do ano letivo | 🟢 `LegacyInstitution.php:148-153` |

---

## 6. Contrato de domínio do ano letivo

| Estado | Valor | Significado | Fonte |
|--------|-------|-------------|-------|
| Não inicializado | 0 | Ano criado e ainda não iniciado | 🟢 `app/Models/LegacySchoolAcademicYear.php:13` |
| Em andamento | 1 | Ano operacional da escola | 🟢 `LegacySchoolAcademicYear.php:14` |
| Finalizado | 2 | Ano encerrado | 🟢 `LegacySchoolAcademicYear.php:15` |

A consulta do ano em andamento exige simultaneamente `andamento = 1` e `ativo = 1`. 🟢 `ieducar/modules/Api/Views/EscolaController.php:508`

---

## 7. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/School/legacy-mapping.md`, seção 6, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/schools` | listagem paginada de escolas 🟢 `app/Http/Controllers/Api/SchoolController.php:16-26` |
| GET | `/api/v1/educa/schools/{id}` | detalhe da escola, com gestor e matriz 🟢 `ieducar/modules/Api/Views/EscolaController.php:53-63` |
| POST | `/api/v1/educa/schools` | cadastro da escola 🟢 `app/Models/LegacySchool.php:44-92` |
| PUT | `/api/v1/educa/schools/{id}` | atualização dos parâmetros escolares e dos gestores 🟢 `EscolaController.php:65-83` |
| GET | `/api/v1/educa/schools/{id}/matrix` | matriz de cursos e séries autorizados 🟢 `app/Models/LegacySchool.php:140-177` |
| POST | `/api/v1/educa/schools/{id}/courses` | habilitação de curso na unidade 🟢 `app/Models/LegacySchoolCourse.php` |
| POST | `/api/v1/educa/schools/{id}/grades` | habilitação de série e configuração das travas de vagas 🟢 `app/Models/LegacySchoolGrade.php` |
| GET | `/api/v1/educa/courses` | gestão de cursos da rede 🟢 `_reversa_sdd/School/legacy-mapping.md`, seção 4 |
| POST | `/api/v1/educa/courses` | criação de curso com etapas e calendário padrão 🟢 `_reversa_sdd/School/legacy-mapping.md`, seção 4 |
| GET | `/api/v1/educa/grades` | gestão de séries e anos curriculares 🟢 `_reversa_sdd/School/legacy-mapping.md`, seção 4 |
| GET | `/api/v1/educa/schools/{id}/academic-years` | ano letivo da unidade 🟢 `app/Models/LegacySchoolAcademicYear.php` |
| PUT | `/api/v1/educa/schools/{id}/academic-years/{year}` | andamento do ano letivo 🟢 `LegacySchoolAcademicYear.php:13-15` |
| GET | `/api/v1/educa/schools/{id}/capacity` | capacidade de matrícula por turno, ausente no legado como recurso 🔴 |
| GET | `/api/v1/educa/schools/{id}/waitlist` | fila de espera por turno, ausente no legado como recurso 🔴 |
| GET | `/api/v1/educa/institutions/settings` | configuração institucional com as datas base 🟢 `app/Models/LegacyInstitution.php:61-83` |
