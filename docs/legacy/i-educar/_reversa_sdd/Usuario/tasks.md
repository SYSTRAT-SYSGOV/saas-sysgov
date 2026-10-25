# Usuario (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de usuários, perfis e permissões a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: pessoa, funcionário do portal, perfil de acesso, matriz de permissões, árvore de menus, lotação escolar, instituição, registro de acesso, servidor e gestores escolares.
- [ ] Schema e migrations do banco compatíveis com as tabelas `core_users`, `core_roles`, `core_permissions`, `core_role_permissions` e `educa_user_school_scopes` descritas em `_reversa_sdd/Usuario/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Catálogo de permissões atômicas construído no padrão `recurso.subrecurso.acao`, e de/para com os identificadores de processo do legado.
- [ ] Catálogo de papéis funcionais definido, com nome, slug, nível hierárquico e escopo de atuação.
- [ ] Contrato do pacote `@sysgov/sdk` definido para usuário, papel, permissão e escopo escolar.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar o usuário central, com tenant, identificador, vínculo com a pessoa, CPF, nome, e-mail, telefone, hash de senha e situação
  - Origem no legado: `app/Models/LegacyUser.php:16-24` e `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php`
  - Critério de pronto: tabela `core_users` criada, com unicidade por tenant e por CPF e por e-mail, e teste de recusa de duplicidade
  - Confiança: 🟡

- [ ] T-02, Modelar o papel funcional, com nome, slug, descrição, nível hierárquico, escopo de atuação e marca de padrão do sistema
  - Origem no legado: `app/Models/LegacyUserType.php:29-36` e `app/Models/LegacyRole.php:18-25`
  - Critério de pronto: tabela `core_roles` criada, com unicidade por tenant e por slug, e teste de recusa de slug duplicado
  - Confiança: 🟡

- [ ] T-03, Modelar a permissão atômica, com módulo, ação, slug, nome e descrição
  - Origem no legado: `app/Models/LegacyMenuUserType.php:13-19` e `app/Process.php:11-71`
  - Critério de pronto: tabela `core_permissions` criada, com o catálogo populado e o de/para com os identificadores de processo do legado
  - Confiança: 🟡

- [ ] T-04, Modelar a matriz de vínculo entre papel e permissão, com a autoria e a data da concessão
  - Origem no legado: `app/Models/LegacyUserType.php:56-65`
  - Critério de pronto: tabela `core_role_permissions` criada, com unicidade por tenant, por papel e por permissão
  - Confiança: 🟡

- [ ] T-05, Modelar o escopo de lotação escolar, com papel por escola, marcação de principal, situação e vigência
  - Origem no legado: `app/Models/LegacyUserSchool.php:9-15`, que tem escola mas não tem papel
  - Critério de pronto: tabela `educa_user_school_scopes` criada, com unicidade por tenant, por usuário, por escola e por papel
  - Confiança: 🟡

- [ ] T-06, Implementar a autenticação por CPF e senha, com verificação de conta bloqueada e de situação cadastral
  - Origem no legado: `app/Extensions/LegacyUserProvider.php:53-73`
  - Critério de pronto: a autenticação recusa a conta bloqueada e a conta inativa, com mensagem específica
  - Confiança: 🟡

- [ ] T-07, Implementar a conversão do hash MD5 legado para o hash moderno, no primeiro acesso bem-sucedido
  - Origem no legado: `app/Extensions/LegacyUserProvider.php:74-80`
  - Critério de pronto: a senha em MD5 autentica e é regravada com Argon2id, com teste de verificação do hash após a conversão
  - Confiança: 🟢

- [ ] T-08, Implementar o bloqueio temporário por excesso de tentativas, com contador e janela
  - Origem no legado: ausência de bloqueio no legado, evidenciada por `app/Extensions/LegacyUserProvider.php:61-73`
  - Critério de pronto: a quinta falha consecutiva bloqueia a conta pelo tempo configurado, com a mensagem do tempo restante
  - Confiança: 🟡

- [ ] T-09, Implementar o registro de autenticação, com data, hora, endereço, usuário, método e sucesso
  - Origem no legado: `app/Models/LegacyAccess.php:14-31`
  - Critério de pronto: a tentativa malsucedida é registrada com sucesso falso, e a bem-sucedida com sucesso verdadeiro
  - Confiança: 🟢

- [ ] T-10, Implementar a revogação imediata de sessão, por invalidação do token e do cache de usuário
  - Origem no legado: ausência de revogação no legado, evidenciada por `app/Helpers/UserCache.php:11-13`
  - Critério de pronto: o bloqueio da conta invalida as sessões abertas, com teste de sessão revogada
  - Confiança: 🟡

- [ ] T-11, Implementar a verificação de permissão por recurso e ação, com o escopo escolar opcional
  - Origem no legado: `app/Policies/ProcessPolicy.php:12-46`
  - Critério de pronto: a verificação considera o papel global, o escopo escolar ativo e a vigência, com cache curto
  - Confiança: 🟡

- [ ] T-12, Implementar a concessão e a revogação de permissão a um papel, com invalidação do cache
  - Origem no legado: ausência de concessão dinâmica no legado, evidenciada por `app/Models/LegacyUserType.php:56-65`
  - Critério de pronto: a concessão invalida o cache do tenant e a revogação remove o vínculo, com teste de efeito imediato
  - Confiança: 🟡

- [ ] T-13, Implementar a leitura dos escopos autorizados no token de sessão
  - Origem no legado: `app/User.php:154-162` e `app/Models/LegacyUserSchool.php:9-15`
  - Critério de pronto: o token carrega os escopos ativos, com escola, papel e marcação de principal
  - Confiança: 🟡

- [ ] T-14, Implementar a negociação da matriz de permissão a partir dos identificadores de processo do legado
  - Origem no legado: `app/Process.php:11-71` e `app/Models/LegacyMenuUserType.php:13-19`
  - Critério de pronto: cada processo do legado é mapeado para um ou mais slugs de permissão, e a migração produz o relatório de processos sem mapeamento
  - Confiança: 🟡

- [ ] T-15, Implementar a montagem do menu por escopo e por permissão, desacoplada dos itens de menu do legado
  - Origem no legado: `app/Menu.php:26-46` e `:140-176` e `:216-222`
  - Critério de pronto: o menu é montado a partir das permissões concedidas, e as telas de configuração ficam restritas ao administrador
  - Confiança: 🟡

- [ ] T-16, Implementar a busca de telas com limite de resultados, por título e por descrição
  - Origem no legado: `app/Menu.php:224-240`
  - Critério de pronto: a busca é limitada a quinze resultados e usa índice, e não varredura da árvore completa
  - Confiança: 🟡

- [ ] T-17, Implementar a verificação de situação da conta, com inatividade, expiração e início de vigência
  - Origem no legado: `app/User.php:127-151`
  - Critério de pronto: a autenticação recusa a conta inativa, a expirada e a que ainda não começou, com mensagem específica para cada caso
  - Confiança: 🟢

- [ ] T-18, Implementar o bloqueio administrativo da conta, com expiração imediata
  - Origem no legado: `app/User.php:171-178`
  - Critério de pronto: a conta é expirada no momento e desativada nos dois níveis, e as sessões são revogadas
  - Confiança: 🟢

- [ ] T-19, Implementar a aplicação da expiração de senha e de conta no momento da autenticação
  - Origem no legado: campos existentes sem aplicação localizada, evidenciados por `database/migrations/legacy/2020_01_01_110000_create_portal_funcionario_table.php`
  - Critério de pronto: a conta fora da janela é bloqueada na entrada, com a opção de redefinição
  - Confiança: 🟡

- [ ] T-20, Implementar o segundo fator de autenticação, com TOTP e segredo criptografado
  - Origem no legado: ausência de MFA no legado, evidenciada por `app/Models/LegacyUser.php:16-24`
  - Critério de pronto: o usuário com MFA habilitado recebe o desafio, e o ticket expira em cinco minutos
  - Confiança: 🟡

- [ ] T-21, Implementar a autenticação federada com o Gov.br, por OIDC
  - Origem no legado: `app/Providers/AuthServiceProvider.php:17-20` e `:47-51`, que registra apenas um provedor OAuth2 próprio
  - Critério de pronto: o usuário com identificador federado é vinculado pelo identificador da pessoa, com unicidade por tenant
  - Confiança: 🟡

- [ ] T-22, Implementar a auditoria de concessão e de revogação de permissão, com a autoria
  - Origem no legado: ausência de auditoria no legado, evidenciada por `app/Models/LegacyUserType.php:56-65`
  - Critério de pronto: toda concessão e revogação gera registro com ator, instante, papel e permissão
  - Confiança: 🟡

- [ ] T-23, Implementar a API de administração de usuários, de papéis, de permissões e de escopos
  - Origem no legado: ausência de API de usuário no legado, evidenciada por `app/Process.php:11-71`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-24, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/LegacyUserType.php:29-36` e `app/Models/LegacyUserSchool.php:9-15`
  - Critério de pronto: tipos `CoreUser`, `CoreRole`, `CorePermission`, `UserSchoolScope` e `AuthSessionResponse` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de autenticação e autorização (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: conta inativa com motivo registrado
- [ ] TT-03, Teste da autenticação com senha em MD5 e da conversão do hash
- [ ] TT-04, Teste da recusa de conta expirada e de conta ainda não iniciada
- [ ] TT-05, Teste do bloqueio por excesso de tentativas, com a contagem e a janela
- [ ] TT-06, Teste da revogação de sessão após o bloqueio da conta
- [ ] TT-07, Teste da verificação de permissão com papel global e com escopo escolar
- [ ] TT-08, Teste da verificação de permissão fora da vigência do escopo
- [ ] TT-09, Teste da concessão e da revogação de permissão, com invalidação do cache
- [ ] TT-10, Teste do menu por escopo, com a restrição das telas de configuração
- [ ] TT-11, Teste da montagem do token de sessão com os escopos autorizados
- [ ] TT-12, Teste do de/para dos processos do legado com os slugs de permissão, incluindo o relatório de processos sem mapeamento
- [ ] TT-13, Teste da expiração de senha aplicada na autenticação
- [ ] TT-14, Teste do desafio de MFA, com a expiração do ticket
- [ ] TT-15, Teste de isolamento por tenant em todas as listagens, vínculos e consultas de permissão
- [ ] TT-16, Teste de negação de autorização com resposta 403, e não com redirecionamento

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar os usuários de `pmieducar.usuario` para `core_users`, com a unificação da matrícula e do e-mail do portal
- [ ] TM-02, Rehashear as senhas dos usuários migrados, forçando a troca ou exigindo a redefinição no primeiro acesso
- [ ] TM-03, Migrar os tipos de usuário de `pmieducar.tipo_usuario` para `core_roles`, com atribuição de slug, de nível e de escopo
- [ ] TM-04, Migrar a matriz de `pmieducar.menu_tipo_usuario` para `core_role_permissions`, por meio do de/para de processos para slugs
- [ ] TM-05, Migrar a lotação de `pmieducar.escola_usuario` para `educa_user_school_scopes`, com o papel único do usuário atribuído a todos os vínculos
- [ ] TM-06, Migrar o histórico de acesso de `portal.acesso` para o log de auditoria de autenticação, com a retenção definida
- [ ] TM-07, Migrar as funções de `pmieducar.funcao` e `pmieducar.servidor_funcao` para o catálogo de papéis funcionais
- [ ] TM-08, Migrar os cargos de gestor de `public.school_managers.role_id` para o catálogo de papéis de gestor
- [ ] TM-09, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-10, Gerar o relatório de processos do legado sem permissão mapeada, para completude da matriz

---

## Ordem Sugerida

1. T-01, T-02, T-03 e T-04 primeiro, porque definem o esquema de identidade, de papéis e de permissões.
2. T-05 logo após, porque o escopo escolar é o que dá contexto à permissão.
3. T-06, T-07, T-17 e T-18 em seguida, porque são o núcleo da autenticação e da situação da conta.
4. T-08, T-09 e T-10 depois, porque adicionam a proteção contra força bruta e a auditoria de acesso.
5. T-11, T-12 e T-13 logo após, porque são o núcleo da autorização.
6. T-14 e T-16 em seguida, porque o de/para e a busca de telas operam sobre o catálogo de permissões.
7. T-15 depois, porque o menu depende da autorização já implementada.
8. T-19, T-20 e T-21 no fim, porque são requisitos novos, ausentes no legado.
9. T-22, T-23 e T-24 em seguida, porque adicionam auditoria, contrato e API.
10. TM-01 a TM-10 somente depois de T-23 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
11. Bloqueios: T-02 e T-03 dependem de T-01; T-04 depende de T-02 e T-03; T-05 depende de T-01 e T-02; T-06 depende de T-01; T-09 depende de T-01; T-11 depende de T-04 e T-05; T-12 depende de T-04; T-13 depende de T-05; T-14 depende de T-03; T-15 depende de T-11; T-20 depende de T-01; T-21 depende de T-01; T-22 depende de T-12; T-23 depende de T-01 e T-02.

---

## Lacunas Pendentes (🔴)

- O modelo de autorização é acoplado ao identificador numérico da tela de menu, e não a um recurso de negócio. Antes de migrar, é preciso decidir o de/para entre os 60 processos catalogados em `app/Process.php` e os slugs atômicos de permissão, e o que se faz com os processos sem tela correspondente.
- O gate de visualização do legado é liberado pela existência de um item de menu de raiz com o mesmo processo. É preciso definir se essa liberação é intencional no modelo novo, porque ela amplia a exposição do usuário.
- O cache de usuário de doze horas mantém em sessão uma conta bloqueada. É preciso definir a janela de revogação aceitável e o mecanismo de invalidação.
- Não há proteção contra força bruta no legado. É preciso definir o número de tentativas, a janela de bloqueio e o comportamento do administrador diante de uma conta legítima bloqueada.
- O perfil é único para toda a rede. É preciso decidir como o modelo novo comporta o caso mais comum da prática, que é o servidor com papel diferente em cada escola.
- A negação de autorização vira redirecionamento, e não resposta 403, e não produz registro de acesso. É preciso definir o contrato de erro e o que é auditado.
- Não há segundo fator nem identidade federada no legado. É preciso definir o processo de adoção do Gov.br e o plano de migração das contas existentes.
- A expiração de senha e de conta tem campos no legado, mas a aplicação na entrada não foi localizada. É preciso confirmar se a expiração é aplicada em outro ponto do código.
- O nome, o e-mail e a senha do usuário são atributos derivados por acessoors, e a credencial vive em outro esquema do banco. É preciso decidir a consolidate no modelo novo e o plano de rehasheagem das senhas.
- O histórico de acesso cresce de forma contínua e é consultado a cada cálculo de tempo sem acesso. É preciso definir a retenção e a arquivagem.
- A matriz de permissões tem chave primária apenas pelo tipo de usuário. É preciso definir a chave da nova tabela e o impacto sobre as consultas por item de menu.
- Não há auditoria de concessão e de revogação de permissão, nem de escalonamento de privilégio. É preciso definir o que é retido e por quanto tempo.
