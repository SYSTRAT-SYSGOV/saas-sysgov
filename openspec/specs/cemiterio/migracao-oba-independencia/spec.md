# Cemiterio Migracao Oba Independencia Specification

## Purpose
Migra e preserva os registros exclusivos do Cemitério Independência (`TTT.DBF`, sub-lotes/gavetas com concessão própria, e `OBA.DBF`, índice de ocupação desses sub-lotes) que nenhum comando de migração anterior processava, evitando perda de dado histórico específico dessa necrópole.

## Requirements

### Requirement: Preservação dos sub-lotes exclusivos de Independência
O sistema SHALL ler `TTT.DBF` do Cemitério Independência e registrar, para cada sub-lote (código de lote subdividido em letra, ex.: `001A`), o processo administrativo e a data de validade da concessão associada, vinculando o registro ao lote físico correspondente em `LOTES.DBF` sem sobrepor ou descartar os dados já migrados desse lote.

#### Scenario: Sub-lote com concessão própria migrado
- **WHEN** o comando de migração processa um registro de `TTT.DBF` cujo lote físico correspondente já existe no SYSGOV
- **THEN** o sistema registra o sub-lote com seu processo administrativo e validade de concessão, vinculado ao lote físico existente

#### Scenario: Sub-lote sem lote físico correspondente
- **WHEN** o comando de migração processa um registro de `TTT.DBF` cujo lote físico correspondente não existe em `LOTES.DBF`
- **THEN** o sistema registra o sub-lote como pendência de revisão manual no relatório de migração, sem interromper o processamento dos demais registros

### Requirement: Preservação do índice de ocupação de sub-lotes (`OBA.DBF`)
O sistema SHALL ler `OBA.DBF` do Cemitério Independência e registrar cada entrada como referência de ocupação de um sub-lote de `TTT.DBF`, com o mesmo tratamento de auditoria já aplicado ao índice equivalente de `FALECIDO.DBF` (preservação sem uso em regra de negócio até validação humana do significado operacional da tabela).

#### Scenario: Entrada de OBA.DBF preservada
- **WHEN** o comando de migração processa um registro de `OBA.DBF`
- **THEN** o sistema registra a referência de ocupação do sub-lote correspondente em uma tabela de auditoria, sem vinculá-la automaticamente a nenhuma regra de bloqueio ou liberação de sepultamento
