# ComponenteCurricular (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de matriz curricular faz: manter áreas do conhecimento (BNCC), componentes curriculares com classificação de base e código INEP, a matriz de carga horária por série (componente_curricular_ano_escolar), a habilitação disciplina por escola e série (escola_serie_disciplina) e o vínculo de componentes por turma com carga, docente e etapas específicas.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema ComponenteCurricular do i-Educar governa a matriz curricular em quatro camadas: áreas do conhecimento, componentes curriculares, matriz por série com carga horária e tipo de nota, e vínculo por turma com carga própria, docente vinculado e etapas específicas. 🟢 `ieducar/modules/ComponenteCurricular/**`

Problema que resolve: padronizar as disciplinas da rede para a BNCC, o Censo Escolar (código INEP) e os diários de avaliação, com a ordenação usada no lançamento de notas e faltas e a marcação de componentes desconsiderados na aprovação ou reprovação. 🟢 `ieducar/modules/ComponenteCurricular/Views/EditController.php:17-61`

O legado tem uma **trava de integridade real**: a desvinculação de componente com notas, faltas ou pareceres lançados no iDiário é bloqueada por `bulkUpdate` (turma) e por `validaAtualizacao` (série). 🟢 `ieducar/modules/ComponenteCurricular/Model/TurmaDataMapper.php:108-121` e `ieducar/modules/Api/Views/ComponentesSerieController.php:50-126`

A mesma trava tem **um caminho que a desliga**: a gravação da turma pela interface nova apaga primeiro todos os vínculos da turma e depois reconstroi, e o apagamento em massa não consulta o iDiário. 🔴 `app/Http/Controllers/SchoolClassController.php:296-346`

---

## Responsabilidades

- Manter áreas do conhecimento com nome, seção, ordenamento e a bandeira de agrupador de descritores, sob o processo 945. 🟢 `ieducar/modules/AreaConhecimento/Views/EditController.php:3-42`
- Manter componentes curriculares com nome, abreviada, base curricular, área, código Educacenso, ordenamento, bandeira de desconsideração na progressão e cor, sob o processo 946. 🟢 `ieducar/modules/ComponenteCurricular/Views/EditController.php:3-61`
- Manter a matriz de carga horária do componente pelas séries, com a sincronização de inserção e exclusão por diferença. 🟢 `ieducar/modules/ComponenteCurricular/Views/AnoController.php:210-255`
- Manter a matriz da série por API, com carga, horas por falta, tipo de nota e anos letivos, e o diff de anos letivos inseridos e removidos. 🟢 `ieducar/modules/Api/Views/ComponentesSerieController.php:16-126` e `:448-553`
- Replicar os componentes adicionados na série para as escolas da série na tabela `pmieducar.escola_serie_disciplina`. 🟢 `ComponentesSerieController.php:128-183`
- Manter os componentes por turma em atualização em massa, com carga própria, docente vinculado, etapas específicas e etapas utilizadas. 🟢 `TurmaDataMapper.php:68-126` e `app/Http/Controllers/SchoolClassController.php:296-339`
- Bloquear a desvinculação de componente com registro no iDiário, na turma e na série. 🟢 `TurmaDataMapper.php:108-121` e `ComponentesSerieController.php:55-126`
- Presentar a listagem de componentes com filtro por nome, abreviação, base e área, paginada em vinte. 🟢 `ieducar/intranet/educar_componente_curricular_lst.php:25-145`
- Montar na tela da turma a lista de componentes da escola e série, com a diferenciação por turma condicionada ao parâmetro institucional. 🟢 `ieducar/intranet/educar_turma_cad.php:901-985`
- Consultar a existência de dispensas e de dependências antes das exclusões de componentes da série. 🟢 `ComponentesSerieController.php:297-357`
- Mapear a migração de disciplinas antigas para novas por série e ano na tabela de migração. 🟢 `app/Models/MigratedDiscipline.php`

---

## Regras de Negócio

### Classificação e padronização

