# RegraAvaliacao (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de configuração de regras de avaliação legado faz: manter as regras de avaliação da rede, os tipos de nota, de progressão e de presença, as fórmulas de média, as tabelas de arredondamento, as recuperações e o vínculo com as séries e os anos letivos. É a unidade de configuração que parametriza o motor de avaliação descrito na unit `Avaliacao`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema RegraAvaliacao do i-Educar mantém a **regra de avaliação** da rede de ensino: a entidade mestre que define como as notas, faltas, pareceres, médias, recuperações e progressões de cada estudante são apurados. O consumo dessas regras pelo motor de apuração é capturado na unit `Avaliacao`; esta unit captura a **manutenção** dessas regras: cadastro, edição, cópia, listagem e detalhamento. 🟢 `ieducar/modules/RegraAvaliacao/`

Problema que resolve: permitir que a rede configure, por série e por ano letivo, um conjunto de parâmetros pedagógicos coerentes com a LDB — nota numérica, conceitual ou numérica e conceitual, progressão continuada ou não, presença unificada ou por componente, parecer descritivo, médias de aprovação e de recuperação, fórmulas de cálculo e tabelas de arredondamento — e que o motor os aplique de forma determinística. 🟢 `ieducar/modules/RegraAvaliacao/Views/EditController.php` e `_reversa_sdd/domain.md`

Observação estrutural: a unit é dupla camada. A camada de aplicação legada usa o framework `CoreExt` (entidades, data mappers, validadores e controladores de formulário), sobre as tabelas `modules.regra_avaliacao`, `modules.regra_avaliacao_serie_ano`, `modules.regra_avaliacao_recuperacao`, `modules.tabela_arredondamento`, `modules.tabela_arredondamento_valor` e `modules.formula_media`. A camada moderna usa modelos Eloquent equivalentes sobre as mesmas tabelas. 🔴 `ieducar/modules/RegraAvaliacao/Model/` e `app/Models/LegacyEvaluationRule.php`

O subsistema depende de dois módulos de apoio que possuem units próprias no plano: `FormulaMedia` (unit 15) e `TabelaArredondamento` (unit 19). 🟢 `ieducar/modules/FormulaMedia/` e `ieducar/modules/TabelaArredondamento/`

---

## Responsabilidades

