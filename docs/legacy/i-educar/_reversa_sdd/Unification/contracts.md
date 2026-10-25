# Contratos — Unification (i-Educar legado)

> Especificação formal dos contratos de tela, endpoints HTTP, validações, persistência, eventos de domínio, contratos canônicos SYSGOV e enumerados.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contratos de Tela (UI / Formulários Web)

### Tela de Unificação de Alunos (`unification.student.index`, `unification.student.show`)

- `main_id`: Inteiro, identificador do aluno principal (que permanecerá ativo e agregará os dados).
- `duplicates_id[]`: Array de inteiros, identificadores dos alunos duplicados (que serão desativados).
- `justificativa`: Texto obrigatório, justificativa administrativa da fusão cadastral.
- Botão "Desfazer Unificação" (`undo`): Submete requisição POST para a rota de desfazimento quando o registro possui `active = true`.

### Tela de Unificação de Pessoas (`unification.person.index`, `unification.person.show`)

- `codigo_unificador`: Inteiro, `idpes` da pessoa física que manterá a identidade civil primária.
- `codigos_duplicados[]`: Array de inteiros, lista de `idpes` que serão mesclados na principal.
- Exibição de histórico tabular detalhando campos que sofreram mutação em cada tabela relacionada.

---

## 2. Contratos de APIs REST / JSON

### `GET /module/Api/Pessoa?dadosUnificacaoPessoa`

**Request Query Parameters:**
```json
{
  "pessoas_ids": [101, 102]
}
```

**Response Payload (200 OK):**
```json
{
  "pessoas": [
    {
      "idpes": 101,
      "nome": "João da Silva",
      "cpf": "111.222.333-44",
      "data_nasc": "2012-05-10",
      "nome_mae": "Maria da Silva",
      "possui_aluno_ativo": 1,
      "possui_servidor": 0
    },
    {
      "idpes": 102,
      "nome": "Joao da Silva",
      "cpf": null,
      "data_nasc": "2012-05-10",
      "nome_mae": "Maria da Silva",
      "possui_aluno_ativo": 0,
      "possui_servidor": 0
    }
  ]
}
```

### `POST /unificacao-aluno/{unification}/desfazer`

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded
X-CSRF-TOKEN: <token>
```

**Response (Redirect 302 com Flash Message):**
- **Sucesso:** Redirecionamento para a tela de visualização com mensagem: *"Unificação desfeita com sucesso."*
- **Erro (Ex.: Sem Permissão):** Redirecionamento com mensagem: *"Você não possui permissão para desfazer esta unificação."*
- **Erro (Já Inativa):** Mensagem: *"Esta unificação já foi desfeita anteriormente."*

---

## 3. Regras de Validação

- `MultipleActiveStudentsValidator`: Verifica se `COUNT(*) > 1` para alunos ativos associados às pessoas selecionadas; se verdadeiro, lança exceção impeditiva.
- `UndoPermissionValidator`: Valida se o usuário autenticado pertence à mesma escola do usuário criador ou possui nível de acesso institucional (nível 1 ou 2).
- `UnificationActiveValidator`: Garante que o atributo `active` em `log_unificacao` seja verdadeiro antes de autorizar qualquer operação de rollback.
- `MainRecordExistsValidator`: Verifica se o aluno ou pessoa mestre continua existindo no banco de dados.

---

## 4. Contratos de Persistência (DDL / Tabelas Legadas)

```sql
-- pmieducar.log_unificacao
CREATE TABLE pmieducar.log_unificacao (
    id SERIAL PRIMARY KEY,
    main_id INT NOT NULL,
    duplicates_id TEXT NOT NULL,
    duplicates_name TEXT,
    type VARCHAR(255) NOT NULL, -- 'App\Models\Student' ou 'App\Models\Individual'
    created_by INT REFERENCES pmieducar.usuario(cod_usuario),
    updated_by INT REFERENCES pmieducar.usuario(cod_usuario),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

-- pmieducar.log_unificacao_old_data
CREATE TABLE pmieducar.log_unificacao_old_data (
    id SERIAL PRIMARY KEY,
    unification_id INT NOT NULL REFERENCES pmieducar.log_unificacao(id) ON DELETE CASCADE,
    "table" VARCHAR(255) NOT NULL,
    keys TEXT NOT NULL,     -- JSON serializado
    old_data TEXT NOT NULL  -- JSON serializado
);
```

---

## 5. Eventos de Domínio

- `StudentUnified`: Emitido após a conclusão transacional da unificação de aluno. 🟡
- `StudentUnificationReverted`: Emitido após o sucesso da operação de rollback da unificação de aluno. 🟡
- `PersonUnified`: Emitido quando dois registros civis de pessoas físicas são fundidos no sistema. 🟡

---

## 6. Contratos Planejados para o Modelo Novo (SYSGOV / TypeScript)

```typescript
export interface PersonUnificationPayload {
  tenantId: string;
  masterPersonId: string; // UUID v7
  duplicatePersonIds: string[]; // UUIDs v7
  reason: string;
  actorUserId: string;
}

export interface StudentUnificationPayload {
  tenantId: string;
  masterStudentId: string; // UUID v7
  duplicateStudentIds: string[]; // UUIDs v7
  reason: string;
  actorUserId: string;
}

export interface UnificationLogEntry {
  id: string; // UUID v7
  tenantId: string;
  targetType: 'PERSON' | 'STUDENT' | 'EMPLOYEE';
  masterId: string;
  mergedIds: string[];
  snapshotDiff: Record<string, any>; // JSON com before_state e after_state
  performedByUserId: string;
  revertedByUserId: string | null;
  active: boolean;
  createdAt: string;
  revertedAt: string | null;
}
```

---

## 7. Enumerados com Fonte

### Tipo Polimórfico de Unificação (`type` em `pmieducar.log_unificacao`)
- `App\Models\Student`: Unificação de registros escolares de alunos (`pmieducar.aluno`).
- `App\Models\Individual`: Unificação de pessoas físicas civis (`cadastro.fisica` / `cadastro.pessoa`).

### Status de Unificação
- `true` (`1`): Unificação ativa e vigente no banco de dados.
- `false` (`0`): Unificação desfeita administrativamente via operação de rollback.
