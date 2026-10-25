# ComponenteCurricular (i-Educar legado), Design

> Como o subsistema de matriz curricular está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `EditController` (ComponenteCurricular) | Cadastro do componente | 🟢 `ieducar/modules/ComponenteCurricular/Views/EditController.php:3-61` |
| `AnoController` | Matriz de carga por série | 🟢 `AnoController.php:3-11` |
| `ComponentesSerieController` (Api) | Matriz da série por API | 🟢 `ComponentesSerieController.php:14-48` |
| `EditController` (AreaConhecimento) | Cadastro de área | 🟢 `ieducar/modules/AreaConhecimento/Views/EditController.php:3-16` |
| `ComponenteCurricular_Model_Componente` + DataMapper | Entidade e persistência | 🟢 `Model/Componente.php:3-16` |
| `ComponenteCurricular_Model_AnoEscolar` + DataMapper | Matriz por série | 🟢 `Model/AnoEscolar.php:3-22` |
| `ComponenteCurricular_Model_Turma` + TurmaDataMapper | Componentes por turma | 🟢 `Model/TurmaDataMapper.php:7-35` |
| `AreaConhecimento_Model_Area` + AreaDataMapper | Áreas do conhecimento | 🟢 `Model/Area.php:3-14` |
| Enumeradores `TipoBase`, `TipoNota`, `CodigoEducacenso` | Tabelas de domínio | 🟢 três arquivos de enumeração |
| Modelos Eloquent `LegacyDiscipline*`, `LegacyKnowledgeArea`, `LegacySchoolGradeDiscipline`, `MigratedDiscipline` | Camada nova dos mesmos dados | 🟢 `app/Models/**` |
| `SchoolClassController::atualizaComponentesCurriculares` | Gravação da turma | 🟢 `app/Http/Controllers/SchoolClassController.php:296-339` |

### Domínio

O domínio é a **matriz curricular em quatro camadas**: a área do conhecimento agrupa os componentes, a matriz por série fixa a carga horária e o tipo de nota por ano letivo, a habilitação escola e série (`escola_serie_disciplina`) filtra a oferta das escolas, e o vínculo por turma sobrescreve a carga com a variação de docente e de etapas. O consumo dominante é o avaliativo: o serviço de boletim lê os componentes da turma pelo mesmo `TurmaDataMapper` para as notas e faltas. 🟢 `Model/TurmaDataMapper.php` e `ieducar/modules/Avaliacao/Service/Boletim/Acessores.php:268-282` e `ieducar/lib/App/Model/IedFinder.php:594-602`

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `educar_componente_curricular_lst.php` | Listagem com filtros | 🟢 `educar_componente_curricular_lst.php:25-50` |
| `/module/ComponenteCurricular/edit` e `/view` | Cadastro e detalhe do componente | 🟢 `EditController.php (Componente)` |
| `/module/ComponenteCurricular/ano` com `cid` | Matriz de carga por série | 🟢 `AnoController.php:107-128` |
| `/module/AreaConhecimento/edit` | Cadastro de área | 🟢 `EditController.php (Área)` |
| POST `/module/Api/ComponentesSerie/atualiza-componentes-serie` | Gravação da matriz da série | 🟢 `ComponentesSerieController.php:375-396` |
| POST `/module/Api/ComponentesSerie/replica-componentes-adicionados-escolas` | Replicação nas escolas | 🟢 `:375-396` |
| POST `/module/Api/ComponentesSerie/exclui-componentes-serie` | Exclusão em massa | 🔴 `:375-396` e `:257-266` |
| POST `/module/Api/ComponentesSerie/remove-componentes-serie` | Remoção de componente validada | 🟢 `:425-446` |
| GET `/module/Api/ComponentesSerie/existe-dispensa` e `existe-dependencia` | Consultas de proteção | 🟢 `:297-357` |
| POST `module` da turma via `SchoolClassController::store` | Gravação da turma com componentes | 🟢 `SchoolClassController.php:22-110` |

