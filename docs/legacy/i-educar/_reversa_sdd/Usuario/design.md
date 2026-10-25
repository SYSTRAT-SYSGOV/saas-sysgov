# Usuario (i-Educar legado), Design Técnico

> Descreve o **COMO** o subsistema de usuários, perfis e permissões legado é construído, com base no código lido.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do domínio legado

| Entidade | Chave | Atributos observados | Fonte |
|----------|-------|----------------------|-------|
| Usuário | `cod_usuario` | instituição, autor do cadastro, autor da exclusão, tipo de usuário, data de cadastro, data de exclusão, ativo | `app/Models/LegacyUser.php:16-24` |
| Credenciais do funcionário | `ref_cod_pessoa_fj` | matrícula, senha, ativo, seção, ramal, sequencial, opção de menu, setor, vínculo de funcionário, tempo de expiração de senha, tempo de expiração de conta, data de troca de senha, data de reativação de conta, proibido, matrícula nova, matrícula permanente, tipo de menu, endereço de IP registrado, data de login, e-mail, token de situação, matrícula interna, receber novidades, atualizou cadastro, data de expiração | `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php` |
| Tipo de usuário | `cod_tipo_usuario` | nível, nome, descrição, autor do cadastro | `app/Models/LegacyUserType.php:29-36` |
| Matriz de permissões | tipo de usuário, menu | `visualiza`, `cadastra`, `exclui` | `app/Models/LegacyMenuUserType.php:13-19` |
| Item de menu | `id` | pai, título, descrição, link, ícone, ordem, tipo, identificador de processo, ativo | `app/Menu.php:13-26` |
| Lotação escolar | usuário, escola | escola atual | `app/Models/LegacyUserSchool.php:9-15` |
| Registro de acesso | `cod_acesso` | data e hora, IP externo, IP interno, pessoa, observação, sucesso | `app/Models/LegacyAccess.php:14-31` |
| Função do servidor | `cod_funcao` | nome, abreviatura, marca de professor | `app/Models/LegacyRole.php:18-25` |
| Função exercida pelo servidor | `cod_servidor_funcao` | matrícula, função, servidor, instituição | `app/Models/LegacyEmployeeRole.php:11-16` |
| Cargo de gestor escolar | — | nome | `app/Models/ManagerRole.php:8-12` |

### Domínio do nível de acesso

| Valor | Constante | Rótulo | Significado |
|-------|-----------|--------|-------------|
| 1 | `LEVEL_ADMIN` | Poli-institucional | Acesso irrestrito a todos os processos 🟢 `app/Models/LegacyUserType.php:22` |
| 2 | `LEVEL_INSTITUTIONAL` | Institucional | Operação da rede 🟢 `LegacyUserType.php:23` |
| 4 | `LEVEL_SCHOOLING` | Escola | Operação da unidade escolar 🟢 `LegacyUserType.php:24` |
| 8 | `LEVEL_LIBRARY` | Biblioteca | Operação da biblioteca 🟢 `LegacyUserType.php:25` |

### Domínio do nível de ação sobre o processo

| Valor | Constante | Significado |
|-------|-----------|-------------|
| 0 | — | Nenhuma permissão 🟢 `app/Models/LegacyUserType.php:73` |
| 1 | `CAN_VIEW` | Visualizar 🟢 `LegacyUserType.php:25` |
| 2 | `CAN_MODIFY` | Alterar 🟢 `LegacyUserType.php:26` |
| 3 | `CAN_REMOVE` | Excluir 🟢 `LegacyUserType.php:27` |

### Endpoints HTTP

| Método | Caminho | Entrada | Saída | Observação |
|--------|---------|---------|-------|------------|
| GET | `/api/courses` | — | Coleção paginada | Exemplo de processo 566, com autorização dispensada 🟢 `app/Http/Controllers/Api/CourseController.php:16-21` |
| GET | `/api/school-classes` | — | Coleção paginada | Exemplo de processo 586, com autorização dispensada 🟢 `app/Http/Controllers/Api/SchoolClassController.php:16-21` |
| GET | `/api/users` | filtros | Coleção paginada de usuários | A implementar no modelo novo 🟡 |
| GET | `/intranet/educar_usuario_*` | — | Telas de cadastro de usuário | 🟡 |

> O legado não expõe um catálogo de endpoints de usuário; a autorização é aplicada por tela de menu e por gate, e não por rota de API dedicada. 🟢 `app/Process.php:11-71`

