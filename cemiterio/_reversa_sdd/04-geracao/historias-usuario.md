# Histórias de Usuário: migração legada de necrópoles

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## HU-001 — Executar migração em modo de simulação

- **Como** administrador de migração
- **Quero** executar o comando com `--dry-run`
- **Para** validar integridade e contagens antes de persistir qualquer dado

**Critério de aceitação:**
- Dado que existem arquivos legados válidos
- Quando executo `cemiterios:migrar-clipper --dry-run`
- Então o sistema emite relatório com contagens por entidade, chaves estrangeiras e anomalias
- E não altera o banco de destino

---

## HU-002 — Executar migração definitiva por tenant

- **Como** administrador de migração
- **Quero** indicar o tenant de destino e a necrópole desejada
- **Para** processar apenas um cemitério por vez, com isolamento e rollback por lote

**Critério de aceitação:**
- Dado que a migração é executada para o tenant Central
- Quando a carga é finalizada
- Então apenas os registros do Central são persistidos
- E cada lote é processado em transação own

---

## HU-003 — Preservar coveiro e pedreiro históricos

- **Como** operador de validação
- **Quero** que o sepultamento histórico vincule os nomes do coveiro e do pedreiro
- **Para** manter a rastreabilidade da equipe operacional sem violar chaves estrangeiras

**Critério de aceitação:**
- Dado um falecido com `COD_FUNCQ` e `COD_PEDQ` válidos
- Quando a inumação é persistida
- Então a inumação reference os nomes correspondentes de `funcionario` e `pedreiro`
- E não há erro de violação de chave estrangeira

---

## HU-004 — Aplicar LGPD a dados sensíveis

- **Como** auditor de proteção de dados
- **Quero** que CPF, RG, endereço e contatos sejam mascarados ou criptografados
- **Para** cumprir a LGPD na migração de acervos históricos

**Critério de aceitação:**
- Dado um responsável com dados sensíveis preenchidos
- Quando a carga é persistida
- Então os campos sensíveis não estão em claro
- E a política de mascaramento/criptografia é configurável e auditável

---

## HU-005 — Recalcular ocupação e estado físico dos jazigos

- **Como** administrador de cadastro
- **Quero** que a ocupação e o estado físico de cada jazigo sejam recalculados após a migração
- **Para** ter um inventário consistente com os sepultamentos históricos

**Critério de aceitação:**
- Dado que os sepultamentos históricos foram importados
- Quando o recalculo é executado
- Então a contagem de ocupação e o estado físico de cada jazigo estão consistentes

---

## HU-006 — Receber relatório de execução

- **Como** operador de validação
- **Quero** receber um relatório com contagens, erros, órfãos e duplicidades
- **Para** auditar a migração e corrigir exceções

**Critério de aceitação:**
- Dado que a migração é executada (dry-run ou definitiva)
- Então o relatório contém totais por entidade, falhas registradas e resumo de idempotência

---

## HU-007 — Retomar migração após falha

- **Como** administrador de migração
- **Quero** que a migração seja retomável
- **Para** evitar reprocessamento completo após interrupção

**Critério de aceitação:**
- Dado que uma migração foi interrompida
- Quando a execução é reiniciada
- Então os lotes já concluídos são pulados e apenas o restante é processado
- E o estado de execução é rastreável

---

## HU-008 — Tratar inconsistências sem abortar a carga

- **Como** operador de validação
- **Quero** que anomalias sejam registradas em vez de interromper a migração
- **Para** preservar o máximo de dados históricos possível

**Critério de aceitação:**
- Dado um registro com códigos operacionais desconhecidos ou capacidade divergente
- Quando a migração é executada
- Então a exceção é registrada no relatório
- E o registro é tratado conforme a política configurada