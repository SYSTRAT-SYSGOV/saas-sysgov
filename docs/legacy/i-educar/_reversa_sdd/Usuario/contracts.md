# Usuario (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de usuários, perfis e permissões. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de autenticação (legado)

| Elemento | Formato | Observação |
|----------|---------|------------|
| Identificador de login | Matrícula do funcionário, em `portal.funcionario.matricula` | 🟢 `app/Extensions/LegacyUserProvider.php:55-58` |
| Segredo | Senha em hash bcrypt, com fallback em MD5 | 🟢 `LegacyUserProvider.php:66-79` |
| Credencial secundária | E-mail, em `portal.funcionario.email` | 🟢 `app/User.php:41-44` |
| Token de sessão | `remember_token` do funcionário, com comparação por `hash_equals` | 🟢 `LegacyUserProvider.php:37-46` e `app/User.php:55-58` |

### Respostas de falha da autenticação 🟢 `app/Extensions/LegacyUserProvider.php:58-64`

| Situação | Mensagem |
|----------|----------|
| Conta inativa | O motivo registrado no cadastro do funcionário, ou a tradução `auth.inactive` |
| Senha inválida | Falha de validação do provedor, sem mensagem específica |

### Mensagens de negação de autorização 🟢

| Contexto | Mensagem | Fonte |
|---------|----------|-------|
| Middleware de autorização | `Você não tem permissão para acessar este recurso` | 🟢 `app/Http/Middleware/Authorize.php:25-27` |
| Fachada legada de permissões | Redirecionamento para a página indicada, sem mensagem | 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:44-46` |
| Sistema suspenso | Redirecionamento para `/intranet/suspenso.php` | 🟢 `app/Http/Middleware/Suspended.php:23` |

---

## 2. Contrato de persistência das entidades do módulo

| Tabela legada | Chave | Colunas relevantes | Fonte |
|---------------|-------|--------------------|-------|
| `pmieducar.usuario` | `cod_usuario` | instituição, autor do cadastro, autor da exclusão, tipo de usuário, data de cadastro, data de exclusão, ativo | 🟢 `app/Models/LegacyUser.php:16-24` |
| `portal.funcionario` | `ref_cod_pessoa_fj` | matrícula, senha, ativo, seção, ramal, sequencial, opção de menu, setor, vínculo, tempo de expiração de senha, tempo de expiração de conta, data de troca de senha, data de reativação, proibido, matrícula nova, matrícula permanente, tipo de menu, IP registrado, data de login, e-mail, token de situação, matrícula interna, receber novidades, atualizou cadastro, data de expiração | 🟢 `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php` |
| `pmieducar.tipo_usuario` | `cod_tipo_usuario` | nível, nome, descrição, autor do cadastro | 🟢 `app/Models/LegacyUserType.php:29-36` |
| `pmieducar.menu_tipo_usuario` | tipo de usuário, menu | `visualiza`, `cadastra`, `exclui` | 🟢 `app/Models/LegacyMenuUserType.php:13-19` |
| `pmieducar.escola_usuario` | usuário, escola | escola atual | 🟢 `app/Models/LegacyUserSchool.php:9-15` |
| `portal.acesso` | `cod_acesso` | data e hora, IP externo, IP interno, pessoa, observação, sucesso | 🟢 `app/Models/LegacyAccess.php:14-31` |
| `menus` | `id` | pai, título, descrição, link, ícone, ordem, tipo, identificador de processo, ativo | 🟢 `app/Menu.php:13-26` |
| `pmieducar.funcao` | `cod_funcao` | nome, abreviatura, marca de professor | 🟢 `app/Models/LegacyRole.php:18-25` |
| `pmieducar.servidor_funcao` | `cod_servidor_funcao` | matrícula, função, servidor, instituição | 🟢 `app/Models/LegacyEmployeeRole.php:11-16` |
| `public.school_managers` | — | `role_id` referencia o cargo de gestor | 🟢 `app/Models/ManagerRole.php:16-19` |

---

## 3. Contrato de domínio do nível de acesso

| Valor | Constante | Rótulo | Descrição acumulada | Fonte |
|-------|-----------|--------|---------------------|-------|
| 1 | `LEVEL_ADMIN` | Poli-institucional | Poli-institucional, Institucional, Escola, Biblioteca | 🟢 `app/Models/LegacyUserType.php:22` e `:87-96` |
| 2 | `LEVEL_INSTITUTIONAL` | Institucional | Institucional, Escola, Biblioteca | 🟢 `LegacyUserType.php:23` |
| 4 | `LEVEL_SCHOOLING` | Escola | Escola, Biblioteca | 🟢 `LegacyUserType.php:24` |
| 8 | `LEVEL_LIBRARY` | Biblioteca | Biblioteca | 🟢 `LegacyUserType.php:25` |

A descrição acumulada é o filtro das descrições cujo valor é maior ou igual ao nível do usuário. 🟢 `LegacyUserType.php:94`

---

## 4. Contrato de domínio do nível de ação

| Valor | Constante | Significado | Origem da flag |
|-------|-----------|-------------|----------------|
| 0 | — | Sem permissão | Nenhuma flag marcada 🟢 `app/Models/LegacyUserType.php:73` |
| 1 | `CAN_VIEW` | Visualizar | `visualiza` 🟢 `LegacyUserType.php:74-76` |
| 2 | `CAN_MODIFY` | Alterar | `cadastra` 🟢 `LegacyUserType.php:77-79` |
| 3 | `CAN_REMOVE` | Excluir | `exclui` 🟢 `LegacyUserType.php:80-82` |

A hierarquia é sobrescrita na ordem: Exclusion prevalece sobre alteração, e alteração prevalece sobre visualização. 🟢 `LegacyUserType.php:73-83`

---

## 5. Contrato do catálogo de processos

O sistema mantém um registro central dos identificadores de processo usados na autorização. 🟢 `app/Process.php:11-71`

| Constante | Valor | Recurso controlado |
|-----------|-------|--------------------|
| `MENU_PEOPLE` | 7 | Pessoas |
| `MENU_CONFIGURATIONS` | 25 | Configurações |
| `MENU_SCHOOL` | 55 | Escola |
| `MENU_LIBRARY` | 57 | Biblioteca |
| `SCHEDULE` | 59 | Quadro de horário |
| `REGISTRATION_ACTIONS` | 60 | Ações de matrícula |
| `MENU_ADDRESSING` | 68 | Endereçamento |
| `MENU_TRANSPORT` | 69 | Transporte |
| `MENU_EDUCACENSO` | 70 | Educacenso |
| `MENU_EMPLOYEES` | 71 | Servidores |
| `REGISTRATIONS` | 578 | Matrículas |
| `CANCEL_REGISTRATION` | 627 | Cancelamento de matrícula |
| `ENROLLMENT` | 683 | Enturmação |
| `RELOCATE` | 695 | Remanejamento |
| `UNENROLLMENT` | 696 | Desenturmação |
| `DATA_EXPORT` | 1022 | Exportação de dados |
| `SETTINGS` | 3000 | Configurações do sistema |
| `CONFIG` | 999873 | Configuração |

Os processos de configuração e de configurações são ocultos de todos os perfis que não sejam o administrador, na montagem do menu. 🟢 `app/Menu.php:111-118` e `:161-166`

---

## 6. Contrato de leitura da fachada legada de permissões

| Método | Entrada | Saída | Observação |
|--------|---------|-------|------------|
| `permissao_cadastra` | processo, usuário, nível, página de redirecionamento | `true`, `false` ou redirecionamento | Delega ao gate de alteração 🟢 `ieducar/intranet/include/pmieducar/clsPermissoes.inc.php:26-47` |
| `permissao_excluir` | processo, usuário, nível, página de redirecionamento | `true`, `false` ou redirecionamento | Delega ao gate de exclusão 🟢 `clsPermissoes.inc.php:63-84` |
| `nivel_acesso` | usuário | Nível ou `null` | `null` quando o usuário não existe 🟢 `clsPermissoes.inc.php:97-102` |
| `getInstituicao` | usuário | Instituição ou `null` | `null` quando não há vínculo 🟢 `clsPermissoes.inc.php:111-116` |
| `getEscolas` | usuário | Lista de escolas ou `false` | `false` quando não há vínculo 🟢 `clsPermissoes.inc.php:124-133` |
| `getBiblioteca` | usuário | Lista de bibliotecas ou `0` | Marcado como obsoleto 🟢 `clsPermissoes.inc.php:147-161` |

---

## 7. Contrato planejado para o modelo novo

Endpoints previstos em `_reversa_sdd/Usuario/legacy-mapping.md`, seção 4, a derivar do contrato legado acima:

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| POST | `/api/v1/auth/login` | autenticação por CPF e senha, com bloqueio por tentativas 🟢 `app/Extensions/LegacyUserProvider.php:53-80` |
| POST | `/api/v1/auth/mfa/verify` | verificação do segundo fator | Ausente no legado, previsto no modelo novo 🔴 |
| POST | `/api/v1/auth/logout` | revogação de sessão, ausente no legado 🔴 |
| GET | `/api/v1/users` | listagem paginada de usuários, com os escopos 🟡 |
| GET | `/api/v1/users/{id}` | detalhe do usuário, com papéis e escopos 🟡 |
| POST | `/api/v1/users` | criação de usuário 🟡 |
| PUT | `/api/v1/users/{id}` | atualização de dados e de situação 🟡 |
| POST | `/api/v1/users/{id}/disable` | bloqueio administrativo da conta 🟢 `app/User.php:171-178` |
| GET | `/api/v1/roles` | listagem de papéis funcionais 🟢 `app/Models/LegacyUserType.php` |
| POST | `/api/v1/roles` | criação de papel 🟢 `LegacyUserType.php` |
| GET | `/api/v1/permissions` | catálogo de permissões atômicas 🟢 `app/Models/LegacyMenuUserType.php` |
| PUT | `/api/v1/roles/{id}/permissions` | concessão e revogação de permissões 🟢 `LegacyUserType.php:56-65` |
| GET | `/api/v1/users/{id}/school-scopes` | escopos de lotação escolar 🟢 `app/Models/LegacyUserSchool.php` |
| POST | `/api/v1/users/{id}/school-scopes` | atribuição de papel por escola 🟢 `LegacyUserSchool.php` |
| DELETE | `/api/v1/users/{id}/school-scopes/{scopeId}` | revogação do escopo 🟢 `LegacyUserSchool.php` |
| GET | `/api/v1/auth/sessions` | histórico de autenticação 🟢 `app/Models/LegacyAccess.php` |
| GET | `/api/v1/navigation` | menu montado segundo as permissões 🟢 `app/Menu.php:216-222` |
