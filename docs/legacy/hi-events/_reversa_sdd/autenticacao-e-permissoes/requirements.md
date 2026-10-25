# Especificação de Requisitos: Autenticação e Permissões (`autenticacao-e-permissoes`)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  
**Status**: Aprovado  

---

## 1. Visão Geral

A unidade **Autenticação e Permissões** (`autenticacao-e-permissoes`) estabelece a infraestrutura de segurança, identidade e autorização da plataforma Hi.Events. Implementa um modelo de Controle de Acesso Baseado em Permissões (RBAC granular), autenticação via Laravel Sanctum / Sessões com proteção CSRF e SameSite configurável, isolamento estrito de inquilinos (`Account` e `Organizer`) e salvaguardas ativas contra abuso, injeção de HTML e disparos de spam.

---

## 2. Responsabilidades

- **Autenticação e Sessão de Usuário**: Autenticar credenciais com hash seguro, suportar segundo fator de autenticação (2FA) e gerenciar tokens Sanctum e cookies de sessão.
- **Autorização Granular (RBAC)**: Validar permissões atômicas (`Permission`) em rotas administrativas (`#[RequiresPermission]`) e componentes de UI (`useAccess`).
- **Bloqueio de Mutação de Somente-Leitura**: Interceptar e barrar requisições de escrita (`POST`, `PUT`, `DELETE`) de membros sem permissão `EDIT`, respondendo `HTTP 403 READ_ONLY_ROLE`.
- **Validação de Escopo Pai-Filho**: Garantir que todo identificador secundário em rotas (pedido, preço, produto, ingresso) pertença estritamente ao evento ou organizador autorizado.
- **Defesa Ativa contra Abuso e Spam**: Validar nomes de usuários via `PersonNameRule`, purificar conteúdo rico com `HtmlPurifierService` e isolar e-mails em `sandbox=""`.

---

## 3. Regras de Negócio e Invariantes

1. **Checagem de Permissões, Nunca de Papéis** 🟢:
   - Toda verificação de acesso deve inspecionar permissões atômicas (`Permission::...`), nunca strings de papéis (`me.role` ou `Role::ORGANIZER`).
2. **Guarda de Escrita para Membros de Somente Leitura** 🟢:
   - Qualquer requisição mutável (não-`GET`) feita por membro sem a permissão `EDIT` deve ser imediatamente rejeitada com `HTTP 403 (READ_ONLY_ROLE)`, exceto quando a ação for explicitamente anotada com `#[AllowedForReadOnlyUsers]`.
3. **Escopo Rígido de Entidades Filhas** 🟢:
   - Nenhum manipulador ou serviço pode executar leitura ou escrita em entidade filha sem antes verificar se o seu `event_id` ou `organizer_id` coincide com o contexto autorizado da rota, retornando 404/422 antes de qualquer efeito colateral.
4. **Higienização Anti-Spam Obrigatória** 🟢:
   - Conteúdo gerado por usuário que possa ser enviado por e-mail a terceiros não verificados não pode conter tags HTML ativas ou templates não purificados pelo `HtmlPurifierService`.

---

## 4. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|:---:|---|
| **RF-01** | Autenticação por e-mail/senha com suporte a 2FA | **Must** | Autenticar usuário, emitir token Sanctum e exigir confirmação TOTP se o 2FA estiver ativado (`two_factor_confirmed_at`). |
| **RF-02** | Imposição de permissão em endpoints de backend | **Must** | Bloquear acesso não autorizado com atributo `#[RequiresPermission]` ou chamada a `isActionAuthorized()`. |
| **RF-03** | Validação de escopo de entidades dependentes | **Must** | Retornar `HTTP 404` caso um `product_id` fornecido não pertença ao `event_id` informado na rota. |
| **RF-04** | Bloqueio automático de mutação para leitores | **Must** | Responder `HTTP 403 (READ_ONLY_ROLE)` em rotas POST/PUT/DELETE para membros com perfil de visualizador. |
| **RF-05** | Sanitização de nomes de participantes | **Must** | Validar nomes de pessoas via `PersonNameRule`, rejeitando URLs, scripts ou sequências maliciosas. |

---

## 5. Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|---|---|---|:---:|
| **Segurança** | Sanitização de HTML com `HtmlPurifierService` antes da persistência | `backend/app/Services/Security/HtmlPurifierService.php` | 🟢 CONFIRMADO |
| **Auditoria** | Rastreabilidade de concessão de acesso e logins suspeitos | `backend/app/Models/AccountUserAccessGrant.php` | 🟢 CONFIRMADO |
| **Isolamento** | Contexto multi-tenant sem vazamento entre contas distintas | `AccountUserAccessService` | 🟢 CONFIRMADO |
| **Defesa CSRF** | Políticas de SameSite configuráveis em cookies de autenticação | `backend/app/Http/Middleware/AuthCookieSameSite.php` | 🟢 CONFIRMADO |

---

## 6. Critérios de Aceitação (Gherkin)

```gherkin
Cenário: Usuário com perfil de leitura tenta criar novo lote de ingressos
  Dado que o usuário está autenticado na conta do organizador
  E possui permissões somente de leitura (sem a permissão EDIT)
  Quando envia uma requisição POST para /api/manage/events/10/products
  Então a requisição é interceptada pelo middleware de autorização
  E o sistema responde HTTP 403 Forbidden com código READ_ONLY_ROLE
  E nenhum produto é criado no banco de dados

Cenário: Tentativa de manipulação de ID fora do escopo do organizador
  Dado que o organizador autenticado possui acesso ao evento ID 10
  Quando tenta deletar o ingresso ID 99 associado ao evento ID 20 (pertencente a outro organizador)
  Então a verificação de escopo detecta a divergência
  E o sistema responde HTTP 404 Not Found antes de consultar ou alterar a linha
```

---

## 7. Priorização MoSCoW

| Requisito | MoSCoW | Justificativa |
|---|:---:|---|
| Autenticação segura e RBAC baseado em permissões | **Must** | Pilar estrutural de proteção do sistema e privacidade de dados. |
| Validação estrita de escopo pai-filho em rotas | **Must** | Impede vazamento ou manipulação de recursos entre contas distintas (IDOR). |
| Bloqueio automático de somente-leitura | **Must** | Garante integridade operacional de contas multi-membro. |
| Single Sign-On corporativo (OIDC / SAML) | **Could** | Recurso sob licença Enterprise para integração com diretórios corporativos. |

---

## 8. Rastreabilidade de Código 🟢

| Arquivo do Legado | Classe / Função | Cobertura |
|---|---|:---:|
| `backend/app/DomainObjects/Enums/Permission.php` | `Permission` (Enum) | 🟢 CONFIRMADO |
| `backend/app/Services/Access/AccountUserAccessService.php` | `AccountUserAccessService` | 🟢 CONFIRMADO |
| `backend/app/Http/Actions/BaseAction.php` | `BaseAction::isActionAuthorized` | 🟢 CONFIRMADO |
| `backend/app/Rules/PersonNameRule.php` | `PersonNameRule` | 🟢 CONFIRMADO |
| `backend/app/Services/Security/HtmlPurifierService.php` | `HtmlPurifierService` | 🟢 CONFIRMADO |
| `frontend/src/hooks/useAccess.ts` | `useAccess()` | 🟢 CONFIRMADO |