- Manter a entidade da regra de avaliação, com 35 campos de configuração declarados no modelo legado. 🟢 `ieducar/modules/RegraAvaliacao/Model/Regra.php:5-41`
- Declarar os campos numéricos da regra para a validação de tipo. 🟢 `Regra.php:43-56`
- Referenciar as entidades externas da regra: tipo de nota, tabelas de arredondamento numérica e conceitual, tipo de progressão, parecer descritivo, tipo de presença, fórmula de média, fórmula de recuperação, tipo de recuperação paralela e regra diferenciada. 🟢 `Regra.php:58-116`
- Persistir a regra de avaliação pelo data mapper legado, com os finders de fórmulas finais, fórmulas de recuperação e tabelas de arredondamento da instituição. 🟢 `ieducar/modules/RegraAvaliacao/Model/RegraDataMapper.php:124-168`
- Manter as regras de recuperação por etapas específicas, com descrição, etapas recuperadas separadas por `;`, substituição da menor nota, média de corte e nota máxima. 🟢 `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacao.php` e `app/Models/LegacyRemedialRule.php:22-29` e `:31-34`
- Obter a regra de recuperação aplicável a uma etapa, dentre as etapas recuperadas. 🟢 `Regra.php:264-273`
- Determinar a nota máxima da recuperação, que é a nota máxima geral exceto quando a recuperação é por etapas específicas. 🟢 `Regra.php:281-290`
- Vincular a regra à série e ao ano letivo, com a regra padrão e a regra diferenciada. 🟢 `ieducar/modules/RegraAvaliacao/Model/SerieAno.php` e `app/Models/LegacyEvaluationRuleGradeYear.php:10-24`
- Expor os valores dos enumerados do domínio: tipo de nota, tipo de progressão, tipo de parecer descritivo, tipo de presença e tipo de recuperação paralela. 🟢 `Regra.php` e `ieducar/modules/RegraAvaliacao/Model/TipoValor.php`, `TipoProgressao.php`, `TipoParecerDescritivo.php`, `TipoPresenca.php`, `TipoRecuperacaoParalela.php`
- Validar a regra no cadastro: nome, média, porcentagem de presença, média de recuperação, fórmulas e tabelas de arredondamento coerentes com o sistema de nota. 🟢 `Regra.php:138-247` e `ieducar/modules/RegraAvaliacao/Validators/RegraAvaliacaoValidator.php:1-40`
- Renderizar o formulário de cadastro e edição da regra, com os campos de instituição, nome, sistema de nota, progressão, presença, parecer, médias, fórmulas, tabelas, pontos, dependências e recuperações. 🟢 `ieducar/modules/RegraAvaliacao/Views/EditController.php:344-384`
- Gravar a regra e as regras de recuperação em transação, com rollback e mensagem consolidada de erro. 🟢 `EditController.php:1081-1122`
- Fixar em zero os sete campos de caixa de seleção ausentes da requisição. 🟢 `EditController.php:980-1013`
- Recusar a gravação quando a regra inclusiva tem apuração de frequência incompatível com a regra diferenciada. 🟢 `EditController.php:1021-1025` e `:1136-1149`
- Recusar a gravação quando a configuração de pontos não casa com o padrão `^(|\d+(,\d+)*)$`. 🟢 `EditController.php:1027-1031` e `:1154-1156`
- Copiar a regra, recriando as regras de recuperação para o identificador da regra de origem. 🟢 `EditController.php:1094-1104`
- Listar as regras de avaliação, com filtro por ano letivo e por série, exibindo as fórmulas de média e de recuperação. 🟢 `ieducar/modules/RegraAvaliacao/Views/IndexController.php:69-98`
- Detalhar a regra, com enlaces para a tabela de arredondamento e para as fórmulas. 🟢 `ieducar/modules/RegraAvaliacao/Views/ViewController.php:23-43` e `:57-83`
- Oferecer o botão de cópia a partir da tela de detalhe. 🟢 `ViewController.php:54`
- Expor a regra ao motor de apuração por meio dos modelos Eloquent. 🟢 `app/Models/LegacyEvaluationRule.php` e `app/Models/LegacyEvaluationRuleGradeYear.php` e `_reversa_sdd/Avaliacao/requirements.md`
- Consumir as fórmulas do módulo `FormulaMedia`, executadas com `eval` no cálculo da média. 🟢 `ieducar/modules/FormulaMedia/Model/Formula.php:122-128`

---

## Regras de Negócio

