# Modelo de Dados - Análise dos Arquivos Legado

## Visão Geral

O sistema legado Clipper gerencia dois cemitérios independentes com estruturas de dados idênticas. Os dados são armazenados em arquivos DBF (dBase) com índices NTX. A exportação para CSV normalizou encoding (CP850 → UTF-8), datas (DD/MM/YYYY → YYYY-MM-DD) e removeu registros logicamente excluídos (FLAG_EXCL = '*').

---

## Tabelas Principais

### 1. DADOS (Falecidos / Sepultamentos)
**Arquivo**: `DADOS.DBF` → `DADOS.csv`
**Registros**: Central: 6.956 | Independência: 14.906 | **Total: 21.857**

| Campo Original | Tipo | Descrição | Exemplo |
|---|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério (01/02) | '01' |
| QUADRAIOQ | Char(6) | Código da quadra | '0001' |
| LOTEAIOQ | Char(6) | Código do lote | '0042' |
| ITEMAIOQ | Numeric | Item/sequencial no lote (1,2,3...) | 1 |
| NOMEAIOQ | Char(100) | Nome do falecido | 'SERGIO LUIZ WITKOVSKI' |
| DT_NASCOQ | Date | Data de nascimento (DD/MM/YYYY) | '28/09/1958' |
| DT_FALOQ | Date | Data de falecimento (DD/MM/YYYY) | '22/06/2008' |
| CERTIDAOQ | Numeric | Número da certidão de óbito | 1610 |
| DT_EMIOQ | Date | Data de emissão da certidão | '22/06/2008' |
| CARTORIOQ | Char(100) | Cartório emissor | 'REGISTRO CIVIL PENHA' |
| MEDICOOQ | Char(100) | Médico que atestou o óbito | 'ELISORIO PEREIRA NETO' |
| CAUSAOQ | Char(200) | Causa mortis | 'ASFIXIA POR AFOGAMENTO' |
| COD_FUNCQ | Numeric | Código do coveiro (FK → FUNCIONA) | 2 |
| COD_PEDQ | Numeric | Código do pedreiro (FK → PEDREIRO) | 1 |
| FLAG_EXCLQ | Char(1) | Exclusão lógica ('*' = excluído) | '' |

**Chave Primária Composta**: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ, ITEMAIOQ)
**Chaves Estrangeiras**: 
- (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ) → LOTES
- COD_FUNCQ → FUNCIONA.CODIGO
- COD_PEDQ → PEDREIRO.CODIGO

---

### 2. LOTES (Cadastro de Lotes/Jazigos)
**Arquivo**: `LOTES.DBF` → `LOTES.csv`
**Registros**: Central: 2.398 | Independência: 7.437 | **Total: 9.835**

| Campo Original | Tipo | Descrição | Exemplo |
|---|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério | '01' |
| QUADRAIOQ | Char(6) | Código da quadra | '0001' |
| LOTEAIOQ | Char(6) | Código do lote | '0001' |
| TIPOAIOQ | Char(1) | Tipo: '1'=Comum/terra, '3'=Gaveta/perpétuo | '3' |
| GAVETAIOQ | Numeric | Número de gavetas (capacidade) | 1 |
| PROCESSOQ | Numeric | Número do processo administrativo | 0 |
| VALIDADEQ | Date | Data de validade da concessão | '31/12/2017' |

**Chave Primária Composta**: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ)
**Tipos de Lote**:
- '1' = Comum (terra) - Concessão Temporária (VALIDADE preenchida)
- '3' = Gaveta/Perpétuo (concreto) - Perpetuidade (VALIDADE = '11/11/1111' ou vazia)

---

### 3. RESPONSA (Responsáveis / Concessionários)
**Arquivo**: `RESPONSA.DBF` → `RESPONSA.csv`
**Registros**: Central: 4.332 | Independência: 11.642 | **Total: 15.974**