### Funções e classes

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `User::isAdmin` | `()` | `bool` | Nível poli-institucional 🟢 `app/User.php:110-113` |
| `User::isActive` | `()` | `bool` | Atividade do funcionário e do usuário 🟢 `app/User.php:127-130` |
| `User::isExpired` | `()` | `bool` | Data de expiração anterior ao momento atual 🟢 `app/User.php:135-142` |
| `User::isNotStarted` | `()` | `bool` | Data de início posterior ao momento atual 🟢 `app/User.php:144-151` |
| `User::disable` | `()` | `void` | Bloqueio administrativo com expiração imediata 🟢 `app/User.php:171-178` |
| `User::getLevel` | `()` | `int` | Nível do tipo de usuário 🟢 `app/User.php:121-123` |
| `User::getPasswordAttribute` | `()` | `string` | Senha lida do portal 🟢 `app/User.php:45-48` |
| `User::setPasswordAttribute` | `($password)` | `void` | Senha gravada no portal 🟢 `app/User.php:49-53` |
| `User::getLastAccessDate` | `()` | `Carbon` | Registro de acesso mais recente 🟢 `app/User.php:162-176` |
| `User::getActiveUsersNotAdmin` | `()` | `Collection` | Usuários ativos sem o administrador 🟢 `app/User.php:187-194` |
| `LegacyUserType::getProcesses` | `()` | `Collection` | Processos permitidos com o nível de ação 🟢 `app/Models/LegacyUserType.php:66-86` |
| `LegacyUserType::getLevelDescriptions` | `()` | `Collection` | Descrições de nível do usuário 🟢 `LegacyUserType.php:87-96` |
| `LegacyUserType::menus` | `()` | `BelongsToMany` | Matriz de permissões do perfil 🟢 `LegacyUserType.php:56-65` |
| `ProcessPolicy::view` | `(User, $process)` | `bool` | Permissão de visualização 🟢 `app/Policies/ProcessPolicy.php:12-27` |
| `ProcessPolicy::modify` | `(User, $process)` | `bool` | Permissão de alteração 🟢 `ProcessPolicy.php:28-37` |
| `ProcessPolicy::remove` | `(User, $process)` | `bool` | Permissão de exclusão 🟢 `ProcessPolicy.php:38-46` |
| `LegacyUserProvider::retrieveByCredentials` | `($credentials)` | `?User` | Busca por matrícula do funcionário 🟢 `app/Extensions/LegacyUserProvider.php:53-60` |
| `LegacyUserProvider::validateCredentials` | `($user, $credentials)` | `bool` | Valida a conta e a senha 🟢 `LegacyUserProvider.php:61-73` |
| `LegacyUserProvider::validateLegacyCredentials` | `($user, $credentials)` | `bool` | Fallback em MD5 e reconversão 🟢 `LegacyUserProvider.php:74-80` |
| `Menu::user` | `(User)` | `Collection` | Árvore de menus do usuário 🟢 `app/Menu.php:216-222` |
| `Menu::findByUser` | `(User, $search)` | `Collection` | Busca de telas, limitada a quinze 🟢 `app/Menu.php:224-240` |
| `Menu::processes` | `($path, $process, $userLevel)` | `Collection` | Processos da tela, com exclusão de configuração 🟢 `app/Menu.php:140-176` |
| `clsPermissoes::permissao_cadastra` | `($processo, $usuario, $nivel, $redirecionar)` | `bool\|void` | Fachada legada da permissão de alterar 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:26-47` |
| `clsPermissoes::nivel_acesso` | `($usuario)` | `int\|null` | Nível de acesso do usuário 🟢 `clsPermissoes.inc.php:97-102` |
| `clsPermissoes::getEscolas` | `($usuario)` | `array\|false` | Escolas do usuário 🟢 `clsPermissoes.inc.php:124-133` |
| `Suspended::handle` | `($request, $next)` | `Response` | Bloqueio por sistema suspenso 🟢 `app/Http/Middleware/Suspended.php:15-24` |
| `Authorize::handle` | `($request, $next, $ability, ...$models)` | `Response` | Autorização com mensagem ao usuário 🟢 `app/Http/Middleware/Authorize.php:20-29` |
| `UserCache::user` | `($id)` | `?User` | Sessão cacheada por doze horas 🟢 `app/Helpers/UserCache.php:11-20` |

---

## Fluxo Principal

1. O usuário informa matrícula e senha na tela de login. 🟢 `app/Extensions/LegacyUserProvider.php:53-60`
2. O usuário é localizado pela matrícula do funcionário, e o cache de doze horas é consultado. 🟢 `LegacyUserProvider.php:54-56` e `app/Helpers/UserCache.php:11-13`
3. A conta inativa é rejeitada, com o motivo do bloqueio registrado no funcionário. 🟢 `LegacyUserProvider.php:58-64`
4. A senha é validada pelo hash moderno e, em caso de reprovação, pelo MD5 legado. 🟢 `LegacyUserProvider.php:66-72`
5. Quando a senha é MD5, o hash é reconvertido para o formato moderno e gravado no portal. 🟢 `LegacyUserProvider.php:74-79`
6. O gate de administrador é avaliado e, quando aplicável, concede acesso irrestrito. 🟢 `app/Providers/AuthServiceProvider.php:27-34`
7. O middleware de sistema suspenso verifica a configuração e o nível da sessão. 🟢 `app/Http/Middleware/Suspended.php:16-19`
8. A árvore de menus é montada segundo o perfil, ocultando as telas de configuração para os não administradores. 🟢 `app/Menu.php:26-46` e `:216-222`
9. Cada rota protegida verifica a permissão do processo pelo gate, e a negação vira mensagem de volta ao usuário. 🟢 `app/Policies/ProcessPolicy.php:12-46` e `app/Http/Middleware/Authorize.php:24-27`
10. O acesso é registrado com data, hora, endereços e o indicador de sucesso. 🟢 `app/Models/LegacyAccess.php:14-31`

---

## Fluxos Alternativos

- **Senha em MD5:** o acesso é concedido e o hash é convertido. 🟢 `app/Extensions/LegacyUserProvider.php:74-79`
- **Conta inativa:** a autenticação falha com o motivo registrado. 🟢 `LegacyUserProvider.php:58-64`
- **Conta expirada ou ainda não iniciada:** o acesso é negado. 🟢 `app/User.php:135-151`
- **Perfil administrador:** a matriz de permissões não é consultada e todos os processos recebem o nível máximo. 🟢 `app/Models/LegacyUserType.php:67-74`
- **Processo com item de menu de raiz:** a visualização é liberada mesmo sem a flag na matriz. 🟢 `app/Policies/ProcessPolicy.php:16-22`
- **Processo fora da matriz:** a alteração e a exclusão são negadas. 🟢 `ProcessPolicy.php:28-46`
- **Fachada legada de permissão:** a negação redireciona para a página indicada, em vez de lançar exceção. 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:40-47`
- **Middleware de autorização:** a exceção é capturada e o usuário volta à página anterior com a mensagem de falta de permissão. 🟢 `app/Http/Middleware/Authorize.php:24-27`
- **Sistema suspenso:** o usuário comum é redirecionado, e o administrador não. 🟢 `app/Http/Middleware/Suspended.php:17-23`
- **Usuário sem escola vinculada:** a fachada legada devolve falso em vez de lista vazia. 🟢 `clsPermissoes.inc.php:126-133`
- **Usuário inexistente:** a fachada legada devolve nulo para o nível e para a instituição. 🟢 `clsPermissoes.inc.php:99-102` e `:113-116`
- **Usuário nunca acessado:** o tempo sem acesso é calculado a partir da data de habilitação da conta. 🟢 `app/User.php:177-186`
- **Bloqueio administrativo:** a conta é expirada no momento e desativada nos dois níveis. 🟢 `app/User.php:171-178`

