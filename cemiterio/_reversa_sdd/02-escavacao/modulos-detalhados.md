# Módulos do Sistema Legado - Análise Detalhada

## Visão Arquitetural do Sistema Clipper

O sistema legado é uma aplicação Clipper/xBase monolítica de terminal para gestão de cemitérios. Cada cemitério tem sua própria instância física dos arquivos DBF (pastas separadas), mas compartilha a mesma estrutura de dados e lógica de negócio.

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA CLIPPER CEMITÉRIO                │
├─────────────────────────────────────────────────────────────┤
│  MÓDULO CADASTRO                                            │
│  ├── Cemitérios (fixo: Central, Independência)              │
│  ├── Quadras                                                │
│  ├── Lotes/Jazigos                                          │
│  │   ├── Tipo: Comum (terra) / Gaveta (concreto/perpétuo)  │
│  │   ├── Gavetas (capacidade de empilhamento)               │
│  │   ├── Processo administrativo                            │
│  │   └── Validade da concessão                              │
│  ├── Funcionários (Coveiros)                                │
│  └── Pedreiros                                              │
├─────────────────────────────────────────────────────────────┤
│  MÓDULO OPERACIONAL                                         │
│  ├── Sepultamentos (DADOS)                                  │
│  │   ├── Dados do falecido (nome, nascimento, óbito)       │
│  │   ├── Certidão de óbito (número, emissão, cartório)      │
│  │   ├── Causa mortis, médico                               │
│  │   ├── Coveiro responsável (FK)                           │
│  │   └── Pedreiro responsável (FK)                          │
│  ├── Concessionários/Responsáveis (RESPONSA)               │
│  │   ├── Dados pessoais (nome, RG, CPF)                    │
│  │   ├── Endereço completo                                  │
│  │   ├── Contatos (fone, celular)                          │
│  │   └── Flag [FALECIDO] no nome                            │
│  └── Índice de Ocupação (FALECIDO - apenas localização)    │
├─────────────────────────────────────────────────────────────┤
│  MÓDULO ADMINISTRATIVO                                      │
│  ├── Log de Erros (ERROS)                                   │
│  ├── Usuários e Permissões (PWUSUA, PWGRUPOS, PWTABELA)    │
│  ├── Sequências (DAD_SEQ, FUN_SEQ, PED_SEQ, RES_SEQ)       │
│  └── Histórico de Validades (TTT - apenas Independência)   │
├─────────────────────────────────────────────────────────────┤
│  MÓDULO ESPECÍFICO INDEPENDÊNCIA                            │
│  └── Mapeamento Alternativo OBA                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Módulo 1: Cadastro de Estrutura Física (Cemitério → Quadra → Lote)

### Entidades
- **Cemitério**: 2 instâncias fixas (01=Central, 02=Independência/Boqueirão)
- **Quadra**: Agrupamento lógico de lotes (código alfanumérico: '0001', '0071', '000C')
- **Lote/Jazigo**: Unidade física de sepultamento

### Atributos do Lote
| Atributo | Domínio | Regra de Negócio |
|---|---|---|
| Tipo | '1' ou '3' | '1'=Comum/Temporário, '3'=Gaveta/Perpétuo |
| Gavetas | 1-9 | Capacidade de corpos empilhados |
| Processo | Numérico | Referência administrativa |
| Validade | Data ou NULL | NULL/'1111-11-11' = Perpétuo |

### Regras de Ocupação
1. Lote tipo '1' (Comum): 1 gaveta, concessão temporária com validade
2. Lote tipo '3' (Gaveta): 1+ gavetas, concessão perpétua
3. Item_ordem em DADOS/RESPONSA indica posição vertical (1=base, 2=acima, etc.)
4. Não pode exceder número de gavetas do lote

---

## Módulo 2: Sepultamentos (DADOS)

