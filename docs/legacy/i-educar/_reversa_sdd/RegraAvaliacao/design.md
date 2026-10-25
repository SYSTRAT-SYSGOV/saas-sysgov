# RegraAvaliacao (i-Educar legado), Design

> Como o subsistema de configuração de regras de avaliação está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Papel | Fonte |
|----------|-------|-------|
| `RegraAvaliacao_Model_Regra` | Entidade mestre da regra, com 35 campos de configuração | 🟢 `ieducar/modules/RegraAvaliacao/Model/Regra.php:3-41` |
| `RegraAvaliacao_Model_RegraDataMapper` | Persistência da regra e finders de fórmulas e tabelas | 🟢 `RegraDataMapper.php` |
| `RegraAvaliacao_Model_RegraRecuperacao` | Regra de recuperação por etapas específicas | 🟢 `RegraRecuperacao.php` |
| `RegraAvaliacao_Model_RegraRecuperacaoDataMapper` | Persistência da regra de recuperação | 🟢 `RegraRecuperacaoDataMapper.php` |
| `RegraAvaliacao_Model_SerieAno` | Vínculo regra, regra diferenciada, ano letivo e série | 🟢 `SerieAno.php` |
| `RegraAvaliacao_Model_Nota_TipoValor` | Enum do sistema de nota | 🟢 `Nota/TipoValor.php` |
| `RegraAvaliacao_Model_TipoProgressao` | Enum do regime de progressão | 🟢 `TipoProgressao.php` |
| `RegraAvaliacao_Model_TipoParecerDescritivo` | Enum do parecer descritivo | 🟢 `TipoParecerDescritivo.php` |
| `RegraAvaliacao_Model_TipoPresenca` | Enum do tipo de presença | 🟢 `TipoPresenca.php` |
| `RegraAvaliacao_Model_TipoRecuperacaoParalela` | Enum da recuperação paralela | 🟢 `TipoRecuperacaoParalela.php` |
| `RegraAvaliacao_Validators_RegraAvaliacaoValidator` | Validação de coerência nota máxima, presença e faltas | 🟢 `Validators/RegraAvaliacaoValidator.php` |
| `FormulaMedia_Model_Formula` | Fórmula de média executável | 🟢 `ieducar/modules/FormulaMedia/Model/Formula.php` |
| `TabelaArredondamento_Model_Tabela` | Tabela de arredondamento numérica ou conceitual | 🟢 `ieducar/modules/TabelaArredondamento/Model/Tabela.php` |

### Domínio

O domínio desta unit é a **configuração pedagógica da avaliação**: a rede define regras parametrizadas por série e por ano e as aplica a todas as matrículas. A regra é a fronteira de decisão entre a secretaria que configura e o motor que apura. A resolução da regra aplicável (por série, por ano e com a regra diferenciada) é de responsabilidade do motor de apuração, e é capturada na unit `Avaliacao`. 🟢 `Regra.php:58-116` e `_reversa_sdd/Avaliacao/design.md`

### Endpoints HTTP legados

| Rota | Controlador | Uso |
|------|-------------|-----|
| `module/RegraAvaliacao/index` | `RegraAvaliacao_Views_IndexController` | Listagem com filtro por ano e por série 🟢 `IndexController.php:1-99` |
| `module/RegraAvaliacao/edit` | `RegraAvaliacao_Views_EditController` | Cadastro, edição e cópia (`&copy=true`) 🟢 `EditController.php:344-360` |
| `module/RegraAvaliacao/view` | `RegraAvaliacao_Views_ViewController` | Detalhe com enlaces à tabela e às fórmulas 🟢 `ViewController.php:1-84` |

Identificador de processo: 947, nível de acesso INSTITUCIONAL, em todas as telas. 🟢 `EditController.php` e `IndexController.php:12` e `ViewController.php:18`

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `EditController::_save()` | Gravação transacional da regra e das recuperações | 🟢 `EditController.php:959-1129` |
| `EditController::isPresenceTypeCompatible()` | Compatibilidade de presença com a regra inclusiva | 🟢 `EditController.php:1136-1149` |
| `EditController::isPontosValid()` | Padrão da configuração de pontos | 🟢 `EditController.php:1154-1156` |
| `EditController::getDefaultValidatorCollection()` via entidade | Coleta dos validadores do domínio | 🟢 `Regra.php:138-247` |
| `Regra::getRegraRecuperacaoByEtapa()` | Recuperação aplicável à etapa | 🟢 `Regra.php:264-273` |
| `RegraDataMapper::findFormulaMediaFinal()` | Fórmulas do tipo média final | 🟢 `RegraDataMapper.php:124-129` |
| `RegraDataMapper::findFormulaMediaRecuperacao()` | Fórmulas do tipo média de recuperação | 🟢 `RegraDataMapper.php:136-141` |
| `RegraDataMapper::findTabelaArredondamento()` | Tabelas da instituição da regra | 🟢 `RegraDataMapper.php:161-168` |
| `IndexController::getEntries()` | Consulta Eloquent da listagem, com filtros | 🟢 `IndexController.php:69-98` |

