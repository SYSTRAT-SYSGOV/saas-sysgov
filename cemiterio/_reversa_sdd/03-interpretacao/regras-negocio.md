# Regras de Negócio Implícitas e Máquinas de Estado

## Máquina de Estado: Lote/Jazigo

### Estados
```
DISPONÍVEL → PARCIALMENTE_OCUPADO → OCUPADO_TOTALMENTE → EXUMADO/LIBERADO
     │              │                     │
     │              │                     └─ Todas as gavetas preenchidas
     │              └─ Pelo menos 1 sepultamento, gavetas livres
     └─ Nenhum sepultamento (FALECIDO não tem registro)
```

### Transições
| De → Para | Evento | Condição | Ação |
|---|---|---|---|
| DISPONÍVEL → PARCIALMENTE_OCUPADO | Primeiro sepultamento | Lote tem gavetas > 0 | Inserir em FALECIDO (índice) |
| PARCIALMENTE_OCUPADO → PARCIALMENTE_OCUPADO | Sepultamento adicional | Gavetas ocupadas < total gavetas | Incrementar item_ordem |
| PARCIALMENTE_OCUPADO → OCUPADO_TOTALMENTE | Última gaveta preenchida | Gavetas ocupadas = total gavetas | Marcar lote como cheio |
| OCUPADO_TOTALMENTE → EXUMADO | Exumação/Transferência | Processo judicial/admin | Remover de DADOS, FALECIDO |
| QUALQUER → DISPONÍVEL | Liberação de concessão | Validade expirada + sem óbitos recentes | Limpar lote (regras complexas) |

### Regras de Validade
- **Tipo '1' (Comum/Temporário)**: Validade finita → após expiração, lote pode ser liberado
- **Tipo '3' (Gaveta/Perpétuo)**: Validade = NULL/'1111-11-11' → nunca expira
- **Renovação**: Atualizar VALIDADE em LOTES + registrar em TTT (histórico)

---

## Máquina de Estado: Sepultamento (Falecido)

### Estados
```
REGISTRADO → CONFIRMADO → EXUMADO → TRANSFERIDO
                │
                └─ (Estado normal permanente)
```

### Transições
| Evento | Ação | Registros Afetados |
|---|---|---|
| Registro inicial | INSERT DADOS + FALECIDO (se 1º) | DADOS, FALECIDO, RESPONSA |
| Marcar excluído | FLAG_EXCLQ = '*' | DADOS (soft delete) |
| Exumação | DELETE DADOS (ou flag) + atualizar FALECIDO | DADOS, FALECIDO |
| Transferência | Novo registro em outro lote + flag no original | DADOS (2 registros) |

---

## Máquina de Estado: Responsável/Concessionário

### Estados
```
ATIVO → FALECIDO → SUBSTITUÍDO
   │         │
   │         └─ Flag [FALECIDO] no nome
   └─ Responsável vivo
```

### Regras
- Um lote pode ter múltiplos responsáveis (ITEMAIOQ sequencial)
- Responsável falecido mantém vínculo histórico mas não recebe notificações
- Substituição: novo registro com ITEM incrementado

---

## Regras de Negócio Críticas (Extraídas do Código e Dados)

### RN001: Unicidade de Sepultamento por Posição
> Um lote não pode ter dois falecidos no mesmo item_ordem (mesma gaveta).
**Validação**: UK (lote_id, item_ordem) em `falecido`

### RN002: Capacidade Máxima por Lote
> Número de sepultamentos ativos ≤ gavetas do lote.
**Validação**: Count(DADOS ativos por lote) ≤ LOTES.GAVETAIOQ

### RN003: Coveiro e Pedreiro Obrigatórios no Sepultamento
> Todo sepultamento deve ter coveiro e pedreiro registrados.
**Dados**: COD_FUNCQ e COD_PEDQ sempre preenchidos nos exemplos (código 1 ou 2)
**Exceção**: Código 1 = 'IGNORADO' para casos sem identificação

### RN004: Isolamento por Cemitério (Multi-tenancy)
> Dados do Cemitério Central (01) e Independência (02) são fisicamente separados e logicamente isolados.
**Implementação**: Pastas separadas, CEMITERIOQ em todas as tabelas, chaves compostas incluem cemitério

### RN005: Exclusão Lógica (Soft Delete)
> Registros não são fisicamente removidos; FLAG_EXCLQ = '*' marca exclusão.
**Migração**: Filtrar FLAG_EXCLQ ≠ '*' na importação

