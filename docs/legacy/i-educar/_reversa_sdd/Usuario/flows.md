# Usuario (i-Educar legado), Fluxos

> Fluxos da unit de usuários, perfis e permissões que não cabem no `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de autenticação

**Gatilho:** o usuário informa matrícula e senha na tela de login.

1. O provedor legado busca o usuário pela matrícula do funcionário, com a pessoa, o tipo e o funcionário carregados em cache de doze horas. 🟢 `app/Extensions/LegacyUserProvider.php:53-58` e `app/Helpers/UserCache.php:11-20`
2. A conta inativa é rejeitada, com o motivo registrado no cadastro do funcionário. 🟢 `LegacyUserProvider.php:58-64`
3. A senha é validada pelo hash moderno. 🟢 `LegacyUserProvider.php:66-71`
4. Em caso de reprovação, a senha é comparada com o MD5 legado. 🟢 `LegacyUserProvider.php:72-79`
5. Quando a senha é MD5 e confere, o hash é reconvertido para o formato moderno e gravado no portal. 🟢 `LegacyUserProvider.php:74-79`
6. O acesso é concedido e a sessão é iniciada. 🟢 `LegacyUserProvider.php:66-72`

---

## 2. Fluxo de verificação de permissão

**Gatilho:** uma rota protegida é acessada.

1. O middleware de autorização obtém os argumentos do gate a partir da requisição. 🟢 `app/Http/Middleware/Authorize.php:21-24`
2. O gate é acionado com a habilidade `view`, `modify` ou `remove`. 🟢 `app/Providers/AuthServiceProvider.php:32-35`
3. O gate de administrador é avaliado antes de tudo, e o administrador recebe `true` para qualquer habilidade. 🟢 `AuthServiceProvider.php:27-34`
4. Para `view`, se existe um item de menu de raiz com o mesmo identificador de processo, o acesso é liberado. 🟢 `app/Policies/ProcessPolicy.php:16-22`
5. Caso contrário, a verificação consulta a matriz de permissões do usuário pelo identificador do processo. 🟢 `ProcessPolicy.php:23-26`
6. Para `modify` e `remove`, a verificação é exclusivamente pela matriz. 🟢 `ProcessPolicy.php:28-46`
7. Quando a permissão é negada, a exceção é capturada e o usuário é redirecionado de volta, com a mensagem de falta de permissão. 🟢 `app/Http/Middleware/Authorize.php:24-27`

---

## 3. Fluxo da fachada legada de permissão

**Gatilho:** uma tela legada verifica a permissão antes de executar a operação.

1. A tela chama a fachada de permissões com o identificador de processo, o usuário e a página de redirecionamento. 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:26-33`
2. A fachada delega ao gate de alteração. 🟢 `clsPermissoes.inc.php:34`
3. Quando o gate concede, a fachada devolve verdadeiro. 🟢 `clsPermissoes.inc.php:36-38`
4. Quando o gate nega e há página de redirecionamento, a fachada lança uma exceção de resposta com o redirecionamento. 🟢 `clsPermissoes.inc.php:40-47`
5. Quando o gate nega e não há página de redirecionamento, a fachada devolve falso. 🟢 `clsPermissoes.inc.php:40-42`

---

## 4. Fluxo de montagem do menu

**Gatilho:** o usuário entra no sistema.

1. Se o usuário é administrador, a árvore completa de menus é devolvida. 🟢 `app/Menu.php:216-219`
2. Caso contrário, a árvore é filtrada pela consulta recursiva, que aceita os itens sem processo e os itens cujo tipo de usuário está na matriz. 🟢 `app/Menu.php:26-46`
3. Os processos de configuração e de configurações são excluídos da árvore de todos os perfis não administrativos. 🟢 `app/Menu.php:37-44`
4. A árvore é materializada e ordenada pela ordem de exibição. 🟢 `app/Menu.php:45-46`
5. Ao percorrer a árvore, o método de processos monta a lista de telas, com o nível de ação obtido do gate. 🟢 `app/Menu.php:140-176`

---

## 5. Fluxo de bloqueio administrativo da conta

**Gatilho:** o administrador bloqueia o acesso de um usuário.

1. A data de expiração da conta é gravada com o momento atual. 🟢 `app/User.php:172`
2. A atividade do funcionário é desligada. 🟢 `app/User.php:173`
3. A atividade do usuário é desligada. 🟢 `app/User.php:174`
4. As duas alterações são persistidas. 🟢 `app/User.php:175`
5. A sessão em cache permanece válida por até doze horas, e a conta bloqueada ainda pode ser usada dentro dessa janela. 🟢 `app/Helpers/UserCache.php:11-13`

---

## 6. Fluxo de sistema suspenso

**Gatilho:** qualquer requisição chega ao middleware de suspensão.

1. A configuração de operação com o i-Educar é consultada. 🟢 `app/Http/Middleware/Suspended.php:16`
2. O nível de acesso da sessão é lido. 🟢 `Suspended.php:17`
3. Quando a operação está ativa, ou o nível da sessão é o de administrador, ou o usuário é administrador, a requisição prossegue. 🟢 `Suspended.php:18`
4. Caso contrário, o usuário é redirecionado para a tela de sistema suspenso. 🟢 `Suspended.php:23`

---

## 7. Fluxo de resolução dos processos do perfil

**Gatilho:** o sistema precisa saber o que o perfil pode fazer.

1. Se o perfil é de nível poli-institucional, todos os itens de menu são devolvidos com o nível de ação máximo. 🟢 `app/Models/LegacyUserType.php:67-74`
2. Caso contrário, a matriz de permissões do perfil é consultada, com as três flags no pivô. 🟢 `LegacyUserType.php:75-76`
3. Para cada item, o nível de ação é calculado: um quando a visualização está marcada, dois quando a alteração está marcada, três quando a exclusão está marcada, e zero quando nenhuma está. 🟢 `LegacyUserType.php:77-83`

---

## 8. Fluxo de cálculo do tempo de conta

**Gatilho:** o sistema exibe há quantos dias o usuário não acessa e há quantos dias a senha não é trocada.

1. O registro de acesso mais recente é consultado, e, na ausência dele, a data de criação do usuário é usada. 🟢 `app/User.php:162-176`
2. A data de habilitação da conta é comparada, e a maior das duas datas é adotada como referência. 🟢 `app/User.php:178-186`
3. A diferença em dias é calculada contra o momento atual. 🟢 `app/User.php:187-192`
4. O mesmo procedimento é aplicado à data da última troca de senha. 🟢 `app/User.php:198-211`

---

## 9. Fluxos ausentes no legado

Os fluxos abaixo aparecem no desenho do modelo novo, em `_reversa_sdd/Usuario/legacy-mapping.md`, e não têm implementação correspondente no código lido. Devem ser tratados como requisito novo, e não como reimplementação. 🔴

- Bloqueio temporário da conta por excesso de tentativas, com contador e janela. 🔴
- Segundo fator de autenticação, com desafio e expiração do ticket. 🔴
- Autenticação federada com o Gov.br, por OIDC. 🔴
- Revogação imediata de sessão, por invalidação de token e de cache. 🔴
- Papel contextualizado por escola, com vigência e revogação. 🔴
- Concessão e revogação dinâmica de permissões a um papel. 🔴
- Auditoria de concessão, de revogação e de escalonamento de privilégio. 🔴
- Aplicação da expiração de senha no momento da autenticação. 🔴
- Relatório de processos do legado sem permissão mapeada. 🔴
- Rehash forçado das senhas migradas, com redefinição no primeiro acesso. 🔴