- A regra pertence a uma instituição, e o campo `instituicao` é validado contra as instituições da rede. 🟢 `Regra.php:182-185`
- O nome da regra é uma string de 5 a 50 caracteres. 🟢 `Regra.php:186-188`
- A fórmula de média é obrigatória, exceto quando o tipo de nota é `NENHUM`, em que só aceita `null` como conclusão. 🟢 `Regra.php:168-180` e `:189-192`
- A fórmula de recuperação é opcional. 🟢 `Regra.php:193-196`
- A regra diferenciada é opcional e referencia outra regra de avaliação. 🟢 `Regra.php:197-200` e `:110-115`
- O tipo de nota admite 4 valores: 0 nenhum, 1 numérica, 2 conceitual, 3 numérica e conceitual. 🟢 `ieducar/modules/RegraAvaliacao/Model/Nota/TipoValor.php:1-33`
- O tipo de progressão admite 5 valores: continuada, não continuada com média e presença, não continuada com somente a média, não continuada manual e não continuada manual por ciclo. 🟢 `ieducar/modules/RegraAvaliacao/Model/TipoProgressao.php:1-27`
- O parecer descritivo admite 7 valores: nenhum, por etapa com descritor, por etapa com componente, por etapa geral, anual com descritor, anual com componente e anual geral. 🟢 `ieducar/modules/RegraAvaliacao/Model/TipoParecerDescritivo.php:1-31`
- O tipo de presença admite 2 valores: geral unificada e por componente curricular. 🟢 `ieducar/modules/RegraAvaliacao/Model/TipoPresenca.php:1-18`
- A recuperação paralela admite 3 valores: 0 ausente, 1 por etapa e 2 por etapas específicas. 🟢 `ieducar/modules/RegraAvaliacao/Model/TipoRecuperacaoParalela.php:1-23`
- As tabelas de arredondamento, numérica e conceitual, são opcionais e aceitam somente tabelas da instituição da regra. 🟢 `RegraDataMapper.php:161-168`
- A tabela não correspondente ao sistema de nota é recusada com a mensagem: "A tabela de arredondamento selecionada não corresponde ao sistema de nota escolhido." 🟢 `Regra.php:207-216`
- A média mínima admite o intervalo de 1 a 10 quando a progressão é continuada, e de 0 a 10 quando não é, e é obrigatória exceto quando o tipo de nota é nenhum. 🟢 `Regra.php:223-229`
- A média de recuperação admite o intervalo de 1 a 14 quando a progressão é continuada, e de 0 a 14 quando não é. 🟢 `Regra.php:233-239`
- A porcentagem de presença admite o intervalo de 1 a 100. 🟢 `Regra.php:230-232`
- A média de recuperação paralela é uma string de 1 a 10 caracteres. 🟢 `Regra.php:243-245`
- O validador do domínio do controlador exige nota máxima maior que a mínima, presença entre 0 e 100 e falta máxima maior que a mínima. 🟢 `ieducar/modules/RegraAvaliacao/Validators/RegraAvaliacaoValidator.php:1-40`
- Quando o tipo de nota é 3, a tabela numérica é a informada no campo `tabelaArredondamentoNumero`, e a conceitual é anulada. 🟢 `EditController.php:963-967`
- Os sete campos de caixa de seleção ausentes na requisição são fixados em zero: `notaGeralPorEtapa`, `definirComponentePorEtapa`, `desconsiderarLancamentoFrequencia`, `reprovacaoAutomatica`, `aprovaMediaDisciplina`, `calculaMediaRecParalela` e `aprovarPelaFrequenciaAposExame`. 🟢 `EditController.php:980-1013`
- A gravação de regra e de recuperações ocorre em transação, com rollback e a mensagem: "Erro no preenchimento do formulário. {mensagem}". 🟢 `EditController.php:1081-1122`
- A regra inclusiva é recusada quando sua apuração de frequência difere da apuração da regra diferenciada, com a mensagem: "A regra inclusiva selecionada possuí apuração de frequência incompatível, verifique a configuração e tente novamente." 🟢 `EditController.php:1021-1025` e `:1136-1149`
- A ausência de regra diferenciada pula a verificação de compatibilidade de presença. 🟢 `EditController.php:1138-1140`
- A configuração de pontos é recusada quando não casa com o padrão `^(|\d+(,\d+)*)$`, com a mensagem: "A configuração de pontos possuí valor inválido, verifique a configuração e tente novamente." 🟢 `EditController.php:1027-1031` e `:1154-1156`
- As etapas recuperadas de uma regra de recuperação são uma string separada por `;`, onde cada valor é o número da etapa. 🟢 `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacao.php` e `app/Models/LegacyRemedialRule.php:31-34`
- A nota máxima da recuperação é a nota máxima geral da regra, exceto quando a recuperação é por etapas específicas, em que vem da regra de recuperação da etapa. 🟢 `Regra.php:281-290`
- O usuário marca a exclusão de uma regra de recuperação na própria linha do formulário, e a exclusão ocorre na gravação, em vez de uma operação imediata. 🟢 `EditController.php:1071-1078`
- As fórmulas de média são executadas com `eval` sobre texto vindo do cadastro de fórmulas, com tokens e operadores livremente aceitos: é execução de código arbitrário por configuração. 🔴 `ieducar/modules/FormulaMedia/Model/Formula.php:122-128`
- Renderizar a listagem de regras: o rótulo dos tipos e as fórmulas são resolvidos por relacionamento Eloquent, e as médias são formatadas. 🟢 `IndexController.php:87-97`
- Não existe, no legado, trilha de auditoria de alteração de regras: a edição sobrescreve os parâmetros sem registro de valor anterior, de autor e de instante. 🔴
- Não existe, no legado, proteção de exclusão de regra em uso por séries: o vínculo `regra_avaliacao_serie_ano` não é verificado no caminho de exclusão localizado por esta extração. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve manter a regra de avaliação da rede, com os parâmetros pedagógicos, de progressão e de presença, e as médias, fórmulas e tabelas de arredondamento. | Must | Dado uma regra, quando consultada, então todos os parâmetros são devolvidos, com o tipo de nota, a progressão, a presença, o parecer, as médias e as fórmulas. |
| RF-02 | O sistema deve vincular a regra a séries e anos letivos, com uma regra padrão e uma regra diferenciada por série. | Must | Dado uma regra vinculada a duas séries de anos distintos, quando o ano letivo for emendado, então cada série obtém a regra do seu ano. |
| RF-03 | O sistema deve cadastrar a regra com o formulário institucional de cadastro, com os campos pedagógicos e a regra diferenciada. | Must | Dado um cadastro válido, quando gravado, então a regra fica disponível para as séries. |
| RF-04 | O sistema deve recusar o cadastro de regra com o nome menor que 5 ou maior que 50 caracteres. | Must | Dado um nome com 4 caracteres, quando gravado, então a gravação é recusada. |
| RF-05 | O sistema deve admitir nota numérica, conceitual, numérica e conceitual, ou sem nota, conforme o tipo de nota da regra. | Must | Dado um tipo de nota conceitual, quando a regra for salva, então a régua conceitual fica associada. |
| RF-06 | O sistema deve recusar a fórmula de média quando o tipo de nota é nenhum, exceto quando o valor é nulo. | Must | Dado uma regra com tipo de nota nenhum e uma fórmula de média, quando gravada, então a gravação é recusada. |
| RF-07 | O sistema deve refusar a gravação quando a agregação de presença da regra inclusiva difere da regra diferenciada. | Must | Dado uma regra com presença geral e uma regra diferenciada com presença por componente, quando gravada, então a gravação é recusada. |
| RF-08 | O sistema deve gravar a regra e as regras de recuperação em transação, com rollback na falha. | Must | Dado um salvamento com recuperação inválida, quando a gravação falhar, então nenhuma alteração é persistida. |
| RF-09 | O sistema deve manter as regras de recuperação por etapas específicas, com descrição, etapas separadas por `;`, substituição da menor nota, média de corte e nota máxima. | Must | Dado uma regra com recuperação das etapas 1 e 2, quando gravada, então as etapas ficam armazenadas como "1;2". |
| RF-10 | O sistema deve excluir a regra de recuperação marcada com o campo de exclusão na própria linha do formulário. | Must | Dado uma recuperação marcada para exclusão com identificador numérico, quando a regra for gravada, então o registro é excluído. |
| RF-11 | O sistema deve copiar a regra, recriando as regras de recuperação para a regra de destino. | Must | Dado a cópia de uma regra com duas recuperações, quando gravada, então a nova regra tem as duas recuperações recriadas. |
| RF-12 | O sistema deve copiar a regra a partir da tela de detalhe, com o botão de cópia. | Should | Dado um clique no botão "Copiar regra", quando a tela de edição for aberta, então o formulário é aberto em modo de cadastro, com os dados da regra de origem. |
| RF-13 | O sistema deve listar as regras, com filtro por ano letivo e por série. | Must | Dado um filtro por ano, quando a listagem for gerada, então só as regras vinculadas àquele ano são exibidas. |
| RF-14 | O sistema deve listar as regras com o rótulo do sistema de nota, a progressão, as médias e as fórmulas. | Must | Dado uma listagem, quando gerada, então as colunas de nome, tipo de nota, progressão, médias e fórmulas são exibidas. |
| RF-15 | O sistema deve detalhar a regra, com todos os parâmetros de configuração. | Must | Dado o detalhe de uma regra, quando consultado, então os campos de nome, tipo de nota, tabela, progressão, médias, fórmulas, presença, parecer e recuperações são exibidos. |
| RF-16 | O sistema deve enlaçar a tabela de arredondamento e as fórmulas no detalhe da regra. | Should | Dado o detalhe de uma regra, quando a tabela de arredondamento for exibida, então há enlace à tela da tabela. |
| RF-17 | O sistema deve recusar a fórmula de médias com a nota máxima menor que a mínima, com a presença fora do intervalo de 0 a 100, e com a falta máxima menor que a mínima. | Must | Dado uma fórmula com nota máxima 5 e nota mínima 8, quando gravada, então a gravação é recusada, com mensagem. |
| RF-18 | O sistema deve admitir a média de recuperação de 1 a 14 quando a progressão é continuada, e de 0 a 14 quando não é. | Should | Dado uma regra de progressão continuada com mediaRecuperacao 12, quando gravada, então a gravação é aceita. |
| RF-19 | O sistema deve padronizar os campos de caixa de seleção ausentes como zero. | Must | Dado um formulário com as caixas desmascadas, quando gravado, então os sete campos faltantes são gravados com zero. |
| RF-20 | O sistema deve exigir a permissão do processo 947 e o nível Institucional para manter regras de avaliação. | Must | Dado um usuário sem a permissão, quando a tela de regras for acessada, então o acesso é negado. |
| RF-21 | O sistema deve executar as fórmulas do cálculo de médias em avaliador seguro, sem `eval`, com tokens livremente aceitos. | Should | Dado uma fórmula em texto e valores de entrada, quando executada, então o resultado é devolvido sem execução de código. 🔴 |
| RF-22 | O sistema deve validar a fórmula no cadastro, com a lista de tokens aceitas. | Should | Dado uma fórmula com um token desconhecido, quando validada, então é recusada, com a mensagem de erro. |
| RF-23 | O sistema deve registrar a trilha de alteração da regra, com autor, instante, valor anterior e novo valor. | Should | Dado uma edição de regra, quando a trilha for consultada, então o autor, o instante e as mudanças são devolvidos. 🔴 |
| RF-24 | O sistema deve recusar a exclusão da regra vinculada a séries ativas, com a indicação dos vínculos. | Should | Dado uma regra vinculada a três séries, quando excluída, então a exclusão é recusada, com a indicação. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | A manutenção de regras exige a permissão do processo 947 e o nível de acesso Institucional. | `ieducar/modules/RegraAvaliacao/Views/EditController.php` (`_processoAp = 947`, `_nivelAcessoOption = INSTITUCIONAL`) e `IndexController.php:12` e `ViewController.php:18` | 🟢 |
| Segurança | As fórmulas de média são executadas com `eval` sobre texto configurável, o que é execução de código arbitrário. | `ieducar/modules/FormulaMedia/Model/Formula.php:122-128` | 🔴 |
| Integridade | A regra e as regras de recuperação são gravadas em transação, com rollback e mensagem de erro. | `EditController.php:1081-1122` | 🟢 |
| Integridade | A compatibilidade de apuração de frequência entre a regra e a regra diferenciada é verificada na gravação. | `EditController.php:1021-1025` | 🟢 |
| Integridade | A biblioteca de tipos da regra valida o intervalo de cada parâmetro (média, presença, recuperação). | `Regra.php:223-245` | 🟢 |
| Performance | As fórmulas são executadas em avaliador dinâmico por etapa do cálculo, com parsagem por expressão regular a cada chamada. | `Formula.php:183-192` | 🟢 |
| Manutenibilidade | A unit é dupla camada: o modelo legado `CoreExt` e os modelos Eloquent coexistem sobre as mesmas tabelas. | `Regra.php` e `app/Models/LegacyEvaluationRule.php` | 🟢 |
| Manutenibilidade | A regra de recuperação é alcançada por dois caminhos: o data mapper legado e o modelo Eloquent `LegacyRemedialRule`. | `RegraDataMapper.php` e `app/Models/LegacyRemedialRule.php:14` | 🟢 |
| Usabilidade | O formulário de cadastro é uma tela única, com campos de instituição, sistema de nota, progressão, médias, recuperação paralela, dependências e recuperações por etapa. | `EditController.php:344-384` | 🟡 |
| Observabilidade | Não há log de alteração de regra, nem registro de autor, instante ou valor anterior. | ausência de evidência no código lido | 🔴 |
| Multi-tenancy | O legado opera em base municipal única com o campo `instituicao`; o modelo novo isola por `tenant_id`. | `Regra.php:6` e `_reversa_sdd/RegraAvaliacao/legacy-mapping.md`, seção 2 | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado uma regra com nome de 4 caracteres
Quando a gravação for tentada
Então a gravação é recusada com a mensagem de erro do validador de nome