---

## Fluxo Principal

**Cadastrar ou editar uma regra de avaliação.**

1. O usuário acessa `module/RegraAvaliacao/edit`, com ou sem identificador. 🟢 `EditController.php:344-360`
2. O controlador declara o processo 947 e o nível institucional, e registra o recurso JavaScript da tela. 🟢 `EditController.php:334-342`
3. O formulário é montado com os campos de instituição, nome, sistema de nota, tabelas de arredondamento, progressão, médias, fórmulas, presença, parecer, recuperação paralela, dependências e pontos. 🟢 `EditController.php:354-958`
4. Na gravação, o tipo de nota é conferido: tipo 3 mantém a tabela numérica informada e anula a conceitual; demais tipos anulam a conceitual. 🟢 `EditController.php:963-967`
5. Os campos de caixa de seleção ausentes são fixados em zero. 🟢 `EditController.php:980-1013`
6. A compatibilidade de presença com a regra diferenciada e o padrão dos pontos são conferidos, e depois o validador do domínio. 🟢 `EditController.php:1021-1039`
7. As linhas de recuperação são preparadas: existentes são atualizadas, marcadas com exclusão são removidas, novas são criadas, e inválidas abortam a gravação. 🟢 `EditController.php:1041-1080`
8. A regra e as recuperações são gravadas em transação, com rollback e mensagem consolidada na falha. 🟢 `EditController.php:1081-1122`
9. A tela de edição devolve sucesso, e o usuário volta para a listagem ou para o detalhe. 🟡

---

## Fluxos Alternativos

- **Edição de regra existente:** com `id > 0` e sem `copy`, a entidade é localizada pelo data mapper e os campos são preenchidos. 🟢 `EditController.php:975-978`
- **Cópia de regra:** com `copy=true`, o formulário é aberto como cadastro (`tipoacao = "Novo"`), com o título "Cadastrar", a partir do botão da tela de detalhe, e na gravação as recuperações são recriadas para o identificador da regra de destino além das linhas recriadas para o identificador da regra de origem. 🟢 `EditController.php:1094-1104` e `:1124-1126` e `ViewController.php:54`
- **Exclusão de recuperação marcada:** a linha marcada com identificador numérico é excluída na gravação, em vez de uma operação imediata. 🟢 `EditController.php:1071-1074`
- **Recusa por validação:** qualquer recusa de compatibilidade, de pontos ou do validador do domínio devolve a mensagem e interrompe a gravação antes da transação. 🟢 `EditController.php:1021-1039`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `ieducar/modules/FormulaMedia/` | Fórmulas de média final e recuperação referenciadas pela regra | Saída | 🟢 `Regra.php:92-103` |
| `ieducar/modules/TabelaArredondamento/` | Tabelas numérica e conceitual referenciadas pela regra | Saída | 🟢 `Regra.php:64-75` |
| `ieducar/modules/Avaliacao/` | Consumo da regra pelo motor de apuração | Entrada | 🟢 `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php` |
| `app/Models/LegacyEvaluationRule.php` e correlatos | Camada Eloquent sobre as mesmas tabelas | Ambos | 🟢 `app/Models/` |
| `App_Model_IedFinder::getInstituicoes()` | Lista de instituições para o campo instituição | Saída | 🟢 `Regra.php:166` e `EditController.php:363` |
| `LegacyGrade::query()->active()` | Lista de séries ativas para o filtro da listagem | Saída | 🟢 `IndexController.php:37-49` |
| Banco de dados: `modules.regra_avaliacao`, `modules.regra_avaliacao_serie_ano`, `modules.regra_avaliacao_recuperacao`, `modules.tabela_arredondamento`, `modules.tabela_arredondamento_valor`, `modules.formula_media` | Persistência | Saída | 🟢 `RegraDataMapper.php` e `app/Models/LegacyEvaluationRule.php` |