### RN006: Datas Especiais
> '1111-11-11' e '0000-00-00' = data desconhecida/inexistente → NULL no banco relacional.
**Campos afetados**: DT_NASCOQ, DT_FALOQ, DT_EMIOQ, VALIDADEQ

### RN007: Responsável Falecido
> Se NOMEAIOQ contém '[FALECIDO]', o concessionário faleceu.
**Ação**: falecido_flag = true, nome_limpo = REPLACE(nome, '[FALECIDO]', '')

### RN008: Índice de Ocupação (FALECIDO)
> Tabela FALECIDO contém apenas (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ) - um registro por lote ocupado.
**Função**: Lookup rápido "este lote tem sepultamento?" sem scan em DADOS

### RN009: Sequenciamento de Itens
> ITEMAIOQ em DADOS e RESPONSA é sequencial por lote (1, 2, 3... = gaveta 1, 2, 3...)
**Regra**: Próximo item = MAX(ITEMAIOQ) + 1 para aquele lote

### RN010: Mapeamento OBA (Independência)
> Numeração alternativa de quadras/lotes para compatibilidade com sistemas/registros antigos.
**Uso**: Consulta cruzada entre numeração atual e legada

---

## Matriz de Permissões (RBAC) - Sistema Legado

### Grupos Identificados (PWGRUPOS)
- 1 grupo encontrado nos dados (dados corrompidos por encoding)

### Usuários Identificados (PWUSUA)
- 2 usuários por cemitério

### Permissões por Tabela (PWTABELA)
- 6 registros por cemitério
- Matriz: Grupo × Tabela(DBF) → 5 ações (I/A/E/C/R)

### Mapeamento para Modelo Relacional Alvo
| Ação Legada | Permissão Alvo |
|---|---|
| Incluir (pos 0-3) | pode_incluir |
| Alterar (pos 4-7) | pode_alterar |
| Excluir (pos 8-11) | pode_excluir |
| Consultar (pos 12-15) | pode_consultar |
| Relatório (pos 16-19) | pode_relatorio |

### Níveis de Usuário (PW_NIVEL)
- '1' = Administrador (acesso total)
- '2' = Operador (incluir/alterar/consultar)
- '3' = Consultor (apenas consultar/relatório)
- Outros = Perfis customizados

---

## Diagrama Entidade-Relacionamento (ERD) - Modelo Legado

```
┌─────────────┐       ┌──────────┐       ┌────────┐
│ CEMITÉRIO   │ 1:N   │ QUADRA   │ 1:N   │ LOTE   │
│ (01, 02)    │◄──────│          │◄──────│        │
└─────────────┘       └──────────┘       └────┬───┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │   FALECIDO    │         │    DADOS      │         │  RESPONSA     │
            │ (índice ocup) │         │ (falecidos)   │         │ (responsáveis)│
            └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
                    │                         │                         │
                    │              ┌──────────┴──────────┐              │
                    │              ▼                     ▼              │
                    │      ┌───────────┐            ┌───────────┐       │
                    │      │ FUNCIONA  │            │ PEDREIRO  │       │
                    │      │ (coveiros)│            │(pedreiros)│       │
                    │      └───────────┘            └───────────┘       │
                    └───────────────────────────────────────────────────┘

┌─────────────┐       ┌──────────┐       ┌────────┐       ┌───────────┐
│ USUÁRIO     │ N:1   │ GRUPO    │ 1:N   │ PERMIS- │       │ LOG_ERRO  │
│ (PWUSUA)    │◄──────│ (PWGRUP) │──────►│ SÃO     │       │ (ERROS)   │
└─────────────┘       └──────────┘       │(PWTABELA)│       └───────────┘
                                         └──────────┘

┌─────────────┐       ┌──────────────────┐
│ LOTE        │ 1:N   │ HIST_VALIDADE    │  (TTT - apenas Independência)
│             │◄──────│ (TTT)            │
└─────────────┘       └──────────────────┘

┌─────────────┐       ┌──────────────────┐
│ LOTE        │ 1:N   │ MAPEAMENTO_OBA   │  (OBA - apenas Independência)
│             │◄──────│ (OBA)            │
└─────────────┘       └──────────────────┘
```

---

## Diagrama C4 - Contexto do Sistema