| Campo Original | Tipo | Descrição | Exemplo |
|---|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério | '01' |
| QUADRAIOQ | Char(6) | Código da quadra | '0001' |
| LOTEAIOQ | Char(6) | Código do lote | '0001' |
| ITEMAIOQ | Numeric | Item/sequencial no lote | 1 |
| NOMEAIOQ | Char(100) | Nome do responsável | 'SEMINARIO SAO VICENTE DE PAULA' |
| RGEAIOQ | Char(30) | RG | '1' |
| CPFAIOQ | Char(18) | CPF/CNPJ (apenas dígitos) | '11111111111' |
| ENDERECOQ | Char(100) | Endereço | 'R. SAO VICENTE DE PAULA' |
| NUMEROOQ | Numeric | Número | 0 |
| CEPROOQ | Char(10) | CEP | '83700000' |
| CIDADEOQ | Char(50) | Cidade | 'ARAUCARIA' |
| FONEEOQ | Char(20) | Telefone fixo | '41 36424163' |
| CELULARQ | Char(20) | Celular | '' |
| FLAG_EXCLQ | Char(1) | Exclusão lógica ('*' = excluído) | '' |

**Chave Primária Composta**: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ, ITEMAIOQ)
**Nota**: Nomes com `[FALECIDO]` indicam responsável falecido (flag falecido_flag = true)

---

### 4. FALECIDO (Índice de Lotes Ocupados)
**Arquivo**: `FALECIDO.DBF` → `FALECIDO.csv`
**Registros**: Central: 2.477 | Independência: 7.864 | **Total: 10.341**

| Campo Original | Tipo | Descrição | Exemplo |
|---|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério | '01' |
| QUADRAIOQ | Char(6) | Código da quadra | '0001' |
| LOTEAIOQ | Char(6) | Código do lote | '0041' |

**Chave Primária Composta**: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ)
**Função**: Índice rápido de quais lotes têm pelo menos um sepultamento. Não contém dados do falecido, apenas a localização.

---

### 5. ERROS (Log de Erros do Sistema)
**Arquivo**: `ERROS.DBF` → `ERROS.csv`
**Registros**: 712 (cada cemitério)

| Campo Original | Tipo | Descrição |
|---|---|---|
| CODI_ERROQ | Char(20) | Código do erro |
| TPMSG_ERRO | Char(1) | Tipo: 'E'rro, 'A'viso, 'I'nfo |
| MSG_ERROO | Memo | Mensagem do erro |

---

## Tabelas Específicas do Cemitério Independência

### 6. TTT (Histórico de Validades)
**Arquivo**: `TTT.DBF` → `TTT.csv`
**Registros**: 2.126

| Campo | Tipo | Descrição |
|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério |
| QUADRAIOQ | Char(6) | Código da quadra |
| LOTEAIOQ | Char(6) | Código do lote |
| TIPOAIOQ | Char(1) | Tipo do lote |
| GAVETAIOQ | Numeric | Número de gavetas |
| PROCESSOQ | Numeric | Processo administrativo |
| VALIDADEQ | Date | Data de validade histórica |

**Função**: Histórico de alterações de validade/tipo de lote ao longo do tempo.

---

### 7. OBA (Mapeamento Alternativo de Lotes)
**Arquivo**: `OBA.DBF` → `OBA.csv`
**Registros**: 5.012

| Campo | Tipo | Descrição |
|---|---|---|
| CEMITERIOQ | Char(2) | Código do cemitério |
| QUADRAIOQ | Char(6) | Código da quadra (formato diferente) |
| LOTEAIOQ | Char(6) | Código do lote (formato diferente) |

**Função**: Mapeamento alternativo de numeração de lotes (quadras C9, lotes C6). Usado para conversão entre numeração antiga e nova.

---

## Tabelas de Apoio (Pequenas / Problemas de Encoding)

### FUNCIONA (Funcionários / Coveiros)
**Arquivo**: `FUNCIONA.DBF` - Problema de encoding nos nomes dos campos
**Estrutura conhecida** (via import_csv_to_db.py):
- CODIGO (PK): 1-12
- NOME: Nome do coveiro
- RG: Registro Geral

**Dados conhecidos**:
| CODIGO | NOME | RG |
|---|---|---|
| 1 | IGNORADO | . |
| 2 | RAFAEL STARON | 78082798 |
| 3 | AUGUSTO BOJAN | 44766337 |
| 4-12 | FUNCIONARIO 4-12 | (vazio) |

---