- A base curricular do componente admite os valores 1 (base nacional comum), 2 (base diversificada), 3 (base profissional) e 4 (Art. 33, ensino religioso), com o padrão na base nacional comum. 🟢 `ieducar/modules/ComponenteCurricular/Model/TipoBase.php:5-20`
- O código Educacenso do componente vem da tabela oficial do INEP com os códigos numéricos consolidados no enumerador, e a entrada vazia é admitida para o parâmetro legado. 🟢 `Model/CodigoEducacenso.php:9-37`
- O nome do componente tem de cinco a duzentos caracteres e a abreviação de dois a quinze na validação do modelo. 🟢 `Model/Componente.php:60-61`
- A área de conhecimento tem nome de cinco a sessenta caracteres e a seção de até cinquenta. 🟢 `ieducar/modules/AreaConhecimento/Model/Area.php:17-24`
- A área marcada como agrupadora de descritores recebe o sufixo "(agrupador)" nas seleções. 🟢 `EditController.php (Componente):128-136`
- O ordenamento do componente e da área usa o valor sentinela 99999 para ordem não informada. 🟢 `Model/Componente.php:13` e `EditController.php (Componente):211-217` e `EditController.php (Área):129-135`
- A cor do componente padrão é branco, com a paleta da configuração `colors.components` no campo visual. 🟢 `EditController.php (Componente):179-186`

### Matriz por série

- A matriz do componente pela série tem carga horária mínima de um quando a série está vinculada. 🟢 `Model/AnoEscolar.php:48-53`
- O tipo de nota da matriz admite 1 (numérica) e 2 (conceitual), com a entrada do valor zero convertida em nulo. 🟢 `Model/TipoNotaComponenteSerie.php:3-20` e `ComponentesSerieController.php:518-521`
- Os anos letivos da matriz são um arranjo de inteiros gravado como arranjo PostgreSQL de smallint, com o diff de inseridos e removidos calculado antes da gravação. 🟢 `ComponentesSerieController.php:482-495` e `:523-525`
- A horas por falta da matriz alimenta o débito de horas por ausência, e a entrada vazia é gravada nula. 🟢 `ComponentesSerieController.php:25` e `:504-516`
- A habilitação do componente pela escola e série na tabela `pmieducar.escola_serie_disciplina` é replictada na adição dos componentes, com a união dos arranjos de anos letivos. 🟢 `ComponentesSerieController.php:152-183`

### Componentes por turma

- O vínculo por turma tem chave composta de componente e turma, com a carga horária própria que sobrescreve a da matriz quando não usa o padrão do componente. 🟢 `Model/TurmaDataMapper.php:21-35` e `app/Http/Controllers/SchoolClassController.php:314-316`
- A diferenciação de componentes por turma é habilitada somente quando o parâmetro institucional `componente_curricular_turma` está ligado. 🟢 `ieducar/intranet/educar_turma_cad.php:936-948`
- O docente vinculado e as etapas específicas são bandeiras binárias na gravação, com as etapas utilizadas preenchidas somente com etapa específica. 🟢 `SchoolClassController.php:318-331`
- A desvinculação de componente da turma com notas, faltas ou pareceres lançados no iDiário é rejeitada com a lista de erros. 🟢 `TurmaDataMapper.php:108-121`
- A desvinculação do componente na série é travada por turmas vinculadas, pelos lançamentos do diário legado e pelos lançamentos do iDiário, por componente e por ano letivo removido. 🟢 `ComponentesSerieController.php:55-126`

### Exclusões e proteções

- A exclusão da área de conhecimento é travada quando há componentes vinculados. 🟢 `ieducar/modules/AreaConhecimento/Views/EditController.php:169-181`
- A exclusão do componente em si não é oferecida no controlador de edição do legado. 🟢 `EditController.php (Componente):15`
- A exclusão de todos os componentes da série apaga a matriz, as habilitações das escolas e os componentes das turmas do ano aberto, sem a trava de lançamentos nesta rota. 🔴 `ComponentesSerieController.php:257-295`
- O caminho de gravação da turma da interface nova apaga os vínculos antes da reconstituição, desligando a trava do iDiário nesta rota. 🔴 `SchoolClassController.php:307-337`

### Consistência estrutural