As units `FormulaMedia` (15) e `TabelaArredondamento` (19) do plano capturam os detalhes desses módulos de apoio. 🟢 `.reversa/STATUS.md`, seção 6

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| A fórmula de média é obrigatória por padrão, com exceção única para o tipo de nota nenhum, que neutraliza a média também. | `Regra.php:168-180` | 🟢 |
| O tipo de nota numérica e conceitual (3) expressa a conceitual pela tabela conceitual, e o formulário anula a tabela conceitual quando o tipo não é 3. | `EditController.php:963-967` | 🟢 |
| As caixas de seleção ausentes são fixadas em zero na gravação, pois o HTML não envia caixas não marcadas. | `EditController.php:980-1013` | 🟢 |
| O modelo legado é duplo: a entidade `CoreExt` valida contra escolhas montadas na hora (instituições, fórmulas, tabelas), e a validação aceita ids existentes como catálogo. | `Regra.php:138-247` | 🟢 |
| A regra diferenciada é referenciada pela própria regra, com um enlace simétrico, e exige a compatibilidade de apuração de frequência entre as duas. | `Regra.php:110-115` e `EditController.php:1021-1025` | 🟢 |
| A cópia recria as recuperações com o identificador da regra de origem, além das linhas gravadas para a nova regra. | `EditController.php:1094-1104` | 🟢 |
| A exclusão de recuperação é deferida à gravação, identificada por linha do formulário. | `EditController.php:1071-1078` | 🟢 |
| A compatibilidade de presença confere somente o tipo de presença da regra inclusiva contra o da regra diferenciada, e admite ausência de regra diferenciada. | `EditController.php:1136-1149` | 🟢 |
| A organização de valores da listagem expõe os modelos Eloquent diretamente, com os rótulos resolvidos pelos enumerados legados. | `IndexController.php:87-97` | 🟢 |

---

## Estado Interno

- A regra mantém 35 campos em `$_data`, com 12 deles declarados numéricos. 🟢 `Regra.php:5-56`
- As referências externas mantêm os valores padrão: tipo de nota 1, tipo de progressão 1, tipo de presença 1, parecer 0, recuperação paralela 0. 🟢 `Regra.php:58-116`
- As coleções de regras de recuperação e de vínculos de série e ano são mantidos por data mappers separados. 🟢 `Regra.php:118-121` e `RegraDataMapper.php:170-179`
- O controlador mantém o `_formMap` com a associação campo do formulário para campo da entidade. 🟡 `EditController.php`

---

## Observabilidade

- Não há log estruturado de gravação de regra. 🟡
- As falhas de gravação são devolvidas como mensagens na tela, com o texto do erro da exceção. 🟢 `EditController.php:1117-1119`
- Não há métricas nem trilha de auditoria das mudanças de regra. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Execução arbitrária de código | As fórmulas de média são executadas com `eval` sobre texto configurável, com tokens e operadores, o que permite a execução de código por quem configura a fórmula. | `ieducar/modules/FormulaMedia/Model/Formula.php:122-128` e `:19-30` | 🔴 |
| Duplicação na cópia | Na cópia, as recuperações são recriadas com o identificador da regra de origem, o que pode acumular regras de recuperação duplicadas na regra de origem. | `EditController.php:1094-1104` | 🟡 |
| Exclusão sem verificação de vínculo | Não há verificação localizada, por esta extração, de vínculos de série e de ano na exclusão da regra. | ausência de evidência no código lido | 🔴 |
| Sem trilha de auditoria | A edição sobrescreve os parâmetros sem registro de valor anterior, autor e instante. | ausência de evidência no código lido | 🔴 |
| Campos sem consumo localizado | Campos como `faltaMaximaGeral`, `faltaMinimaGeral`, `qtdMatriculasDependencia` e `disciplinasAglutinadas` têm consumo não localizado por esta extração, e o regime de pontos (`pontos`) precisa da confirmação pedagógica. | `Regra.php:18-32` | 🟡 |
| Conteúdo do catálogo de regras | A regra inclusiva e o regime de pontos têm semântica pedagógica a confirmar com a área pedagógica. | `Regra.php:26-40` | 🟡 |

---

## Consumo pelo motor de apuração

| Consumidor | Uso | Fonte |
|------------|-----|-------|
| `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php` | Acesso aos parâmetros da regra para a apuração | 🟢 `_reversa_sdd/Avaliacao/requirements.md` |
| `app/Models/LegacySchoolClass.php:648-661` | Resolução da regra aplicável à turma, com a regra diferenciada | 🟢 `_reversa_sdd/Avaliacao/requirements.md` |
| Cache de cinco minutos na leitura da regra | Aplicado pelo motor de apuração, não pela configuração | 🟢 `ieducar/modules/Avaliacao/Service/Boletim.php:3377-3386` |