### PEDREIRO (Pedreiros)
**Arquivo**: `PEDREIRO.DBF` - Problema de encoding nos nomes dos campos
**Estrutura conhecida** (via import_csv_to_db.py):
- CODIGO (PK): 1-4
- NOME: Nome do pedreiro
- RG: Registro Geral

**Dados conhecidos**:
| CODIGO | NOME | RG |
|---|---|---|
| 1 | IGNORADO | . |
| 2 | PEDREIRO 2 | (vazio) |
| 3 | PEDREIRO 3 | (vazio) |
| 4 | PEDREIRO 4 | (vazio) |

---

### PWUSUA (Usuários do Sistema)
**Arquivo**: `PWUSUA.DBF` / `PWUSUA.csv` - 2 registros
**Campos**: PW_GRUPO, PW_CODIGO, PW_NOME, PW_NIVEL, PW_OBSL, PW_PASS

---

### PWGRUPOS (Grupos de Permissão)
**Arquivo**: `PWGRUPOS.DBF` / `PWGRUPOS.csv` - 1 registro
**Campos**: PW_GRUPO, PW_NOGRUPO

---

### PWTABELA (Permissões por Tabela)
**Arquivo**: `PWTABELA.DBF` / `PWTABELA.csv` - 6 registros
**Campos**: PW_GRUPO, PW_DBF, PW_PERMIS (string 20 chars = 5 ações × 4 tabelas?)
- Posições 0-3: Incluir
- Posições 4-7: Alterar
- Posições 8-11: Excluir
- Posições 12-15: Consultar
- Posições 16-19: Relatório

---

### Tabelas de Sequência
- **DAD_SEQ.DBF** - Contador de DADOS
- **FUN_SEQ.DBF** - Contador de FUNCIONA
- **PED_SEQ.DBF** - Contador de PEDREIRO
- **RES_SEQ.DBF** - Contador de RESPONSA

---

## Mapeamento para Schema Relacional Alvo (PostgreSQL/MySQL)

| Arquivo Legado | Tabela Alvo | Observações |
|---|---|---|
| Cemitério (fixo) | `cemiterio` | 2 registros fixos |
| Quadras (distinct LOTES) | `quadra` | PK serial, UK (cemiterio_id, codigo) |
| Tipo Lote (fixo) | `tipo_lote` | '1' e '3' |
| LOTES | `lote` | FK quadra_id, UK (quadra_id, codigo) |
| FUNCIONA | `funcionario` | PK = CODIGO legado |
| PEDREIRO | `pedreiro` | PK = CODIGO legado |
| DADOS | `falecido` | FK lote_id, UK (lote_id, item_ordem) |
| RESPONSA | `responsavel` | FK lote_id |
| ERROS | `log_erro` | Auditoria |
| PWGRUPOS | `usuario_grupo` | |
| PWUSUA | `usuario` | Senha hasheada (SHA256 na migração) |
| PWTABELA | `permissao` | Parse de PW_PERMIS |
| OBA | `lote_oba` | Apenas Independência |
| TTT | `lote_historico_validade` | Apenas Independência |

---

## Regras de Negócio Identificadas

1. **Multi-tenancy por Cemitério**: Cada cemitério (01, 02) é isolado logicamente
2. **Hierarquia**: Cemitério → Quadra → Lote → (Falecido + Responsável)
3. **Capacidade de Lote**: Campo GAVETA indica quantos corpos cabem (empilhados)
4. **Item Ordem**: Sequencial dentro do lote (1 = primeiro sepultamento, 2 = segundo, etc.)
5. **Concessão Temporária vs Perpétua**: Tipo '1' tem validade, tipo '3' é perpétuo
6. **Exclusão Lógica**: FLAG_EXCL = '*' marca registros excluídos (não importados)
7. **Responsável Falecido**: Nome contém `[FALECIDO]` → flag falecido_flag = true
8. **Coveiro/Pedreiro**: Vinculados ao sepultamento via COD_FUNCQ / COD_PEDQ
9. **Dados Sensíveis**: CPF, RG, endereço, telefone → LGPD (mascarar/criptografar)
10. **Histórico de Validades** (TTT): Rastreia mudanças de concessão ao longo do tempo
11. **Mapeamento OBA**: Numeração alternativa para o mesmo lote físico