- A tabela `modules.componente_curricular` não tem carimbo de data e hora, e a chave primária é simples e não incremental nas tabelas de vínculo. 🟢 `app/Models/LegacyDiscipline.php:16-20` e `LegacyDisciplineAcademicYear.php:49-55`
- A gravação da matriz por série na tela do módulo não corre validação de deleção de série com lançamentos, e o caminho da API valida. 🔴 `AnoController.php:210-255`
- Não existe, no legado, validação executável da soma de carga horária mínima da LDB na matriz da série. 🔴 (predilecida no modelo novo)
- Não existe trilha de auditoria além dos carimbos de data e hora dos pivôs. 🔴
- O botão "Novo" da listagem checa o processo 580, enquanto o formulário usa o processo 946. 🟡 `educar_componente_curricular_lst.php:141-144` e `:152-156`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve manter áreas do conhecimento com nome, seção, ordenamento e agrupador de descritores. | Must | Dado uma área criada como agrupadora, quando listada nas seleções, então recebe o sufixo "(agrupador)". |
| RC-02 | O sistema deve recusar a exclusão de área com componentes vinculados. | Must | Dado uma área com componentes, quando excluída, então a recusa citar os vínculos. |
| RC-03 | O sistema deve manter componentes com nome, abreviação, base, área, código INEP, ordenamento, bandeira de progressão e cor. | Must | Dado um componente do tipo base nacional, quando gravado, então os sete atributos ficam persistidos. |
| RC-04 | O sistema deve validar o nome de cinco a duzentos caracteres e a abreviação de dois a quinze. | Must | Dado um nome de dois caracteres, quando gravado, então a gravação é recusada. |
| RC-05 | O sistema deve manter a matriz de carga horária do componente pelas séries com sincronização por diferença. | Must | Dado duas séries marcadas e uma desmarcada, quando gravado, então a desmarcada sai e as demais ficam. |
| RC-06 | O sistema deve manter a matriz da série com carga, horas por falta, tipo de nota e anos letivos, com o diff de anos letivos. | Must | Dado um ano letivo removido da matriz, quando gravado, então o diff é validado contra lançamentos antes da remoção. |
| RC-07 | O sistema deve travar a desvinculação de componente com lançamentos no diário eletrônico e no iDiário, por turma e por série. | Must | Dado um componente com notas lançadas, quando desvinculado, então a operação é recusada com a lista. |
| RC-08 | O sistema deve travar a desvinculação na série quando há turmas vinculadas ao componente. | Must | Dado um componente com três turmas, quando removido da série, então a recusa cita a turma vinculada. |
| RC-09 | O sistema deve replicar os componentes adicionados na série para as escolas da série na habilitação escola e série. | Should | Dado um componente adicionado na série, quando replicado, então as escolas recebem o vínculo com os anos letivos unidos. |
| RC-10 | O sistema deve manter componentes por turma com carga própria, docente vinculado, etapas específicas e etapas utilizadas. | Must | Dado uma turma com componente e etapa específica, quando gravada, então a carga e as etapas ficam referidas. |
| RC-11 | O sistema deve habilitar a diferenciação por turma somente com o parâmetro institucional ligado. | Should | Dado o parâmetro desligado, quando a tela da turma é aberta, então a caixa de diferenciação vem desabilitada. |
| RC-12 | O sistema deve consultar a existência de dispensas e de dependências antes das remoções de componentes da série. | Must | Dado uma dispensa ativa, quando a remoção é tentada, então a resposta citar a matrícula do aluno. |
| RC-13 | O sistema deve validar a soma da carga horária da matriz pelo mínimo da LDB na homologação da matriz. | Should | Dado uma matriz com 780 horas, quando homologada, então o alerta ou o bloqueio é disparado. 🔴 |
| RC-14 | O sistema deve manter o mapeamento de migração de disciplinas antigas para novas por série e ano. | Should | Dado uma disciplina unificada, quando consultada, então o mapa devolve a disciplina nova. |
| RC-15 | O sistema deve numerar as operações de exclusão em massa de componentes da série pelas mesmas travas da gravação. | Must | Dado a exclusão em massa com lançamentos, quando executada, então a exclusão é recusada. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | Consulta do componente por nome interpola a entrada na query SQL. | `Model/ComponenteDataMapper.php:104-111` | 🟢 |
| Segurança | O arranjo de anos letivos é montado por interpolação de texto no `DB::raw`. | `ComponentesSerieController.php:523-525` e `:550` | 🟢 |
| Integridade | O apagamento em massa dos vínculos da turma não consulta o iDiário e desliga a trava. | `SchoolClassController.php:307` e `:341-346` | 🔴 |
| Integridade | Os pivôs não incrementais dependem da chave composta, e a leitura usa `array_to_json` por causa da chave. | `ComponentesSerieController.php:481-487` | 🟢 |
| Performance | A listagem é paginada em vinte com ordenação por nome. | `educar_componente_curricular_lst.php:89-117` | 🟢 |
| Usabilidade | A matriz da série admite carga vazia e gravada nula no caminho de atualização, e a de inserção exige numérica. | `ComponentesSerieController.php:512-521` e `:541-543` | 🟢 |
| Observabilidade | Sem trilha de auditoria além dos carimbos de data e hora. | ausência de evidência | 🔴 |
| Multi-tenancy | As entidades são por instituição e o modelo novo troca `instituicao_id` por `tenant_id`. | `_reversa_sdd/ComponenteCurricular/legacy-mapping.md:32-40` | 🟡 |
| Conformidade | A soma de 800 horas da LDB não é validada em código executável no legado. | `_reversa_sdd/ComponenteCurricular/legacy-mapping.md:98-101` | 🔴 |