Processos de permissão: 946 (componente), 945 (área), 580 na ação "Novo" da listagem, com níveis distintos. 🟢 `EditController.php:9` e `EditController.php (Área):9` e `educar_componente_curricular_lst.php:141`

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `_save()` (componente) | Coleta do POST com o mapa do formulário e gravação | 🟢 `EditController.php (Componente):205-246` |
| `_save()` (matriz por série) | Sincronização de inserção, interseção e exclusão | 🟢 `AnoController.php:210-255` |
| `bulkUpdate()` | Atualização em massa dos componentes da turma com trava | 🟢 `TurmaDataMapper.php:68-126` |
| `validaAtualizacao()` | Trava por turmas, lançamentos e anos | 🟢 `ComponentesSerieController.php:50-126` |
| `buildUpdateInfo()` / `executaAtualizacaoComponentes()` | Diff e gravação da matriz | 🟢 `:448-553` |
| `replicaComponentesAdicionadosNasEscolas()` | Replicação na habilitação escola e série | 🟢 `:152-183` |
| `existeDispensa()` / `existeDependencia()` | Consultas de proteção | 🟢 `:297-357` |
| `deleteDisciplineSchoolClass()` | Apagamento em massa dos vínculos da turma | 🟢 `SchoolClassController.php:341-346` |
| `Excluir()` (área) | Exclusão com verificação de vínculos | 🟢 `EditController.php (Área):169-181` |
| `findByName()` / `findComponenteCurricularAnoEscolar()` | Buscas utilitárias | 🟢 `ComponenteDataMapper.php:85-125` |

---

## Fluxo Principal

**Gravar a matriz da série pela API.**

1. A operação `atualiza-componentes-serie` recebe a série e os componentes com carga, horas por falta, tipo de nota e anos letivos. 🟢 `ComponentesSerieController.php:16-28`
2. O diff dos anos letivos é calculado contra a matriz persistida, separando inseridos e removidos. 🟢 `:448-495`
3. A validação bloqueia a desvinculação por três portas: turmas vinculadas na matriz, lançamentos do diário legado e lançamentos do iDiário, inclusive por ano removido. 🟢 `:50-126`
4. Bloqueada a operação, a exceção devolve a lista de erros; liberada, a gravação atualiza ou insere cada componente. 🟢 `:32-48` e `:497-553`

---

## Fluxos Alternativos