### Fluxo de Sepultamento
```
1. Verificar lote disponível (tem gaveta livre?)
2. Registrar falecido em DADOS
   - Dados pessoais + óbito + certidão + causa
   - Vincular coveiro (COD_FUNC) e pedreiro (COD_PED)
3. Registrar/atualizar responsável em RESPONSA
4. Atualizar índice FALECIDO (lote ocupado)
5. Se lote cheio → marcar como ocupado completamente
```

### Campos Críticos
- **COD_FUNCQ / COD_PEDQ**: Referenciam FUNCIONA/PEDREIRO por código numérico
- **FLAG_EXCLQ**: Exclusão lógica (soft delete) - '*' = excluído
- **Datas inválidas**: '1111-11-11' e '0000-00-00' = desconhecida/NULL

### Integridade
- FK implícita: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ) deve existir em LOTES
- FK implícita: COD_FUNCQ deve existir em FUNCIONA
- FK implícita: COD_PEDQ deve existir em PEDREIRO
- UK: (CEMITERIOQ, QUADRAIOQ, LOTEAIOQ, ITEMAIOQ) - um falecido por posição no lote

---

## Módulo 3: Concessionários/Responsáveis (RESPONSA)

### Perfil do Responsável
- Pessoa física ou jurídica (CPF/CNPJ no mesmo campo)
- Pode ser o próprio falecido (flag [FALECIDO] no nome)
- Múltiplos responsáveis por lote (ITEMAIOQ sequencial)
- Dados de contato para notificações (validade, cobrança, exumação)

### LGPD - Dados Sensíveis
| Campo | Classificação | Tratamento Necessário |
|---|---|---|
| CPFAIOQ | Dado pessoal sensível | Mascaramento/Hash/Pseudonimização |
| RGEAIOQ | Dado pessoal | Mascaramento parcial |
| ENDERECOQ, NUMEROOQ | Dado pessoal | Pseudonimização |
| FONEEOQ, CELULARQ | Dado pessoal | Mascaramento |
| CIDADEOQ, CEPROOQ | Dado pessoal | Generalização (apenas cidade/estado) |

---

## Módulo 4: Equipe Operacional (FUNCIONA / PEDREIRO)

### Coveiros (FUNCIONA)
- Códigos 1-12
- Nomes conhecidos: IGNORADO (1), RAFAEL STARON (2), AUGUSTO BOJAN (3)
- RG armazenado
- Vinculados a sepultamentos via COD_FUNCQ

### Pedreiros (PEDREIRO)
- Códigos 1-4
- IGNORADO (1), outros 3 genéricos
- Vinculados a sepultamentos via COD_PEDQ

### Requisito de Migração (do Spec)
> "WHEN um registro de falecido do arquivo legado possui código de funcionário coveiro e código de pedreiro preenchidos THEN o sistema vincula o nome correspondente do coveiro e do pedreiro na inumação histórica sem gerar erros de violação de chave"

Isso exige que a migração:
1. Importe FUNCIONA e PEDREIRO primeiro (tabelas de referência)
2. Resolva as FKs COD_FUNCQ → funcionario.id, COD_PEDQ → pedreiro_id
3. Trate códigos órfãos (não encontrados) graciosamente (NULL ou 'IGNORADO')

---

## Módulo 5: Segurança e Acesso (PW*)

### Modelo de Permissão
- **Grupos** (PWGRUPOS): Código + Nome
- **Usuários** (PWUSUA): Grupo + Código + Nome + Nível + Senha
- **Permissões** (PWTABELA): Grupo × Tabela(DBF) → String 20 chars

### Decodificação de PW_PERMIS
String de 20 caracteres = 5 ações × 4 posições cada:
```
Pos 0-3:   Incluir (I)
Pos 4-7:   Alterar (A)  
Pos 8-11:  Excluir (E)
Pos 12-15: Consultar (C)
Pos 16-19: Relatório (R)
```
Cada posição: 'S' = Sim, 'N' = Não (ou espaço)

