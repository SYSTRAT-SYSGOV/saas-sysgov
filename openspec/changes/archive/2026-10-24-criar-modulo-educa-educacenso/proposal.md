# Proposta: Submódulo Educacenso (INEP/MEC) no SYS-Educa

## Por que (Why)

O Censo Escolar da Educação Básica (Educacenso), coordenado pelo INEP/MEC, é o principal instrumento estatístico educacional do Brasil e condiciona diretamente os repasses constitucionais do FUNDEB, PNAE (alimentação), PNATE (transporte escolar) e PNLD (livros didáticos) para os municípios.

No sistema legado (i-Educar), a geração do arquivo do Censo é síncrona, executada diretamente na memória durante requisições HTTP procedurais e sujeita a timeouts (HTTP 504), travamentos e ausência total de rastreabilidade ou hash de integridade (conforme diagnosticado na reversa arquitetural ADR 005).

A modernização deste submódulo no SYSGOV provê uma arquitetura robusta, multi-tenant e orientada a processamento assíncrono em lote (Batch/Job stateless), permitindo:
1. Auditoria prévia de consistência cadastral com apontamento preciso de divergências antes da exportação oficial.
2. Geração assíncrona e resiliente do arquivo posicional oficial do INEP (registros 00, 10, 20, 30, 40, 50, 60 e fechamento 99).
3. Conciliação e atualização automatizada dos códigos INEP oficiais de escolas, turmas, servidores e alunos no retorno do Censo.

## O que muda (What Changes)

- **Auditoria de Consistência Cadastral Prévia**: Mecanismo de validação de regras do INEP que classifica inconsistências em impeditivas (`bloqueantes`) ou de alerta (`avisos`), com rotas e links diretos para retificação no sistema.
- **Exportação Assíncrona e Resiliente (ADR 005)**: Motor de geração em lote executado via Job/Queue com persistência de status (`solicitada`, `processando`, `concluida`, `falhou`), armazenamento no Object Storage, cálculo de checksum SHA-256 e controle de download.
- **Formatação e Regras de Negócio do Layout INEP**:
  - Geração dos registros 00 (Identificação da Escola), 10 (Infraestrutura), 20 (Turmas e Áreas do Conhecimento), 30 (Dados Pessoais de Alunos, Docentes e Gestores vinculados ao MDM `Pessoa`), 40 (Vínculos de Gestão), 50 (Docência e Matriz Curricular), 60 (Matrícula, AEE e Transporte) e 99 (Fechamento).
  - Regras de supressão e anulação de campos com base na situação de funcionamento, dependência administrativa e tipo de atendimento.
  - Conversão e codificação oficial ISO-8859-1 para conformidade estrita com o validador desktop/web do INEP.
- **Importação do Arquivo de Retorno do INEP**: Processamento do arquivo de confirmação de matrículas/cadastros do INEP com atribuição atômica de `codigo_inep` aos modelos de Aluno, Servidor, Turma e Escola.
- **Segurança e RBAC**: Permissões granulares sob `educa.educacenso.*` e isolamento lógico restrito por `tenant_id`.

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)
- `educa-educacenso-auditoria`: Auditoria prévia de regras do INEP por tipo de registro, identificando inconsistências cadastrais e campos faltantes com links de retificação antes do envio.
- `educa-educacenso-exportacao`: Exportação em lote assíncrona do arquivo oficial de exportação do Censo Escolar delimitado por pipe (`|`), com rastreabilidade, checksum SHA-256 e histórico de downloads.
- `educa-educacenso-retorno-inep`: Leitura e conciliação do arquivo de retorno emitido pelo INEP para atualização automatizada dos identificadores INEP das entidades escolares.

### Capacidades Modificadas (Modified Capabilities)
Nenhuma especificação prévia teve seus requisitos alterados.

## Impacto (Impact)

- **Módulo Backend (`apps/api/Modules/Educa`)**:
  - Novas migrations para `educa_census_exports`, `educa_census_validations` e `educa_census_inep_logs`.
  - Novos Models Eloquent com traits `TenantAware`, `HasUuids` e `SoftDeletes`.
  - Novos Services: `CensusAuditService`, `CensusExportService` e `CensusImportService`.
  - Job assíncrono `ExportEducacensoJob` compatível com filas Redis/transacionais.
  - Rotas REST sob `/api/educa/educacenso` protegidas por `module-access:educa-educacenso` e `educa.educacenso.*`.
- **Módulos Core do SYSGOV**:
  - Integração com `Modules/Pessoas` (dados pessoais do Registro 30 e validações de CPF/Certidão).
  - Integração com `Modules/OrgChart` e `EducaSchool` (Registro 00 e 10).
  - Integração com `Modules/Access` e `AuditLogger` (rastreabilidade de exportações e conciliações).
