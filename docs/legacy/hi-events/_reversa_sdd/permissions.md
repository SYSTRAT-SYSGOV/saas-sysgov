# Matriz de Papéis e Permissões (RBAC / Permissions)

**Projeto**: Hi.Events  
**Escala de Confiança**: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA  

---

## 1. Papéis do Sistema (`Role`) 🟢

1. **`SUPERADMIN`**: Administrador global da instalação. Acesso irrestrito a todas as contas, auditoria, configurações e suspensão de contas.
2. **`ADMIN`**: Administrador da conta / organização. Possui todas as permissões dentro do escopo da sua conta.
3. **`ORGANIZER`**: Gestor operacional de eventos. Permissão padrão de edição e gestão operacional, com restrições financeiras customizáveis.
4. **`VIEWER`**: Membro com acesso somente-leitura. Sem permissão de escrita ou criação.

---

## 2. Permissões Canônicas (`Permission`) 🟢

| Permissão | Identificador | Dependências Obrigatórias | Ajustável para Membro? |
|---|---|---|---|
| Edição Geral | `EDIT` | - | Não |
| Visualizar Dados Financeiros | `VIEW_FINANCIALS` | - | **Sim** |
| Realizar Reembolsos / Estornos | `ISSUE_REFUNDS` | `EDIT` + `VIEW_FINANCIALS` | **Sim** |
| Gerenciar Meios de Pagamento | `MANAGE_PAYMENTS` | `VIEW_FINANCIALS` | Não |
| Deletar Eventos | `DELETE_EVENTS` | - | Não |
| Gerenciar Equipe | `MANAGE_TEAM` | - | Não |
| Gerenciar Conta | `MANAGE_ACCOUNT` | - | Não |

---

## 3. Matriz Padrão de Permissões por Papel 🟢

| Permissão | SUPERADMIN | ADMIN | ORGANIZER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| `EDIT` | ✅ | ✅ | ✅ | ❌ |
| `VIEW_FINANCIALS` | ✅ | ✅ | ✅ *(customizável)* | ❌ *(customizável)* |
| `ISSUE_REFUNDS` | ✅ | ✅ | ✅ *(customizável)* | ❌ *(customizável)* |
| `MANAGE_PAYMENTS` | ✅ | ✅ | ❌ | ❌ |
| `DELETE_EVENTS` | ✅ | ✅ | ❌ | ❌ |
| `MANAGE_TEAM` | ✅ | ✅ | ❌ | ❌ |
| `MANAGE_ACCOUNT` | ✅ | ✅ | ❌ | ❌ |

---

## 4. Regras de Imposição e Guarda (Security Enforcement) 🟢

- **Backend Enforcement**: Qualquer ação HTTP que não seja `GET` exige autorização explícita (`#[RequiresPermission]`, `isActionAuthorized`). Usuários sem `EDIT` recebem `HTTP 403 (READ_ONLY_ROLE)` automaticamente, a menos que a rota contenha `#[AllowedForReadOnlyUsers]`.
- **Frontend Enforcement**: Controles de mutação são encapsulados por `<WriteAccess>`, `<CreateButton>` e itens de menu com `requiresEdit: true`. Verificações usam o hook `useAccess()`, nunca comparando a string do papel (`me.role`).