---

## Critérios de Aceitação

```gherkin
Dado uma área com componentes vinculados
Quando a exclusão é tentada
Então a exclusão é recusada citando os vínculos

Dado um componente com nome de dois caracteres
Quando gravado
Então a gravação é recusada com a mensagem de tamanho

Dado um componente com turmas vinculadas e notas lançadas
Quando removido da turma ou da série
Então a remoção é recusada com a lista de erros

Dado um ano letivo removido da matriz da série
Quando gravado
Então a remoção é travada quando há lançamentos no ano removido

Dado uma matriz da série homologada com menos de 800 horas
Quando homologada
Então o alerta ou o bloqueio é disparado 🔴

Dado a gravação da turma pela interface nova com componente desvinculado
Quando os vínculos são reconstituídos
Então a trava de lançamentos é avaliada, e não desligada 🔴

Dado o usuário sem o processo 946
Quando a edição do componente é aberta
Então o acesso é negado
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Áreas, componentes e matriz por série | Must | Base do currículo |
| Componentes por turma com carga e etapas | Must | Execução no diário |
| Trava de desvinculação com lançamentos | Must | Integridade dos diários |
| Habilitação escola e série com replicação | Must | Filtro de oferta |
| Consulta de dispensas e dependências | Must | Segurança da remoção |
| Agregação de anos letivos com diff | Must | Coerência por ano |
| Validação da soma das 800 horas | Should | Conformidade da LDB ausente no legado 🔴 |
| Trava também no caminho de exclusão em massa | Must | Falha de integridade do legado 🔴 |
| Trava também no caminho da interface nova da turma | Must | Falha de integridade do legado 🔴 |
| Mapeamento de migração de disciplinas | Should | Unificação e correção de dados |
| Cor visual do componente | Could | Apresentação em gráficos |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/ComponenteCurricular/Views/EditController.php` | Cadastro do componente (processo 946) | 🟢 |
| `ieducar/modules/ComponenteCurricular/Views/AnoController.php` | Matriz de carga por série | 🟢 |
| `ieducar/modules/ComponenteCurricular/Views/IndexController.php` / `ViewController.php` | Listagem e detalhe do módulo | 🟡 |
| `ieducar/modules/ComponenteCurricular/Model/Componente.php` | Entidade e validações | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/ComponenteDataMapper.php` | Persistência e findByName | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/AnoEscolar.php` / `AnoEscolarDataMapper.php` | Matriz por série | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/Turma.php` / `TurmaDataMapper.php` | Componentes por turma e bulkUpdate | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/TipoBase.php` | Enum da base curricular | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/TipoNotaComponenteSerie.php` | Enum do tipo de nota | 🟢 |
| `ieducar/modules/ComponenteCurricular/Model/CodigoEducacenso.php` | Tabela do INEP | 🟢 |
| `ieducar/modules/Api/Views/ComponentesSerieController.php` | API da matriz da série | 🟢 |
| `ieducar/modules/AreaConhecimento/Views/EditController.php` | Cadastro e exclusão de área | 🟢 |
| `ieducar/modules/AreaConhecimento/Model/Area.php` | Entidade e validações | 🟢 |
| `ieducar/intranet/educar_componente_curricular_lst.php` | Listagem pública | 🟢 |
| `ieducar/intranet/educar_turma_cad.php` | Tela da turma e diferenciação | 🟢 |
| `app/Http/Controllers/SchoolClassController.php` | Gravação da turma e atualização em massa | 🟢 |
| `app/Models/LegacyDiscipline.php` | `modules.componente_curricular` | 🟢 |
| `app/Models/LegacyDisciplineAcademicYear.php` | `modules.componente_curricular_ano_escolar` | 🟢 |
| `app/Models/LegacyDisciplineSchoolClass.php` | `modules.componente_curricular_turma` | 🟢 |
| `app/Models/LegacyKnowledgeArea.php` | `modules.area_conhecimento` | 🟢 |
| `app/Models/LegacySchoolGradeDiscipline.php` | `pmieducar.escola_serie_disciplina` | 🟢 |
| `app/Models/MigratedDiscipline.php` | Mapa de migração de disciplinas | 🟢 |
| `app/Services/CheckPostedDataService.php` | Verificação de lançamentos | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/Acessores.php` | Consumo pela avaliação | 🟢 |
