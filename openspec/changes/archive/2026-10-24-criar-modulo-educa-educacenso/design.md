# Design Técnico: Submódulo Educacenso (INEP/MEC)

## Contexto (Context)

Ver [proposal.md](proposal.md) para motivação e problemas resolvidos.
O SYS-Educa já possui implementados e aprovados os submódulos fundamentais: Core Acadêmico (escolas, turmas, matriz BNCC), Secretaria Escolar (matrículas e enturmações) e Servidores (lotação e funções).
O Educacenso consolida essas informações no formato oficial exigido pelo Ministério da Educação (MEC/INEP).

Restrições arquiteturais aplicadas:
- Multi-tenancy estrito via `tenant_id` (bigint) e trait `TenantAware`.
- Chaves primárias UUID `CHAR(36)` nas tabelas do módulo.
- Processamento assíncrono em background para exportações pesadas (ADR 005).
- Redação estritamente em Português do Brasil (pt-BR - AGENTS.md §7).

## Objetivos e Não-Objetivos (Goals / Non-Goals)

**Objetivos:**
- Prover auditoria completa e granular antes do envio, identificando inconsistências impeditivas e avisos.
- Gerar o arquivo posicional delimitado por pipe (`|`) nos leiautes oficiais 00, 10, 20, 30, 40, 50, 60 e 99 em ISO-8859-1.
- Implementar processamento assíncrono seguro com persistência do arquivo, checksum SHA-256 e download protegido.
- Suportar a importação do arquivo de retorno do INEP com conciliação atômica dos códigos oficiais.

**Não-Objetivos:**
- Comunicação direta via API/Webservice SOAP síncrona com o servidor do INEP (o INEP exige envio de arquivo via portal web Censo Escolar ou validador desktop).
- Substituir o módulo de análise de dados ou BI governamental.

## Decisões Arquiteturais e Técnicas (Decisions)

### Decisão 1: Processamento Assíncrono via Jobs e Tabela de Estado (ADR 005)
- **Escolha**: Disparar a geração através de `ExportEducacensoJob`, armazenando metadados na tabela `educa_census_exports`.
- **Justificativa**: Municípios com dezenas de escolas e milhares de estudantes excedem os limites de tempo de resposta HTTP (timeout de 30-60 segundos). O modelo assíncrono previne travamento e garante escalabilidade.
- **Alternativa Descartada**: Geração síncrona em memória como no legado do i-Educar.

### Decisão 2: Motor de Auditoria Declarativo em Dois Níveis (`impeditivo` vs `aviso`)
- **Escolha**: Classes de validação de regras (`CensusAuditService` orquestrando validadores especializados por registro) que geram diagnósticos catalogados com nível de gravidade, mensagem explicativa, código do erro e rota de navegação para correção.
- **Justificativa**: Permite que a escola corrija os erros previamente em tela amigável, sem precisar sofrer rejeição no validador do MEC. Apenas inconsistências `impeditivas` bloqueiam a exportação.

### Decisão 3: Serialização Posicional Delimitada por Pipe e Encoding ISO-8859-1
- **Escolha**: Cada registro monta um array indexado com as posições exatas prescritas no Caderno de Instruções do Censo Escolar, serializado com `implode('|', $campos)` e finalizado com a linha `99|`. O arquivo é entregue com codificação ISO-8859-1.
- **Justificativa**: Conformidade absoluta com a especificação do parser do INEP.

### Decisão 4: Estrutura de Tabelas e Modelos
1. `educa_census_exports`:
   - `id` (UUID), `tenant_id` (bigint), `school_id` (UUID), `academic_year_id` (UUID).
   - `ano` (int), `etapa_censo` (matricula_inicial, situacao_aluno).
   - `status` (solicitada, processando, concluida, falhou).
   - `total_linhas` (int), `total_erros` (int), `total_avisos` (int).
   - `arquivo_path` (string nullable), `checksum_sha256` (string nullable), `erro_detalhe` (text nullable).
2. `educa_census_validations`:
   - `id` (UUID), `tenant_id` (bigint), `school_id` (UUID), `academic_year_id` (UUID).
   - `tipo_registro` (string: '00', '10', '20', '30', '40', '50', '60').
   - `gravidade` (enum: 'impeditivo', 'aviso').
   - `codigo_regra` (string), `mensagem` (string), `entidade_tipo` (string), `entidade_id` (string).
3. `educa_census_inep_logs`:
   - Registros da conciliação do arquivo de retorno do INEP.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco] Variação anual do leiaute do INEP por portaria ministerial**:
  - *Mitigação*: Versionamento modular das regras de formatação por ano base, permitindo atualizar os campos do ano corrente sem quebrar anos anteriores.
- **[Risco] Inconsistência de CPF de alunos da zona rural ou estrangeiros**:
  - *Mitigação*: Tratar ausência de CPF como aviso não impeditivo para etapas específicas da educação básica, exigindo CPF obrigatório apenas para docentes e gestores (conforme regras do INEP).
- **[Risco] Sobrecarga de I/O em escolas de grande porte**:
  - *Mitigação*: Leitura em chunks com relacionamentos eagerly loaded (`with(['pessoa', 'escola', 'turmas'])`).
