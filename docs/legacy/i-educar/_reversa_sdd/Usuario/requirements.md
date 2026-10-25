# Usuario (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de usuários, perfis de acesso e permissões legado faz, com rastreabilidade ao código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema de usuários do i-Educar controla quem entra no sistema, o que essa pessoa pode ver e o que ela pode alterar. Ele é composto por três blocos: a **identidade** do usuário e suas credenciais, o **perfil de acesso** (tipo de usuário, com um nível hierárquico), e a **matriz de permissões** que liga o perfil às telas do sistema por três flags. 🟢

Problema que resolve: garantir que cada pessoa, ao entrar no sistema, veja apenas as telas que lhe competem e possa alterar apenas o que a sua função permite, e garantir que as credenciais não sejam acessadas por quem não tem o direito. 🟢

Observação estrutural: a identidade está **bifurcada** entre `portal.funcionario`, que guarda matrícula, senha, e-mail e situação da conta, e `pmieducar.usuario`, que guarda o perfil de acesso e a instituição, unidos pelo mesmo identificador numérico da pessoa. 🟢 `app/User.php:19-46` e `app/Models/LegacyUser.php:16-24`

Observação estrutural: a autorização é feita **por tela de menu**, e não por recurso de negócio. A matriz `pmieducar.menu_tipo_usuario` liga o tipo de usuário ao identificador de um item de menu, com as flags `visualiza`, `cadastra` e `exclui`. 🟢 `app/Models/LegacyUserType.php:56-65`

---

## Responsabilidades

- Autenticar o usuário pela matrícula, com verificação de senha por hash e, em caso de legado, por MD5. 🟢 `app/Extensions/LegacyUserProvider.php:53-85`
- Converter a senha em MD5 para o hash moderno no primeiro acesso com credencial antiga. 🟢 `LegacyUserProvider.php:74-79`
- Manter o perfil de acesso do usuário, com o tipo de usuário, a instituição e a autoria. 🟢 `app/Models/LegacyUser.php:16-24`
- Manter o tipo de usuário, com nome, descrição e nível hierárquico. 🟢 `app/Models/LegacyUserType.php:29-36`
- Resolver o conjunto de processos permitidos ao perfil, com o nível de ação por processo. 🟢 `LegacyUserType.php:66-86`
- Resolver os níveis de descrição do usuário, do mais baixo ao mais alto. 🟢 `LegacyUserType.php:87-96`
- Verificar a permissão de visualizar, de alterar e de excluir um processo, por gate. 🟢 `app/Policies/ProcessPolicy.php:12-46`
- Vincular o usuário às escolas em que atua, com a marcação da escola atual. 🟢 `app/Models/LegacyUserSchool.php:9-15`
- Montar o menu do usuário, com a árvore de telas visíveis segundo o perfil. 🟢 `app/Menu.php:26-46` e `:216-222`
- Registrar o acesso ao sistema, com data, hora, endereços interno e externo e o indicador de sucesso. 🟢 `app/Models/LegacyAccess.php:14-31`
- Bloquear a conta por expiração, por inatividade ou por bloqueio administrativo. 🟢 `app/User.php:171-178`
- Impedir o acesso de contas inativas, expiradas ou ainda não iniciadas, com a mensagem do motivo do bloqueio. 🟢 `app/Extensions/LegacyUserProvider.php:58-64` e `app/User.php:130-146`
- Desviar o usuário para a tela de sistema suspenso quando a operação estiver desativada por configuração. 🟢 `app/Http/Middleware/Suspended.php:15-24`
- Manter as funções dos servidores e o cargo de gestor escolar, em catálogos próprios. 🟢 `app/Models/LegacyRole.php:18-32` e `app/Models/ManagerRole.php:8-19`

---

## Regras de Negócio