---

## Dependências

- **Pessoa (`cadastro.pessoa`):** origem do nome do usuário, por identificador compartilhado. 🟢 `app/User.php:101-104`
- **Funcionário do portal (`portal.funcionario`):** origem da matrícula, do e-mail, da senha, da situação da conta e do token de sessão. 🟢 `app/User.php:105-108` e `:37-58`
- **Perfil de acesso (`pmieducar.tipo_usuario`):** origem do nível de acesso do usuário. 🟢 `app/User.php:113-117`
- **Matriz de permissões (`pmieducar.menu_tipo_usuario`):** origem das permissões por tela. 🟢 `app/Models/LegacyUserType.php:56-65`
- **Árvore de menus (`menus`):** origem das telas e dos identificadores de processo. 🟢 `app/Menu.php:13-26`
- **Lotação escolar (`pmieducar.escola_usuario`):** origem das escolas do usuário. 🟢 `app/User.php:154-162`
- **Instituição (`pmieducar.instituicao`):** origem da rede a que o usuário pertence. 🟢 `app/Models/LegacyUser.php:47-50`
- **Registro de acesso (`portal.acesso`):** origem do histórico de entrada no sistema. 🟢 `app/Models/LegacyAccess.php:14-31`
- **Servidor (`pmieducar.servidor`):** origem da função exercida e da matrícula do servidor. 🟢 `app/Models/LegacyEmployeeRole.php:11-16`
- **Gestores escolares (`public.school_managers`):** origem do cargo de gestor, referenciado pelo identificador da função. 🟢 `app/Models/ManagerRole.php:16-19`
- **Catálogo de processos (`app/Process.php`):** registro central dos identificadores de processo usados em toda a autorização. 🟢 `app/Process.php:11-71`

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Identidade bifurcada entre portal e módulo, unidas pelo identificador da pessoa | `app/User.php:19-46` e `app/Models/LegacyUser.php:16-24` | 🟢 |
| Atributos de autenticação derivados por acessoors, e não colunas do módulo | `app/User.php:37-58` | 🟢 |
| Autorização por tela de menu, com três flags de ação | `app/Models/LegacyMenuUserType.php:13-19` e `LegacyUserType.php:56-65` | 🟢 |
| Níveis de acesso como hierarquia numérica de potências de dois | `app/Models/LegacyUserType.php:22-25` | 🟢 |
| Concessão integral ao nível 1, sem consulta à matriz | `app/Models/LegacyUserType.php:67-74` | 🟢 |
| Gate de administrador avaliado antes das habilidades, por `Gate::before` | `app/Providers/AuthServiceProvider.php:27-34` | 🟢 |
| Habilidades nomeadas por ação, e não por recurso de negócio | `app/Providers/AuthServiceProvider.php:32-35` | 🟢 |
| Fachada legada de permissões mantida por compatibilidade, marcada como obsoleta | `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:16` | 🟢 |
| Negação de autorização convertida em redirecionamento, e não em erro 403 | `app/Http/Middleware/Authorize.php:24-27` | 🟢 |
| Conversão transparente de MD5 para hash moderno no primeiro acesso | `app/Extensions/LegacyUserProvider.php:74-79` | 🟢 |
| Sessão de usuário cacheada por doze horas | `app/Helpers/UserCache.php:11-13` | 🟢 |
| Bloqueio administrativo com expiração imediata, em vez de revogação de sessão | `app/User.php:171-178` | 🟢 |
| Registro de acesso com indicador de sucesso, para medir tentativas malsucedidas | `app/Models/LegacyAccess.php:25-30` | 🟢 |
| Telas de configuração e de configurações ocultas de todos os perfis não administrativos | `app/Menu.php:111-118` e `:161-166` | 🟢 |
| Lotação escolar sem função diferenciada por escola | `app/Models/LegacyUserSchool.php:9-15` | 🟢 |
| Identificadores de processo centralizados em uma classe de constantes | `app/Process.php:11-71` | 🟢 |