- **Cadastro do componente:** o POST é recolhido pelas chaves do mapa do formulário, ordenamento vazio vira 99999, e a entrega usa os validadores do modelo; a exceção devolve a mensagem genérica. 🟢 `EditController.php (Componente):205-246`
- **Matriz pela tela do módulo:** cada série recebe caixa de seleção e carga, e a sincronização apaga as não marcadas pela diferença de chaves. 🟢 `AnoController.php:176-255`
- **Turma pela interface nova:** os vínculos da turma são apagados em massa antes da reconstituição, e cada componente recebe carga própria, docente, etapas específicas e etapas utilizadas. 🔴 `SchoolClassController.php:296-346`
- **Turma pela tela legada:** a lista da escola e série alimenta a grade com a diferenciação condicionada ao parâmetro institucional. 🟢 `educar_turma_cad.php:901-985`
- **Replicação:** os componentes adicionados na série ganham habilitação nas escolas, com a união dos arranjos de anos letivos. 🟢 `ComponentesSerieController.php:152-183`
- **Remoção validated:** a remoção de um componente da série apaga a matriz, as habilitações das escolas e os componentes das turmas do último ano aberto. 🟢 `:211-255` e `:425-446`
- **Exclusão em massa:** apaga toda a matriz da série sem as travas de lançamento. 🔴 `:257-295`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `App_Model_IedFinder::getSeries` / `getSerie` / `getCurso` | Séries agrupadas por curso na matriz | Saída | 🟢 `AnoController.php:79-102` |
| `App_Model_IedFinder::getEscolaSerieDisciplina` | Grade da turma | Saída | 🟢 `educar_turma_cad.php:913-920` |
| `iDiarioService::getClassroomsActivityByDiscipline` | Trava de lançamentos externos | Saída | 🟢 `TurmaDataMapper.php:109` |
| `CheckPostedDataService::hasDataPostedInGrade` | Trava de lançamentos legados | Saída | 🟢 `ComponentesSerieController.php:80-90` |
| `clsPmieducarEscolaSerieDisciplina` | Habilitação escola e série | Saída | 🟢 `:160-181` |
| `LegacyDisciplineExemption` | Consulta de dispensas | Saída | 🟢 `:328-342` |
| Serviço de boletim (Avaliacao) | Consumo dos componentes da turma | Entrada | 🟢 `Acessores.php:268-282` |
| Parâmetro institucional `componente_curricular_turma` | Habilitação da diferenciação | Entrada | 🟢 `educar_turma_cad.php:936-942` |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Quatro camadas de composição curricular: área, componente, matriz da série, habilitação e turma. | DataMappers e tabelas | 🟢 |
| A sincronização por diferença de chaves nas três entidades de vínculo. | `AnoController.php:226-236` e `TurmaDataMapper.php:70-105` | 🟢 |
| Trava do iDiário injetada por parâmetro opcional no DataMapper. | `TurmaDataMapper.php:64` e `:108-114` | 🟢 |
| Trava da matriz da série em três portas independentes. | `ComponentesSerieController.php:55-126` | 🟢 |
| Anos letivos da matriz como arranjo PostgreSQL denormalizado com diff explícito. | `:482-495` | 🟢 |
| Chave composta nas três tabelas de vínculo, com sentinela de ordenamento 99999. | DataMappers | 🟢 |
| Diferenciação por turma precedida do apagamento em massa pela interface nova. | `SchoolClassController.php:307-337` | 🔴 |
| A exclusão da área verifica vínculos, mas a do componente não é oferecida e a da série em massa não verifica. | `EditController.php (Área):169-181` e `ComponentesSerieController.php:257-295` | 🔴 |
| Camada híbrida: entidades `CoreExt` nas telas e modelos Eloquent nas rotas novas. | arquivos das duas camadas | 🟢 |

---

## Estado Interno

- O controlador da matriz por tela acumula as matrizes persistentes na propriedade `_entries` indexada pela série. 🟢 `AnoController.php:26-43`
- O POST do componente é recolhido exclusivamente pelas chaves do `_formMap`. 🟢 `EditController.php (Componente):205-221`
- A reconstituição dos vínculos da turma usa a lista da requisição como fonte única. 🔴 `SchoolClassController.php:312-333`

---

## Observabilidade

- Não há log estruturado das gravações da matriz. 🔴
- Os erros de trava são devolvidos como listas de mensagens na resposta da API. 🟢 `ComponentesSerieController.php:119-123`
- Não há métricas nem trilha de auditoria das trocas de matriz. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Bypass da trava do iDiário | A gravação da turma apaga os vínculos antes de reconstruir, e o apagamento sem consulta desliga a trava. | `SchoolClassController.php:307` e `:341-346` | 🔴 |
| Exclusão em massa sem trava | A rota de exclusão de todos os componentes da série ignora lançamentos e turmas vinculadas. | `ComponentesSerieController.php:257-295` | 🔴 |
| Injeção SQL por nome | `findByName` interpola a busca na query. | `ComponenteDataMapper.php:104-111` | 🔴 |
| Injeção SQL por anos letivos | O arranjo de anos é montado por texto no `DB::raw`, aceito da requisição. | `ComponentesSerieController.php:523-525` | 🔴 |
| Coluna `hora_falta` fora do mapeamento | O contrato do modelo novo não lista a coluna presente na matriz real. | `LegacyDisciplineAcademicYear.php:46-53` | 🟡 |
| Processos de permissão divergentes | 580 na ação da listagem e 946 no formulário. | `educar_componente_curricular_lst.php:141` | 🟡 |
| Sem validação legal da carga | A soma mínima de horas e a coerência da matriz não são verificadas. | busca | 🔴 |
| Sem trilha de auditoria | Trocas de matriz sem autor e instante registrados. | busca | 🔴 |
