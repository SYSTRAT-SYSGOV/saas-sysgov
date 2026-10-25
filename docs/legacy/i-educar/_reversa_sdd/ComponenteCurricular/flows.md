# ComponenteCurricular (i-Educar legado), Fluxos

> Fluxos da unit de matriz curricular que completam os fluxos do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de cadastro do componente curricular

**Gatilho:** o operador grava um componente novo ou existente pela tela do módulo.

1. O POST é recolhido pelas chaves do mapa do formulário, ignorando os demais campos. 🟢 `ieducar/modules/ComponenteCurricular/Views/EditController.php:205-221`
2. O ordenamento vazio é convertido para a sentinela 99999, e a bandeira de progressão é derivada da presença no POST. 🟢 `EditController.php:211-217` e `:223`
3. A identidade do POST decide entre a carga da entidade existente e a criação de uma instância nova. 🟢 `EditController.php:226-235`
4. A gravação passa pelos validadores do modelo, e a exceção devolve a mensagem genérica de preenchimento. 🟢 `EditController.php:237-245` e `Componente.php:45-66`
5. No sucesso, o redirecionamento vai para a listagem legada. 🟢 `EditController.php:196-203`

## 2. Fluxo da matriz de carga por série (tela do módulo)

**Gatilho:** o operador grava a matriz do componente pela tela `ano` com `cid`.

1. As matrizes persistentes do componente são carregadas e indexadas pela série. 🟢 `AnoController.php:107-115`
2. As séries são agrupadas por curso, e cada série recebe caixa de seleção e campo de carga. 🟢 `AnoController.php:79-102` e `:176-205`
3. As chaves marcadas na requisição viram candidatos de inserção, e a diferença contra as persistentes separa as exclusões; a interseção recebe a marcação de registro antigo. 🟢 `AnoController.php:219-243`
4. A gravação de cada entidade valida a carga mínima de um, e a exceção devolve a mensagem genérica. 🟢 `AnoController.php:245-251` e `Model/AnoEscolar.php:48-53`

## 3. Fluxo de gravação da matriz da série pela API

**Gatilho:** a tela da série envia `atualiza-componentes-serie`.

1. Os componentes são normalizados com carga, horas por falta vazia convertida em nula, tipo de nota e arranjo de anos letivos. 🟢 `ComponentesSerieController.php:16-28`
2. O diff de anos letivos é calculado por componente, separando inseridos e removidos contra a matriz persistida. 🟢 `ComponentesSerieController.php:448-495`
3. Para cada componente marcado para remover, três portas validam: vínculos na matriz da turma, lançamentos do diário legado e lançamentos do iDiário na série. 🟢 `ComponentesSerieController.php:50-126`
4. Para cada ano letivo removido de componente mantido, as duas portas de lançamento são reavaliadas por série e ano. 🟢 `ComponentesSerieController.php:94-117`
5. Com erros, a exceção devolve a lista combinada; sem erros, os componentes mantidos são atualizados e os novos inseridos. 🟢 `ComponentesSerieController.php:119-125` e `:497-553`
6. A gravação converte o arranjo de anos em texto interpolado como arranjo de smallint. 🔴 `:523-525` e `:550`

## 4. Fluxo de sincronização dos componentes da turma (interface nova)

**Gatilho:** a gravação da turma em `SchoolClassController::store`.

1. Fora da turma multissérie, os vínculos persistentes da turma são apagados em massa pelo modelo do pivô. 🔴 `SchoolClassController.php:307` e `:341-346`
2. Cada componente da requisição recebe carga própria nula quando usa o padrão do componente, docente binário, etapa específica binária e etapas utilizadas somente com etapa específica. 🟢 `SchoolClassController.php:312-333`
3. A atualização em massa recarrega as matrizes da turma, agora vazias, e reconstrói todos como inserção. 🔴 `TurmaDataMapper.php:72-103`
4. As exclusões remanescentes do diff passam pela trava do iDiário, mas o conjunto é vazio nesta rota. 🔴 `TurmaDataMapper.php:105-121`
5. Na turma multissérie, apenas o apagamento em massa acontece, sem reconstituição. 🔴 `SchoolClassController.php:85-109`

## 5. Fluxo da lista de componentes na tela legada da turma

**Gatilho:** a tela da turma com série e escola definidas.

1. A existência de componentes na turma decide a exibição junto com o estado multissérie. 🟢 `ieducar/intranet/educar_turma_cad.php:890-900`
2. A lista da habilitação escola e série alimenta a grade com nome, abreviação, carga, padrão do componente, etapas e docente. 🟢 `educar_turma_cad.php:913-985`
3. A diferenciação por turma é habilitada somente com o parâmetro institucional ligado. 🟢 `educar_turma_cad.php:936-948`
4. As marcações persistentes por turma preenchem as caixas e os campos da grade. 🟢 `educar_turma_cad.php:925-933`

## 6. Fluxo de replicação nas escolas da série

**Gatilho:** a adição de componentes na série com replicação pedida.

1. As escolas ativas da série são resolvidas pela habilitação existente. 🟢 `ComponentesSerieController.php:190-197`
2. Para cada escola e componente, a habilitação é consultada: ausente, é criada; presente, os arranjos de anos letivos são unidos. 🟢 `ComponentesSerieController.php:152-183`

## 7. Fluxo de remoção e de exclusão em massa

**Gatilho:** a remoção de um componente da série ou a exclusão de todos.

1. Na remoção única, a mesma validação de três portas é executada antes da cascata: matriz, habilitações das escolas e componentes das turmas do último ano aberto. 🟢 `ComponentesSerieController.php:211-255` e `:425-446`
2. Na exclusão em massa, a matriz da série é apagada, e as habilitações e os componentes das turmas seguem a cascata **sem** a validação. 🔴 `ComponentesSerieController.php:257-295`
3. Antes das remoções, as consultas de dispensas e dependências informam matrícula, ano e aluno afetados. 🟢 `ComponentesSerieController.php:297-357`
4. A exclusão da área de conhecimento é travada com componentes vinculados. 🟢 `ieducar/modules/AreaConhecimento/Views/EditController.php:169-181`

## 8. Fluxo de consumo pelos diários de avaliação

**Gatilho:** a avaliação carrega os componentes da turma.

1. O serviço de boletim instancia o mesmo `TurmaDataMapper` para ler os componentes e cargas da turma. 🟢 `ieducar/modules/Avaliacao/Service/Boletim/Acessores.php:268-282`
2. O `App_Model_IedFinder::getComponentesTurma` consolida matriz, habilitação e vínculo por turma para o consumo avaliativo. 🟢 `ieducar/lib/App/Model/IedFinder.php:594-602` e `:978`

## 9. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo. 🔴

- Homologação da matriz com a validação da soma de carga horária mínima da LDB. 🔴
- Trava de integridade aplicada em todos os caminhos de exclusão, inclusive em massa e na interface nova da turma. 🔴
- Auditoria das trocas de matriz por componente e por série. 🔴
- Sincronização automática da matriz com os códigos INEP vigentes do Educacenso. 🔴