```
┌────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE GESTÃO DE CEMITÉRIOS             │
│                              (Legado Clipper)                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │  ATENDENTES  │    │  COVEIROS    │    │  PEDREIROS         │  │
│  │  (Balcão)    │    │  (Campo)     │    │  (Construção)      │  │
│  └──────┬───────┘    └──────┬───────┘    └─────────┬──────────┘  │
│         │                   │                       │             │
│         ▼                   ▼                       ▼             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              APLICAÇÃO CLIPPER (Terminal)                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │Cadastro │ │Operação │ │Admin    │ │Segurança        │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │  │
│  └────────────────────────────────┬───────────────────────────┘  │
│                                   │                               │
│                                   ▼                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           ARQUIVOS DBF (dBase) + ÍNDICES NTX               │  │
│  │  Cemiterio Central/    Cemiterio Independencia/            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Migração (ETL)
┌────────────────────────────────────────────────────────────────────┐
│                    SYSGOV - SISTEMA ALVO (Multi-tenant)            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ PostgreSQL/ │  │   API/      │  │  Frontend   │  │ Relató-  │  │
│  │ MySQL       │  │   Backend   │  │  (Web)      │  │ rios     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Diagrama de Sequência: Processo de Sepultamento

```
Atendente     Sistema Clipper       DBF Files         Coveiro/Pedreiro
   │               │                   │                    │
   ├─ Dados falecido              │                    │
   │               ├─ Valida lote   │                    │
   │               │  (gaveta livre?)                  │
   │               │               │                    │
   │               ├─ Proximo ITEM  │                    │
   │               │               │                    │
   │               ├─ INSERT DADOS  ├─► DADOS.DBF       │
   │               │               │                    │
   │               ├─ INSERT/UPDATE ├─► RESPONSA.DBF    │
   │               │  RESPONSA      │                    │
   │               │               │                    │
   │               ├─ Se 1º item:   │                    │
   │               │  INSERT FALEC. ├─► FALECIDO.DBF    │
   │               │               │                    │
   │               ├─ Registra      │                    │
   │               │  coveiro/pedr. │                    │
   │               │               │                    ├─ Recebe atribuição
   │               │               │                    │
   │               └─ Confirma      │                    │
   │                                   │                    │
```

---

## Análise de Impacto - Migração para SYSGOV

### Entidades de Origem → Destino

| Legado | SYSGOV | Complexidade | Riscos |
|---|---|---|---|
| CEMITÉRIO (2 fixos) | tenant/organization | Baixa | Mapeamento direto |
| QUADRA | cemetery_sector | Baixa | Código alfanumérico |
| LOTE | cemetery_plot/grave | Média | Tipo, gavetas, validade |
| DADOS + FALECIDO | deceased_records | Alta | Merge, FKs, datas |
| DADOS (COD_FUNC/PED) + FUNCIONA/PEDREIRO | cemetery_burials | Alta | Join, nomes histórico |
| RESPONSA | concession_holders | Alta | LGPD, [FALECIDO] flag |
| ERROS | audit_log | Baixa | Auditoria apenas |
| PW* | users/roles/permissions | Média | Hash senhas, matriz perm |
| TTT | concession_history | Média | Apenas Independência |
| OBA | plot_alias_mapping | Média | Apenas Independência |

### Gaps Funcionais (Legado → SYSGOV)
1. **Gestão de documentos**: Legado não tem anexos (certidões PDF, fotos)
2. **Workflow de aprovação**: Legado é registro direto, SYSGOV pode ter aprovação
3. **Notificações automáticas**: Legado não tem, SYSGOV pode ter (validade, cobrança)
4. **GIS/Mapa**: Legado não tem coordenadas, SYSGOV pode ter
5. **Portal do concessionário**: Legado não tem, SYSGOV pode ter
6. **LGPD/ANPD**: Legado armazena dados sensíveis em claro

### Riscos de Migração
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Dados órfãos (FKs quebradas) | Alta | Alto | Validação pré-carga, relatório de órfãos |
| Encoding CP850 → UTF-8 | Média | Médio | Testes com acentos, ç, ã |
| Datas inválidas (1111-11-11) | Alta | Baixo | Conversão para NULL documentada |
| Nomes de campos com null bytes | Alta | Médio | get_csv_field() tolerante |
| Coveiro/Pedreiro não encontrados | Baixa | Médio | Fallback para 'IGNORADO' |
| CPF/RG duplicados ou inválidos | Média | Alto | Validação e relatório de anomalias |
| Perda de histórico TTT/OBA | Baixa | Médio | Migração separada com link para lote_id |