Dado uma regra com tipo de nota nenhum e fórmula de média preenchida
Quando a gravação for tentada
Então a gravação é recusada, pois só aceita fórmula nula

Dado uma regra com tipo de nota numérica e conceitual
Quando a gravação for tentada
Então a tabela numérica é a informada no campo de tabela numérica, e a conceitual é anulada

Dado a tabela de arredondamento selecionada não correspondente ao sistema de nota
Quando a gravação for tentada
Então a gravação é recusada, com a mensagem de tabela incompatível

Dado uma regra com presença geral e uma regra diferenciada com presença por componente
Quando a gravação for tentada
Então a gravação é recusada, com a mensagem de apuração de frequência incompatível

Dado uma configuração de pontos com valor inválido
Quando a gravação for tentada
Então a gravação é recusada, com a mensagem de configuração de pontos inválida

Dado uma recuperação por etapa com nota máxima menor que a mínima
Quando a gravação for tentada
Então a gravação é recusada pelo validador do domínio

Dado uma regra com uma recuperação marcada para exclusão e uma nova recuperação
Quando a gravação for tentada
Então a recuperação marcada é excluída e a nova é gravada

Dado uma regra para copiar, com o parâmetro copy=true
Quando o formulário for aberto e gravado
Então a nova regra é criada com as recuperações recriadas

