# Domínio de Negócio — Sistema de Gestão de Cemitérios

> Gerado pelo Detetive em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md` (Arqueólogo) e leitura direta dos scripts de extração/importação. Sem histórico Git disponível neste projeto (pasta não é repositório) — as decisões abaixo foram reconstruídas a partir de evidência de código, não de commits.

## Glossário

| Termo | Significado |
|---|---|
| **Cemitério** | Unidade operacional isolada. Duas instâncias fixas no legado: `01` Central, `02` Independência. 🟢 |
| **Quadra** | Subdivisão de um cemitério; agrupa lotes. 🟢 |
| **Lote** (também "jazigo") | Unidade de sepultamento dentro de uma quadra. Tem um `tipo` (comum/perpétuo) e uma capacidade fixa de `gavetas`. 🟢 |
| **Gaveta** | Posição individual de sepultamento dentro de um lote; a ocupação é rastreada por `item_ordem` sequencial. 🟢 |
| **Falecido** (registro de sepultamento) | No legado, o nome da tabela `DADOS.DBF`/`FALECIDO.DBF` é ambíguo: `DADOS` contém os dados completos do óbito, `FALECIDO` é só um índice de lotes ocupados. 🟢 |
| **Responsável / Concessionário** | Pessoa (viva ou falecida) titular da concessão de um lote; não é necessariamente parente do falecido sepultado. 🟢 |
| **Coveiro** (`FUNCIONA.DBF`) / **Pedreiro** (`PEDREIRO.DBF`) | Profissionais registrados por sepultamento; cadastro é **por cemitério**, não compartilhado. 🟢 |
| **FLAG_EXCL** | Marcador de exclusão lógica (`'*'`) usado pela aplicação legada em `DADOS`/`RESPONSA` — distinto do flag de exclusão física do próprio arquivo DBF (byte `0x2A` no registro). Ver nota em `code-analysis.md`, módulo `extracao-dbf`. 🟢 |
| **OBA** | Numeração alternativa de quadra/lote, existente **apenas** no cemitério Independência. Propósito exato não documentado. 🔴 LACUNA |
| **TTT** | Histórico de validade de concessão, existente **apenas** no cemitério Independência. 🟢 (estrutura confirmada) / 🔴 (motivo de ser exclusivo de uma unidade) |
| **PW_NIVEL** | Nível de acesso do usuário no módulo de segurança (`1`=Administrador, `2`=Operador, `3`=Consultor). 🟢 |
| **SYSGOV** | Nome de trabalho usado nos artefatos de migração para o sistema alvo (multi-tenant). 🟡 INFERIDO — não há confirmação de que este é o nome definitivo do produto. |

## Regras de Negócio Críticas

### RN001 — Unicidade de sepultamento por posição 🟢
Um lote não pode ter dois falecidos no mesmo `item_ordem` (mesma gaveta).
**Validação:** `UNIQUE(lote_id, item_ordem)` em `falecido`.

### RN002 — Capacidade máxima por lote 🟡
Número de sepultamentos ativos deve ser ≤ `gavetas` do lote.
**Observação:** essa validação não está confirmada como enforced no importador (é regra inferida do modelo de dados, não vista como checagem explícita no código lido); pode ser regra de aplicação, não de banco.

### RN003 — Coveiro e pedreiro nominalmente obrigatórios 🟡
Todo sepultamento tem `COD_FUNC`/`COD_PED` preenchidos nos dados observados, com código `1`/`IGNORADO` como fallback para casos sem identificação. Não é uma constraint declarada — é um padrão observado nos dados.

### RN004 — Isolamento por cemitério (multi-tenancy real, mas incompleto no alvo) 🟢 / 🔴
Os dados dos dois cemitérios são fisicamente separados no legado (pastas distintas, bases de segurança independentes — ver `permissions.md`). **Achado crítico:** o schema alvo não preserva esse isolamento para `funcionario`, `pedreiro` e `usuario` (tabelas globais sem `cemiterio_id`), causando colisão de códigos entre unidades. Detalhado em `permissions.md` e no ADR 0004.

### RN005 — Exclusão lógica (soft delete) 🟢
Registros de negócio não são fisicamente removidos; `FLAG_EXCL='*'` marca exclusão. A importação filtra esses registros (não os migra). Ver ADR 0003.

### RN006 — Datas especiais 🟢
`'1111-11-11'` e `'0000-00-00'` representam "data desconhecida/inexistente" no legado → convertidas para `NULL` no schema relacional. Campos afetados: nascimento, falecimento, emissão de certidão, validade de concessão.

### RN007 — Responsável falecido (tag embutida no nome) 🟢
Quando o nome do responsável contém a substring `[FALECIDO]` (case-insensitive), o concessionário morreu; o sistema não tem um campo estruturado para isso, usa o próprio campo texto como sinalizador. Migração extrai isso para `falecido_flag` booleano e limpa o nome.

### RN008 — Índice de ocupação não é fonte de verdade 🟢
`FALECIDO.DBF` contém apenas `(cemitério, quadra, lote)` — um registro por lote ocupado, usado como lookup rápido pela aplicação Clipper. Não é migrado; todos os seus campos são subconjunto de `DADOS.DBF`. 🔴 LACUNA: confirmar com o usuário se `FALECIDO.DBF` tinha algum uso adicional (ex. índice de navegação) antes de descartá-lo definitivamente na migração.

### RN009 — Sequenciamento de itens 🟢
`ITEM` em `DADOS`/`RESPONSA` é sequencial por lote (1, 2, 3... = gaveta 1, 2, 3...). Próximo item = `MAX(ITEM)+1` para aquele lote.

### RN010 — Mapeamento OBA é específico de uma unidade 🔴 LACUNA
Numeração alternativa de quadras/lotes, existente só no cemitério Independência. Motivo da assimetria entre unidades não está documentado em nenhum artefato disponível — requer confirmação com um operador do sistema legado.

### RN011 — Senha em texto puro no legado, hash fraco na migração 🔴 CRÍTICO
`PWUSUA.PW_PASS` é `CHAR(6)` em texto puro no DBF. A migração aplica `SHA256(senha)` **sem salt** — o próprio código-fonte comenta que é um placeholder ("substituir por bcrypt/argon2 na aplicação real"), mas é o que efetivamente é gravado em `usuario.senha_hash` hoje. Ver `permissions.md`.

### RN012 — Cadastro de coveiro/pedreiro por cemitério, mas hardcoded incorretamente na migração 🔴 CRÍTICO
`FUNCIONA.DBF`/`PEDREIRO.DBF` de cada cemitério têm numeração de código própria e não coincidente entre unidades. O importador atual usa uma lista fixa hardcoded (assumindo que os dados "não puderam ser exportados"), mas a leitura direta dos bytes do DBF mostra que os dados reais existem e **não coincidem** com o hardcode — ver achado detalhado em `code-analysis.md`, módulo `importacao-csv`. Isso é uma regra de negócio violada silenciosamente pela implementação atual da migração, não uma limitação de dado de origem.

## Diagrama de Contexto (C4 — Nível 1)

```
┌────────────────────────────────────────────────────────────────────┐
│                 SISTEMA DE GESTÃO DE CEMITÉRIOS (legado Clipper)    │
│                                                                      │
│  Atendentes (balcão) · Coveiros (campo) · Pedreiros (construção)    │
│                              │                                      │
│                              ▼                                      │
│         Aplicação Clipper (Cadastro / Operação / Admin / Segurança) │
│                              │                                      │
│                              ▼                                      │
│              Arquivos DBF (dBase) + índices NTX                     │
│         Cemiterio Central/   ·   Cemiterio Independencia/           │
└──────────────────────────────┬───────────────────────────────────┘
                                │ Migração (ETL: extração DBF → CSV → import SQL)
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│           Sistema alvo (multi-tenant) — PostgreSQL/MySQL            │
└────────────────────────────────────────────────────────────────────┘
```
🟢 Estrutura confirmada pelos scripts de extração/importação e pelos dois DDLs.