---

## Estado Interno

O subsistema é **com estado próprio**, com o estado da conta dividido entre o portal e o módulo, e o estado da autorização concentrado na matriz de permissões. 🟢

Campos de estado observados:

- `ativo` no usuário, que é a metade do indicador de atividade. 🟢 `app/Models/LegacyUser.php:23`
- `ativo` no funcionário do portal, que é a outra metade do indicador de atividade. 🟢 `app/User.php:128`
- `nivel` no tipo de usuário, que define a hierarquia de acesso. 🟢 `app/Models/LegacyUserType.php:30`
- `data_exclusao` no usuário, que registra a desativação pelo módulo. 🟢 `LegacyUser.php:22`
- `data_expiracao` no funcionário, que define a expiração da conta. 🟢 `app/User.php:136`
- `data_inicial` no funcionário, que define o início da vigência da conta. 🟢 `app/User.php:145`
- `data_troca_senha` no funcionário, que marca a última troca de senha. 🟢 `app/User.php:199`
- `tempo_expira_senha` e `tempo_expira_conta` no funcionário, que são as janelas de expiração. 🟢 `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php`
- `proibido` e `matricula_permanente` no funcionário, que são sinalizadores de bloqueio. 🟢 `portal.funcionario`
- `tipo_menu` e `opcao_menu` no funcionário, que são preferências de menu legadas. 🟢 `portal.funcionario`
- `status_token` no funcionário, que é o token de sessão. 🟢 `portal.funcionario`
- `escola_atual` na lotação escolar, que define a escola de contexto. 🟢 `app/Models/LegacyUserSchool.php:13`
- `visualiza`, `cadastra` e `exclui` na matriz de permissões, que são as três ações concedíveis. 🟢 `app/Models/LegacyMenuUserType.php:16-18`
- `sucesso` no registro de acesso, que distingue a entrada bem-sucedida da malsucedida. 🟢 `app/Models/LegacyAccess.php:30`
- `ip_logado` e `data_login` no funcionário, que registram a última sessão. 🟢 `portal.funcionario`
- `ativo` no tipo de usuário, que controla a existência do perfil. 🟢 `app/Models/LegacyUserType.php:99-104`