Dado a gravação de regra com fórmula e recuperação inválidas
Quando a transação falhar
Então nenhuma alteração fica persistida, com a mensagem de erro consolidada

Dado um filtro de listagem por ano letivo e por série
Quando a listagem for gerada
Então só as regras vinculadas ao ano e à série filtrados são exibidas

Dado a tela de detalhe de uma regra
Quando consultada
Então os parâmetros exibidos são os mesmos gravados, com enlace à tabela e às fórmulas

Dado um usuário sem a permissão do processo 947
Quando a tela de regras for acessada
Então o acesso é negado
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Manter a regra de avaliação, com os parâmetros pedagógicos | Must | Entidade mestre de toda a apuração |
| Vincular a regra a séries e anos, com a regra diferenciada | Must | Alimenta a resolução de regra do boletim |
| Cadastro e edição da regra, com a validação do domínio | Must | Caminho crítico de configuração |
| Recuperação por etapas específicas, com etapas separadas por `;` | Must | Insumo da recuperação por etapa |
| Gravação transacional com rollback | Must | Consistência da configuração |
| Fórmulas de média e de recuperação | Must | Alimenta o cálculo da média |
| Tabelas de arredondamento numérica e conceitual | Must | Alimenta a apuração da decisão |
| Compatibilidade de apuração de frequência com a regra inclusiva | Must | Regra pedagógica da inclusão |
| Listagem com filtro por ano e por série | Must | Navegação da configuração |
| Detalhamento da regra | Must | Conferência da configuração |
| Permissão do processo 947 e nível Institucional | Must | Governa quem configura a rede |
| Cópia da regra, com as recuperações recriadas | Should | Reduz custo de configuração de redes com muitas regras |
| Avaliador de fórmulas seguro, sem `eval` | Must | Segurança crítica; ausente no legado 🔴 |
| Trilha de auditoria da regra | Should | Ausência no legado e previsto no modelo novo 🔴 |
| Recusa de exclusão de regra vinculada a séries | Should | Ausente no legado e previsto no modelo novo 🔴 |
| Simulador de fórmulas na gravação | Could | Previsto no modelo novo, ausente no legado 🔴 |
| Motor de cálculo funcional sem acesso a banco | Could | Previsto no modelo novo, ausente no legado 🔴 |