- O nível de acesso do perfil é um dos quatro valores: 1, poli-institucional; 2, institucional; 4, escola; 8, biblioteca. 🟢 `app/Models/LegacyUserType.php:22-25` e `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:87-95`
- O nível de acesso do usuário é o nível do seu tipo de usuário, e é o mesmo para toda a rede. 🟢 `app/User.php:121-123` e `clsPermissoes.inc.php:97-102`
- Os níveis de descrição do usuário são filtrados de forma crescente, de modo que o nível 4 recebe as descrições de biblioteca, escola, institucional e poli-institucional. 🟢 `app/Models/LegacyUserType.php:87-96`
- O nível de ação sobre um processo é 1 para visualizar, 2 para alterar, 3 para excluir, e 0 quando nenhuma flag está marcada. 🟢 `app/Models/LegacyUserType.php:25-27` e `:70-82`
- O perfil poli-institucional recebe todos os processos do sistema, com o nível de ação máximo, sem consultar a matriz de permissões. 🟢 `LegacyUserType.php:67-74`
- O gate de visualização é liberado quando existe um item de menu de raiz com o mesmo identificador de processo, mesmo que o perfil não tenha a permissão. 🟢 `app/Policies/ProcessPolicy.php:13-27`
- O gate de alteração e o de exclusão dependem exclusivamente da matriz de permissões do perfil. 🟢 `ProcessPolicy.php:28-46`
- O gate de administrador é avaliado antes de qualquer outra habilidade, o que concede acesso irrestrito. 🟢 `app/Providers/AuthServiceProvider.php:27-34`
- A verificação de permissão legada delega ao gate e, quando negada, redireciona para a página indicada em vez de lançar exceção. 🟢 `clsPermissoes.inc.php:26-47` e `:63-84`
- O middleware de autorização converte a exceção de autorização em redirecionamento de volta, com a mensagem de falta de permissão. 🟢 `app/Http/Middleware/Authorize.php:20-29`
- A autenticação recupera o usuário pela matrícula do funcionário, e não pelo e-mail. 🟢 `app/Extensions/LegacyUserProvider.php:53-60`
- A senha é validada primeiro pelo hash moderno e, em caso de reprovação, pelo MD5 legado, que é então reconvertida. 🟢 `LegacyUserProvider.php:66-80`
- A conta inativa é rejeitada na autenticação, com o motivo do bloqueio registrado no funcionário. 🟢 `LegacyUserProvider.php:58-64`
- O usuário está ativo quando o funcionário e o usuário têm o sinalizador de atividade ligado. 🟢 `app/User.php:127-130`
- A conta expirada é a que tem data de expiração anterior ao momento atual. 🟢 `app/User.php:135-142`
- A conta ainda não iniciada é a que tem data de início posterior ao momento atual. 🟢 `app/User.php:144-151`
- O bloqueio administrativo grava a data de expiração como o momento atual, desliga a atividade do funcionário e desliga a atividade do usuário. 🟢 `app/User.php:171-178`
- O menu do administrador é a árvore completa; o menu dos demais é a árvore filtrada pelos tipos de usuário. 🟢 `app/Menu.php:216-222`
- Os processos de configuração e de configurações são ocultos de todos os perfis que não sejam o administrador. 🟢 `app/Menu.php:111-118` e `:161-166`
- O menu exibido ao usuário é o que tem a flag de visualização marcada na matriz. 🟢 `app/User.php:146-153`
- A busca de telas por usuário é limitada a 15 resultados e busca por título ou descrição. 🟢 `app/Menu.php:224-240`
- O usuário pode estar vinculado a várias escolas, sem distinção de função por escola. 🟢 `app/Models/LegacyUserSchool.php:9-15`
- A lotação do usuário em escola marca uma escola como atual, o que define a escola de contexto das telas. 🟢 `LegacyUserSchool.php:13`
- A classe legada de permissões devolve as escolas do usuário, ou falso quando não há vínculo. 🟢 `clsPermissoes.inc.php:124-133`
- A classe legada de permissões devolve o nível de acesso do usuário, ou nulo quando o usuário não existe. 🟢 `clsPermissoes.inc.php:97-102`
- A classe legada de permissões devolve a instituição do usuário, ou nulo quando não há vínculo. 🟢 `clsPermissoes.inc.php:111-116`
- O acesso ao sistema é registrado com data, hora, endereço interno, endereço externo, a pessoa e o indicador de sucesso. 🟢 `app/Models/LegacyAccess.php:14-31`
- O acesso anterior do usuário é o registro mais recente, e o número de dias sem acesso é calculado contra a data de habilitação da conta. 🟢 `app/User.php:162-186`
- O usuário é cacheado por doze horas, com as relações de pessoa, de tipo e de funcionário. 🟢 `app/Helpers/UserCache.php:11-20`
- A alteração e a exclusão do usuário disparam eventos de domínio. 🟢 `app/Models/LegacyUser.php:26-29`
- A listagem de usuários ativos exclui o perfil poli-institucional. 🟢 `app/User.php:187-194`
- A função do servidor e o cargo de gestor escolar são catálogos independentes, e o cargo de gestor é referenciado pelo identificador da função. 🟢 `app/Models/ManagerRole.php:16-19` e `app/Models/LegacyRole.php:30-33`
- A listagem de usuários ativos de não administradores é feita por junção com o portal, filtrando a atividade do funcionário. 🟢 `app/User.php:187-194`
- Não existe, no legado, bloqueio por excesso de tentativas de autenticação, nem contador de falhas. 🔴
- Não existe, no legado, segundo fator de autenticação. 🔴
- Não existe, no legado, autenticação federada com o Gov.br ou com o ICP-Brasil. 🟢 Há registro de um provedor OAuth2 próprio, sem identidade federal. `app/Providers/AuthServiceProvider.php:17-20` e `:47-51`
- Não existe, no legado, papel contextualizado por escola: o perfil é único para toda a rede. 🔴
- Não existe, no legado, expiração de senha aplicada no momento da autenticação, apesar de o campo existir. 🔴
- Não existe, no legado, revogação de sessões ativas. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | O sistema deve autenticar o usuário pela matrícula, com a senha validada por hash moderno. | Must | Dado um usuário com senha em bcrypt, quando a autenticação for feita, então o acesso é concedido. |
| RF-02 | O sistema deve aceitar a senha em MD5 legado e convertê-la para o hash moderno no primeiro acesso. | Must | Dado um usuário com senha em MD5, quando autenticar, então o acesso é concedido e o hash passa a ser o moderno. |
| RF-03 | O sistema deve recusar o acesso de conta inativa, com o motivo do bloqueio. | Must | Dado um funcionário desativado com motivo, quando a autenticação for tentada, então a falha traz o motivo registrado. |
| RF-04 | O sistema deve recusar o acesso de conta expirada e de conta ainda não iniciada. | Must | Dado um usuário expirado, quando a autenticação for tentada, então o acesso é negado. |
| RF-05 | O sistema deve manter o perfil de acesso do usuário, com o tipo, a instituição, a autoria e a situação. | Must | Dado um usuário, quando consultado, então o tipo e a instituição são devolvidos. |
| RF-06 | O sistema deve manter o tipo de usuário, com nome, descrição e nível hierárquico. | Must | Dado um tipo de usuário, quando consultado, então o nível é um dos quatro valores previstos. |
| RF-07 | O sistema deve resolver os processos permitidos ao perfil, com o nível de ação por processo. | Must | Dado um perfil com a flag de alteração em um processo, quando os processos forem resolvidos, então aquele processo tem nível 2. |
| RF-08 | O sistema deve conceder ao perfil de administrador o conjunto integral de processos, com o nível máximo de ação. | Must | Dado um perfil poli-institucional, quando os processos forem resolvidos, então todos os menus estão presentes com nível 3. |
| RF-09 | O sistema deve verificar a permissão de visualizar, de alterar e de excluir um processo. | Must | Dado um perfil sem a flag de exclusão, quando a exclusão for verificada, então o acesso é negado. |
| RF-10 | O sistema deve negar a tentativa de alteração ou de exclusão de um processo cujo identificador não esteja na matriz. | Must | Dado um processo fora da matriz do perfil, quando a alteração for verificada, então o acesso é negado. |
| RF-11 | O sistema deve vincular o usuário às escolas em que atua, com a marcação da escola atual. | Must | Dado um usuário lotado em duas escolas, quando a lotação for consultada, então as duas escolas são devolvidas e uma está marcada como atual. |
| RF-12 | O sistema deve montar o menu do usuário segundo o seu perfil, ocultando as telas de configuração para os não administradores. | Must | Dado um usuário de nível escolar, quando o menu for montado, então as telas de configuração não aparecem. |
| RF-13 | O sistema deve exibir ao usuário apenas as telas marcadas como visualizáveis na sua matriz. | Must | Dado um perfil com a flag de visualização desligada em uma tela, quando o menu for montado, então a tela não aparece. |
| RF-14 | O sistema deve limitar a busca de telas a quinze resultados, buscando por título ou por descrição. | Must | Dado um termo de busca, quando a busca for feita, então no máximo quinze telas são devolvidas. |
| RF-15 | O sistema deve registrar o acesso ao sistema, com data, hora, endereços e o indicador de sucesso. | Must | Dado um acesso concluído, quando o histórico for consultado, então o registro traz os endereços e o sucesso. |
| RF-16 | O sistema deve bloquear a conta por ação administrativa, com a data de expiração no momento do bloqueio. | Must | Dado um usuário bloqueado, quando consultado, então a conta está inativa e expirada no momento do bloqueio. |
| RF-17 | O sistema deve desviar o acesso para a tela de sistema suspenso quando a operação estiver desativada por configuração. | Must | Dado o sistema suspenso e um usuário comum, quando a requisição for feita, então o usuário é redirecionado para a tela de suspensão. |
| RF-18 | O sistema deve permitir o acesso do administrador mesmo com o sistema suspenso. | Must | Dado o sistema suspenso e um administrador, quando a requisição for feita, então o acesso é concedido. |
| RF-19 | O sistema deve converter a negação de autorização em mensagem ao usuário, sem expor erro interno. | Must | Dado um usuário sem permissão, quando a rota protegida for acessada, então o usuário é redirecionado de volta com a mensagem de falta de permissão. |
| RF-20 | O sistema deve manter a função do servidor e o cargo de gestor escolar como catálogos consultáveis. | Must | Dado um cargo de gestor, quando consultado, então os gestores vinculados são devolvidos. |
| RF-21 | O sistema deve listar os usuários ativos, excluindo o perfil de administrador. | Must | Dado um conjunto de usuários ativos, quando a listagem for feita, então o administrador não é devolvido. |
| RF-22 | O sistema deve calcular o tempo de conta sem acesso e o tempo desde a última troca de senha. | Must | Dado um usuário que nunca acessou, quando o tempo sem acesso for calculado, então o cálculo parte da data de habilitação da conta. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | A senha é armazenada com hash, e o MD5 legado é convertido no primeiro acesso bem-sucedido. | `app/Extensions/LegacyUserProvider.php:66-80` | 🟢 |
| Segurança | A senha nunca é exposta: o atributo é ocultado no modelo de usuário. | `app/User.php:25-27` | 🟢 |
| Segurança | A sessão de usuário é cacheada por doze horas, o que prolonga o prazo de revogação de uma conta bloqueada. | `app/Helpers/UserCache.php:11-13` | 🟢 |
| Segurança | O perfil de administrador é avaliado antes de todas as habilidades, o que ignora a matriz de permissões. | `app/Providers/AuthServiceProvider.php:27-34` | 🟢 |
| Segurança | O gate de visualização é liberado pela existência de um item de menu de raiz com o mesmo processo, o que amplia a exposição do usuário. | `app/Policies/ProcessPolicy.php:16-22` | 🟢 |
| Integridade | A alteração e a exclusão do usuário disparam eventos de domínio, o que permite observar a mudança. | `app/Models/LegacyUser.php:26-29` | 🟢 |
| Integridade | A identidade do usuário é desnormalizada: o login, o e-mail e a senha residem no portal, e o perfil reside no módulo. | `app/User.php:37-58` | 🟢 |
| Performance | O usuário é cacheado por doze horas para reduzir as consultas de autenticação. | `app/Helpers/UserCache.php:11-20` | 🟢 |
| Performance | A árvore de menu é montada com consulta recursiva e materializada em árvore. | `app/Menu.php:26-46` | 🟢 |
| Observabilidade | O acesso é registrado com o indicador de sucesso, o que permite medir tentativas malsucedidas. | `app/Models/LegacyAccess.php:25-30` | 🟢 |
| Observabilidade | A negação de autorização é registrada apenas como mensagem de sessão, sem evento de auditoria. | `app/Http/Middleware/Authorize.php:25-27` | 🟡 |
| Isolamento | O legado opera em base municipal única; a migração para o SYSGOV exige `tenant_id` em usuários, perfis, permissões e escopos escolares. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_usuario_table.php` | 🟡 |
| Auditabilidade | A conta registra o autor do cadastro e o da exclusão, mas a trilha de alterações de perfil é apenas a matriz de permissões. | `database/migrations/legacy/2020_01_01_110000_create_pmieducar_usuario_table.php` | 🟡 |
| Disponibilidade | Não há proteção contra força bruta, nem expiração de sessão, nem revogação imediata. | ausência de evidência no código lido | 🔴 |

> Inferido a partir do código. Validar com equipe de operações.

---

## Critérios de Aceitação

```gherkin
Dado um usuário com senha em bcrypt
Quando a autenticação for feita com a matrícula e a senha
Então o acesso é concedido