### Migração para Schema Relacional
- `usuario_grupo` (codigo, nome)
- `usuario` (grupo_codigo, codigo, nome, nivel, senha_hash, email)
- `permissao` (grupo_codigo, tabela, pode_incluir, pode_alterar, pode_excluir, pode_consultar, pode_relatorio)

---

## Módulo 6: Auditoria e Logs (ERROS)

### Estrutura
- Código do erro
- Tipo: 'E'rro, 'A'viso, 'I'nformação
- Mensagem descritiva
- Módulo/origem (implícito pelo contexto)

### Uso na Migração
- Importar para tabela `log_erro` para auditoria histórica
- Não tem relação direta com entidades de negócio
- Útil para diagnóstico de problemas na migração

---

## Módulo 7: Específicos do Cemitério Independência

### TTT - Histórico de Validades
- Rastreia mudanças de tipo, gavetas, processo, validade de lotes ao longo do tempo
- Permite auditoria de alterações de concessão
- Migra para `lote_historico_validade`

### OBA - Mapeamento Alternativo
- Numeração legada diferente (quadras C9, lotes C6)
- Mapeia numeração antiga → numeração atual (LOTES)
- Migra para `lote_oba` com link para `lote.id`

---

## Fluxos de Dados Principais

### Fluxo 1: Consulta de Ocupação de Lote
```
Input: Cemitério, Quadra, Lote
1. Buscar em FALECIDO (índice rápido) → existe registro?
2. Se sim, buscar em DADOS todos itens desse lote
3. Para cada item: buscar responsável em RESPONSA (mesmo ITEM)
4. Retornar: lista de falecidos + responsáveis + status ocupação
```

### Fluxo 2: Novo Sepultamento
```
Input: Dados do falecido, Cemitério, Quadra, Lote, Coveiro, Pedreiro
1. Validar lote existe e tem gaveta livre (count DADOS < GAVETAS)
2. Determinar próximo ITEM (max + 1)
3. Inserir em DADOS
4. Inserir/atualizar RESPONSA
5. Se primeiro item no lote: inserir em FALECIDO
```

### Fluxo 3: Consulta de Concessionário
```
Input: CPF ou Nome
1. Buscar em RESPONSA (LIKE em NOMEAIOQ ou = CPFAIOQ)
2. Retornar lotes associados (via QUADRA/LOTE/ITEM)
3. Para cada lote: buscar ocupação atual (DADOS)
```

### Fluxo 4: Relatório de Validades Próximas
```
1. Buscar em LOTES onde VALIDADE entre hoje e +90 dias
2. Juntar RESPONSA (concessionário atual)
3. Gerar notificação de renovação
```

---

## Interface com Sistema Externo (SYSGOV - Target)

O spec descreve migração para "modelo relacional multi-tenant do SYSGOV" com tabelas:
- `deceased_records` (equivalente a `falecido` + dados de `DADOS`)
- `cemetery_burials` (inumações - vincula falecido + lote + coveiro + pedreiro)

### Mapeamento Conceitual

| Legado (Clipper) | SYSGOV (Target) | Transformação |
|---|---|---|
| DADOS + FALECIDO (índice) | deceased_records | Merge + normalização |
| DADOS (COD_FUNC, COD_PED) + FUNCIONA + PEDREIRO | cemetery_burials | Join + enriquecimento |
| LOTES + QUADRA + CEMITÉRIO | cemetery_sectors/plots | Reestruturação hierárquica |
| RESPONSA | concession_holders | Renomeação + LGPD |
| TTT | concession_history | Histórico de validades |

### Requisitos Específicos do Spec

1. **Idempotência**: Re-executar migração não duplica dados
2. **Dry-run**: Análise sem persistência
3. **Batch transacional**: Commits por lote com rollback em erro
4. **LGPD**: Mascarar/criptografar CPF, RG, endereço, telefone
5. **Tenant isolation**: Processar por cemitério (tenant) isoladamente
6. **Recalcular ocupação**: Após migração, determinar estado físico de cada jazigo
7. **Preservar equipe operacional**: Coveiro e pedreiro nomes vinculados à inumação