> Prioridade inferida por frequência de chamada, posição na cadeia de dependências e consumo pelo motor de apuração.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/modules/RegraAvaliacao/Model/Regra.php` | Entidade da regra de avaliação, com 37 campos | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/RegraDataMapper.php` | Persistência e finders das fórmulas e tabelas | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacao.php` | Regra de recuperação por etapas específicas | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/RegraRecuperacaoDataMapper.php` | Persistência da regra de recuperação | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/SerieAno.php` | Vínculo regra, regra diferenciada, ano e série | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/SerieAnoDataMapper.php` | Persistência do vínculo | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/Nota/TipoValor.php` | Enum do sistema de nota | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/TipoProgressao.php` | Enum do regime de progressão | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/TipoParecerDescritivo.php` | Enum do parecer descritivo | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/TipoPresenca.php` | Enum do tipo de presença | 🟢 |
| `ieducar/modules/RegraAvaliacao/Model/TipoRecuperacaoParalela.php` | Enum da recuperação paralela | 🟢 |
| `ieducar/modules/RegraAvaliacao/Validators/RegraAvaliacaoValidator.php` | Validação do domínio do formulário | 🟢 |
| `ieducar/modules/RegraAvaliacao/Views/EditController.php` | Formulário de cadastro, edição e cópia | 🟢 |
| `ieducar/modules/RegraAvaliacao/Views/IndexController.php` | Listagem com filtro por ano e por série | 🟢 |
| `ieducar/modules/RegraAvaliacao/Views/ViewController.php` | Detalhe da regra | 🟢 |
| `ieducar/modules/FormulaMedia/Model/Formula.php` | Execução das fórmulas com `eval` | 🟢 |
| `ieducar/modules/FormulaMedia/Model/FormulaDataMapper.php` | Persistência das fórmulas | 🟢 |
| `ieducar/modules/TabelaArredondamento/Model/Tabela.php` | Entidade da tabela de arredondamento | 🟢 |
| `ieducar/modules/TabelaArredondamento/Model/TabelaValor.php` | Valor da tabela de arredondamento | 🟢 |
| `app/Models/LegacyEvaluationRule.php` | Modelo Eloquent da regra de avaliação | 🟢 |
| `app/Models/LegacyEvaluationRuleGradeYear.php` | Modelo Eloquent do vínculo regra, série e ano | 🟢 |
| `app/Models/LegacyRoundingTable.php` | Modelo Eloquent da tabela de arredondamento | 🟢 |
| `app/Models/LegacyValueRoundingTable.php` | Modelo Eloquent do valor da tabela | 🟢 |
| `app/Models/LegacyAverageFormula.php` | Modelo Eloquent da fórmula de média | 🟢 |
| `app/Models/LegacyRemedialRule.php` | Modelo Eloquent da regra de recuperação | 🟢 |
| `app/Models/Builders/LegacyEvaluationRuleBuilder.php` | Construtor de consultas da regra | 🟢 |
| `app/Models/LegacySchoolClass.php` | Resolução da regra aplicável à turma | 🟢 |
| `app/Services/StageScoreCalculationService.php` | Consumo pelo cálculo da recuperação paralela | 🟢 |
| `ieducar/modules/Avaliacao/Service/Boletim/RegraAvaliacao.php` | Consumo pelo motor de apuração | 🟢 |
| `modules.regra_avaliacao` | Tabela da regra | 🟢 |
| `modules.regra_avaliacao_serie_ano` | Tabela do vínculo regra, série e ano | 🟢 |
| `modules.regra_avaliacao_recuperacao` | Tabela da regra de recuperação | 🟢 |
| `modules.tabela_arredondamento` | Tabela da régua de arredondamento | 🟢 |
| `modules.tabela_arredondamento_valor` | Tabela dos valores da régua | 🟢 |
| `modules.formula_media` | Tabela das fórmulas de média | 🟢 |
| `_reversa_sdd/RegraAvaliacao/legacy-mapping.md` | Desenho de migração para o modelo novo | 🟢 |