Dado um usuário com senha em MD5 legado
Quando a autenticação for feita com a matrícula e a senha
Então o acesso é concedido e o hash passa a ser o moderno

Dado um funcionário desativado com motivo registrado
Quando a autenticação for tentada
Então o acesso é negado com o motivo do bloqueio

Dado um perfil de usuário com a flag de alteração marcada em um processo
Quando os processos do perfil forem resolvidos
Então aquele processo tem o nível de ação 2

Dado um perfil poli-institucional
Quando os processos do perfil forem resolvidos
Então todos os processos estão presentes com o nível de ação 3

Dado um processo fora da matriz de permissões do perfil
Quando a alteração for verificada
Então o acesso é negado

Dado um usuário de nível escolar
Quando o menu for montado
Então as telas de configuração não são exibidas

Dado o sistema suspenso por configuração e um usuário comum
Quando uma requisição for feita
Então o usuário é redirecionado para a tela de suspensão

Dado o sistema suspenso por configuração e um administrador
Quando uma requisição for feita
Então o acesso é concedido

Dado um usuário lotado em duas escolas
Quando a lotação for consultada
Então as duas escolas são devolvidas e uma está marcada como escola atual
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Autenticação por matrícula com hash | Must | Porta de entrada de todo o sistema |
| Conversão do hash MD5 legado | Must | Sem ela, os usuários legados ficam impedidos de entrar |
| Rejeição de conta inativa, expirada ou não iniciada | Must | Segurança da conta |
| Perfil de acesso com nível hierárquico | Must | Base de toda a autorização |
| Matriz de permissões por tela | Must | Define o que cada função pode fazer |
| Verificação de visualizar, alterar e excluir | Must | Enforcement da matriz |
| Concessão integral ao administrador | Must | Operação da rede |
| Lotação do usuário nas escolas | Must | Define o contexto operacional |
| Montagem do menu por perfil | Must | Usabilidade e superfície de ataque |
| Registro de acesso com sucesso e endereços | Must | Auditoria de autenticação |
| Bloqueio administrativo da conta | Must | Resposta a incidente |
| Tela de sistema suspenso | Must | Operação controlada durante manutenção |
| Mensagem de negação sem erro interno | Must | Qualidade da resposta de autorização |
| Busca de telas com limite de quinze | Should | Existe no legado e é usada na navegação |
| Listagem de usuários ativos sem o administrador | Should | Existe no legado e é usada em relatórios |
| Cálculo de tempo sem acesso e desde a troca de senha | Should | Existe no legado e alimenta a rotina de segurança |
| Catálogo de função do servidor e de cargo de gestor | Should | Usado por outros módulos |
| Bloqueio por excesso de tentativas | Should | Ausente no legado e previsto no modelo novo |
| Segundo fator de autenticação | Should | Ausente no legado e previsto no modelo novo |
| Autenticação federada com o Gov.br | Could | Ausente no legado e previsto no modelo novo |
| Papel contextualizado por escola | Could | Ausente no legado e previsto no modelo novo |
| Revogação imediata de sessão | Could | Ausente no legado e previsto no modelo novo |
| Expiração de senha aplicada na autenticação | Could | O campo existe no legado, mas a aplicação não foi localizada |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `app/User.php` | Usuário autenticável, com atributos derivados do portal e verificações de situação | 🟢 |
| `app/Models/LegacyUser.php` | Entidade do usuário no módulo, com perfil, instituição e eventos | 🟢 |
| `app/Models/LegacyUserType.php` | Perfil de acesso, com nível, processos e descrições | 🟢 |
| `app/Models/LegacyMenuUserType.php` | Matriz de permissões por tela | 🟢 |
| `app/Models/LegacyUserSchool.php` | Lotação do usuário nas escolas | 🟢 |
| `app/Models/LegacyAccess.php` | Registro de acesso ao sistema | 🟢 |
| `app/Models/LegacyRole.php` | Catálogo de funções do servidor | 🟢 |
| `app/Models/LegacyEmployeeRole.php` | Vínculo de função do servidor | 🟢 |
| `app/Models/ManagerRole.php` | Catálogo de cargos de gestor escolar | 🟢 |
| `app/Extensions/LegacyUserProvider.php` | Provedor de autenticação e conversão de hash | 🟢 |
| `app/Policies/ProcessPolicy.php` | Verificação de visualizar, alterar e excluir | 🟢 |
| `app/Providers/AuthServiceProvider.php` | Registro dos gates e do provedor legado | 🟢 |
| `app/Menu.php` | Árvore de menus, montagem por perfil e busca de telas | 🟢 |
| `app/Process.php` | Catálogo de identificadores de processo do sistema | 🟢 |
| `app/Helpers/UserCache.php` | Cache de sessão do usuário | 🟢 |
| `app/Http/Middleware/Authorize.php` | Middleware de autorização | 🟢 |
| `app/Http/Middleware/Suspended.php` | Middleware de sistema suspenso | 🟢 |
| `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php` | Fachada legada de permissões | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_usuario_table.php` | Estrutura do usuário | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_tipo_usuario_table.php` | Estrutura do perfil de acesso | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_menu_tipo_usuario_table.php` | Estrutura da matriz de permissões | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_pmieducar_escola_usuario_table.php` | Estrutura da lotação escolar | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php` | Estrutura das credenciais | 🟢 |
| `database/migrations/legacy/2020_01_01_110000_create_portal_acesso_table.php` | Estrutura do registro de acesso | 🟢 |
| `_reversa_sdd/Usuario/legacy-mapping.md` | Desenho do modelo de RBAC do SYSGOV | 🟢 |
