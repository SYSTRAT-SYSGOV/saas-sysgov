# Configuracao (i-Educar legado), Perguntas Abertas

> Perguntas levantadas na extração da unit de parametrização, para decidir na etapa de valorarização ou com o dono do produto.
> Cada pergunta indica a confiança da observação de origem: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Perguntas

| # | Pergunta | Por que importa | Evidência de origem | Confiança |
|---|----------|-----------------|---------------------|-----------|
| Q-01 | A migração do `bloqueio_ano_letivo` deve inverter a semântica da janela (permitida no legado → travada no alvo), conforme o desenho do bastão, ou manter o formato de janela permitida? | Define a transformação de dados mais sensível da unit; uma inversão errada desbloqueia ou trava a rede inteira | `educar_bloqueio_ano_letivo_cad.php:70-71` contra `legacy-mapping.md:106-146` | 🔴 |
| Q-02 | Os cinco tipos de operação do novo motor de bloqueios (notas, frequência, plano de aula, matrícula, histórico) devem bloquear exatamente quais endpoints? | O legado só bloqueia o lançamento de notas; paridade estrita significa escopo menor que o desenhado | `DiarioApiController.php:54-69` (único consumidor) | 🔴 |
| Q-03 | A tolerância retroativa de dias vale por lançamento, por componente ou por operador? | Mudança de semântica com efeito direto na rotina do professor | `legacy-mapping.md:241-380` (sem paralelo no legado) | 🔴 |
| Q-04 | A prorrogação de prazo (exceção) concede por operador, por turma e por componente simultaneamente ou em qualquer combinação? | Forma da tabela `educa_lock_exceptions` e do fluxo de aprovação | `legacy-mapping.md:149-187` (sem paralelo no legado) | 🔴 |
| Q-05 | Quais chaves do `public.settings` são sensíveis e devem receber o tipo `ENCRYPTED` na migração? | Lista de criptografia precisa de curadoria; o legado grava tudo em texto plano | `app/Setting.php:14-25` (sem tipo cifrado) 🟢 | 🔴 |
| Q-06 | As cerca de trinta e cinco bandeiras da instituição migram para o dicionário da mantenedora ou seguem para as units de domínio (matrícula, histórico, turma)? | Decide o formato do agregado de configurações e a repetição entre units | `educar_instituicao_cad.php:222-393` 🟢 | 🟡 |
| Q-07 | A bandeira escolar `bloquear_lancamento_diario_anos_letivos_encerrados` pertence ao modelo de bloqueios ou ao cadastro da escola? | Fonte de configuração real ausente no desenho do bastão | `DiarioApiController.php:48-52` 🟢 | 🔴 |
| Q-08 | A exigência de laudo médico permanece na unidade de deficiências (paridade) ou sobe para o dicionário da mantenedora como prefere o bastão? | Corrige o de/para errado do bastão sem mudar o comportamento | `app/Models/LegacyDeficiency.php:28` 🟢 contra `legacy-mapping.md` | 🔴 |
| Q-09 | A quantidade máxima de dependências permanece na regra de avaliação (paridade) ou sobe para a configuração da rede? | Coluna citada pelo bastão não existe em `instituicao` | busca e unit `RegraAvaliacao` | 🔴 |
| Q-10 | A gravação do dicionário de parâmetros recebe lista de permissões e validação de tipo, ou mantém o comportamento aberto do legado? | Defesa da tela mais sensível do sistema | `SettingController.php:48-56` 🟡 | 🔴 |
| Q-11 | A trilha de auditoria dos parâmetros registra somente o valor anterior e o novo, ou também o autor e o motivo? | Define o formato do registro auditável ausente no legado | `SettingController.php:52` 🟢 | 🔴 |
| Q-12 | As datas de deslocamento e de troca de sala continuam sendo regras de apresentação de relatórios, ou passam a bloquear operações - como o nome novo sugere? | O rótulo novo descreve travamento; o código legado só ordena relatórios | `educar_instituicao_cad.php:228-249` 🟢 | 🔴 |
| Q-13 | A data base de matrícula (corte etário) é uma única data por tenant, ou o novo modelo admite cortes por etapa e por escola? | Semântica nova sem base no legado | `educar_instituicao_cad.php:250-262` 🟢 | 🟡 |
| Q-14 | A exclusão do bloqueio do ano letivo continua sem verificação de vínculos (paridade) ou passa a recusar quando a janela é citada em coordenações? | Recusa silenciosa no legado | `educar_bloqueio_ano_letivo_cad.php:125-144` 🟢 | 🟡 |
| Q-15 | A configuração geral da instituição fica em tabela própria (paridade do registro um a um) ou é absorvida pelo dicionário tipado? | Simplifica o modelo, mas muda o formato das rodapés com recursos visuais e mensagens longas | `LegacyGeneralConfiguration.php` e migração 🟢 | 🟡 |
| Q-16 | O token de integração do \"Novo Educação\" migra cifrado, e a integração continua ativa no novo modelo? | Decide a cifragem e o destino da integração legada | `educar_configuracoes_gerais.php:133-148` 🟢 | 🔴 |
| Q-17 | A emissão dos atos autorizativos e de criação/credenciamento pertence às configurações ou aos relatórios? | A tela mistura a emissão com a configuração | `educar_configuracoes_gerais.php:108-131` 🟢 | 🟡 |
| Q-18 | O middleware continua carregando todas as configurações em cada requisição, ou passa a carregar - preguiçosamente - por chave? | Decisão de performance herdada que hoje carrega o dicionário inteiro | `LoadSettings.php:58-64` 🟢 | 🟡 |
| Q-19 | As rodapés com os textos padrão da comunidade continuam como padrão após a migração, ou nova rede começa sem texto? | Texto padrão do seed da migração | migração `configuracoes_gerais:24-29` 🟢 | 🟡 |
| Q-20 | As bandeiras de controle de espaço físico (porcentagem máxima de ocupação e alunos por metro quadrado) são validadas em algum processo no legado, ou só vivem no cadastro? | Nenhuma validação de consumo foi encontrada; sem resposta, paridade apenas de cadastro | `educar_instituicao_cad.php:222-236` 🟢 | 🔴 |

---

## Perguntas em conflito com o bastão

- Q-01, Q-02: o desenho alvo assume motor de bloqueios complexo; o legado tem janela única aplicada apenas a notas.
- Q-08, Q-09: o bastão desloca parâmetros para a mantenedora que no legado vivem em `deficiencia` e nas regras de avaliação.
- Q-07: bandeira escolar ausente do desenho.
- Q-12: rótulos novos descrevem travamento; o código faz apresentação.

**Total desta unit: 20 perguntas.**