Não há, no legado, contador de falhas de autenticação, bloqueio temporário, situação de MFA, nem identificador federado. 🔴

---

## Observabilidade

- O registro de acesso informa data, hora, endereço interno, endereço externo, a pessoa e o sucesso da entrada. 🟢 `app/Models/LegacyAccess.php:14-31`
- A falha de autenticação de conta inativa carrega o motivo do bloqueio, registrado no cadastro do funcionário. 🟢 `app/Extensions/LegacyUserProvider.php:60-63`
- A negação de autorização produz a mensagem `Você não tem permissão para acessar este recurso` para o usuário. 🟢 `app/Http/Middleware/Authorize.php:25-27`
- A fachada legada de permissões redireciona para a página indicada, sem expor a razão da negação. 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:44-46`
- A alteração e a exclusão do usuário disparam eventos de domínio, o que permite observar a mudança. 🟢 `app/Models/LegacyUser.php:26-29`
- A tela de sistema suspenso informa a indisponibilidade ao usuário. 🟢 `app/Http/Middleware/Suspended.php:23`
- Não há log estruturado de tentativa negada, de escalonamento de privilégio, nem de auditoria de concessão de permissão. 🔴

---

## Riscos e Lacunas

- 🔴 Não há proteção contra força bruta: o login por matrícula é ilimitado, e o único registro de tentativa malsucedida é a linha em `portal.acesso`. 🟢 `app/Models/LegacyAccess.php:25-30`
- 🔴 O cache de usuário de doze horas mantém em sessão uma conta bloqueada ou desativada, o que amplia a janela de exposição de um comprometimento. 🟢 `app/Helpers/UserCache.php:11-13`
- 🔴 O gate de visualização é liberado pela existência de um item de menu de raiz com o mesmo identificador de processo, o que amplia a exposição além do que a matriz declara. 🟢 `app/Policies/ProcessPolicy.php:16-22`
- 🔴 O perfil de administrador ignora completamente a matriz de permissões, o que impede revogar seletivamente o acesso de um administrador. 🟢 `app/Models/LegacyUserType.php:67-74`
- 🔴 O perfil é único para toda a rede, o que impede atribuir a um servidor-paper de professor em uma escola e de coordenador em outra, o que é o caso mais comum na prática. 🟢 `app/Models/LegacyUserSchool.php:9-15`
- 🔴 A autorização está acoplada ao identificador numérico da tela de menu, e não a um recurso de negócio, o que impede reutilizar a permissão em uma API nova sem duplicar o item de menu.
- 🔴 A negação de autorização é convertida em redirecionamento de volta, o que revela a existência da rota e não produz código 403 no registro de acesso. 🟢 `app/Http/Middleware/Authorize.php:24-27`
- 🔴 Não há segundo fator de autenticação, nem revogação de sessão, nem expiração de senha aplicada na entrada, apesar de os campos existirem.
- 🟡 O nome, o e-mail e a senha do usuário são atributos derivados por acessoors, o que faz uma consulta de usuário disparar consultas às tabelas pessoa, tipo e funcionário.
- 🟡 A credencial e o perfil estão em tabelas de esquemas distintos, o que impede uma consulta única de identidade e exige junção em qualquer verificação de acesso.
- 🟡 A matriz de permissões tem chave primária apenas pelo tipo de usuário, o que exige índice adicional para a busca por item de menu.
- 🟡 O histórico de acesso é consultado a cada cálculo de tempo sem acesso, o que torna a rotina de segurança dependente de uma tabela que cresce de forma contínua.
- 🟡 A busca de telas usa comparação com curinga em título e descrição, sobre a árvore completa de menus, o que é caro em bases com muitas telas.
