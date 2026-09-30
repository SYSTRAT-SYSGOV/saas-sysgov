# Spec Delta

## ADDED Requirements

### Requirement: Validação de ações de escrita via Form Requests dedicados
O sistema SHALL validar todas as ações de escrita do módulo por Form Requests dedicados, aplicando a validação algorítmica de dígitos verificadores de CPF, unicidade por tenant (composto por tenant_id e cpf_hash, desconsiderando o próprio registro no caso de atualização), vigência cronológica válida de vínculos (data de início menor ou igual à data de término) e conformidade de formatos para e-mail, telefone e CEP.

#### Scenario: CPF inválido rejeitado
- **WHEN** uma pessoa é cadastrada com CPF cujos dígitos verificadores são matematicamente inválidos
- **THEN** o sistema rejeita a operação com erro de validação HTTP 422 e nenhum registro de pessoa é criado no banco de dados

#### Scenario: Atualização com mesmo CPF do próprio registro
- **WHEN** os dados de uma pessoa são atualizados mantendo o mesmo CPF já cadastrado para ela
- **THEN** o sistema aceita a requisição sem acusar conflito de unicidade de CPF no tenant

#### Scenario: Vigência cronológica de vínculo inconsistente
- **WHEN** um vínculo é cadastrado informando data de término anterior à data de início
- **THEN** o sistema rejeita a requisição com erro de validação e não cria o vínculo

### Requirement: Serialização estrita via API Resources sem exposição de dados sensíveis
O sistema SHALL serializar todas as respostas da API contendo pessoas, vínculos, documentos, endereços e contatos por meio de API Resources dedicados, garantindo a proteção da privacidade e conformidade com a LGPD ao retornar exclusivamente o `cpf_mascarado`, nunca expondo os atributos `cpf` ou `cpf_hash` em nenhuma resposta.

#### Scenario: CPF nunca serializado
- **WHEN** a API retorna o detalhe ou a listagem de pessoas
- **THEN** a resposta JSON contém apenas o campo `cpf_mascarado` (com formato mascarado), sem os campos `cpf` em texto puro ou `cpf_hash`

#### Scenario: Serialização consistente de sub-entidades
- **WHEN** a API retorna documentos, endereços ou contatos vinculados a uma pessoa
- **THEN** a resposta é formatada pelos respectivos API Resources garantindo tipos padronizados e omissão de chaves internas desnecessárias

### Requirement: Autorização granular e integridade de recurso via PessoaPolicy
O sistema SHALL autorizar cada operação do módulo por meio da `PessoaPolicy`, combinando a checagem das permissões de RBAC (`cadastros.pessoas.view`, `cadastros.pessoas.create`, `cadastros.pessoas.update`, `cadastros.pessoas.delete`, `cadastros.pessoas.promote`, `cadastros.pessoas.import`) com regras de integridade do recurso, impedindo a exclusão de qualquer pessoa que possua vínculos ativos vigentes.

#### Scenario: Exclusão com vínculos ativos
- **WHEN** um usuário com permissão de exclusão tenta excluir uma pessoa que possui um ou mais vínculos com vigência ativa
- **THEN** o sistema nega a exclusão física e orienta o encerramento prévio dos vínculos ativos ou a aplicação de soft delete controlado

#### Scenario: Promoção restrita a usuários autorizados
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta acionar o endpoint de promoção a usuário
- **THEN** a `PessoaPolicy` nega a operação retornando código HTTP 403

### Requirement: CRUD completo de sub-entidades com unicidade de contato principal
O sistema SHALL permitir criar, atualizar e excluir individualmente documentos, endereços e contatos associados a uma pessoa por rotas RESTful dedicadas, garantindo atomicidade transacional para a regra de contato principal único por tipo (`celular`, `email`, `telefone`). Ao excluir ou desmarcar o contato principal, o sistema SHALL promover automaticamente outro contato do mesmo tipo a principal ou liberar a sinalização se não houver remanescente.

#### Scenario: Contato principal exclusivo por tipo
- **WHEN** um contato marcado como principal é excluído e existe outro contato cadastrado do mesmo tipo para a pessoa
- **THEN** o sistema promove automaticamente outro contato do mesmo tipo a principal na mesma transação atômica

#### Scenario: Exclusão do único contato do tipo
- **WHEN** o único contato de determinado tipo é excluído
- **THEN** o sistema conclui a remoção e libera a flag sem inconsistências para o tipo correspondente

#### Scenario: Atualização individual de documento
- **WHEN** uma requisição PUT é enviada para o identificador específico de um documento da pessoa
- **THEN** o sistema atualiza os atributos informados (número, órgão emissor, UF, data) preservando o histórico de auditoria

### Requirement: Busca de pessoas por CPF com normalização de máscara
O sistema SHALL localizar pessoas por CPF independentemente da presença de máscara, pontos ou traços, sanitizando a entrada para 11 dígitos numéricos e consultando diretamente o `cpf_hash` calculado no escopo da requisição, mantendo a busca textual aproximada por nome quando a entrada não corresponder a um documento sanitizado.

#### Scenario: Busca com pontuação
- **WHEN** o usuário realiza uma busca informando um CPF formatado com pontuação (ex.: 000.000.000-00)
- **THEN** o sistema calcula o hash dos 11 dígitos no request e retorna com precisão a pessoa correspondente cadastrada no tenant

#### Scenario: Busca textual por nome
- **WHEN** o usuário realiza uma busca informando um texto alfabético
- **THEN** o sistema aplica filtro de aproximação sobre a coluna de nome da pessoa

### Requirement: Auditoria transacional sistemática de mutações
O sistema SHALL registrar na tabela `audit_logs`, por meio do `AuditLogger`, todas as operações de mutação do ciclo de vida de pessoas (criação, atualização, exclusão, adição e encerramento de vínculos, alteração e exclusão de sub-entidades, promoção a usuário e importações com ou sem deduplicação), registrando tenant_id, usuário executor, módulo, ação, identificador do recurso e estados anterior e posterior.

#### Scenario: Promoção auditada
- **WHEN** um administrador promove uma pessoa a usuário
- **THEN** a ação `pessoa.promovida` é registrada em `audit_logs` contendo o ID do usuário autor, o tenant e os dados resultantes do vínculo

#### Scenario: Exclusão de contato auditada com before e after
- **WHEN** um contato de uma pessoa é excluído
- **THEN** o registro de auditoria documenta o estado anterior do contato removido e a eventual promoção do contato sucessor

### Requirement: Processamento de importação exclusivamente assíncrono
O sistema SHALL processar todas as solicitações de importação de pessoas de sistemas externos exclusivamente por meio de eventos da tabela `outbox_events` e execução em fila em segundo plano com política de retry e backoff exponencial, assegurando resposta HTTP imediata (202 Accepted) e acompanhamento detalhado via registros de `PessoaSyncLog`.

#### Scenario: Request não bloqueia na integração
- **WHEN** uma importação de pessoa por documento é solicitada via API
- **THEN** a resposta HTTP 202 é retornada imediatamente informando o agendamento, enquanto o processamento ocorre via worker assíncrono com status observável em `sync-logs`

#### Scenario: Falha de comunicação externa registrada em sync log
- **WHEN** o worker tenta sincronizar os dados e o serviço externo falha ou excede o timeout
- **THEN** o sistema registra o log de falha com detalhes em `PessoaSyncLog` e aplica o retry programado sem travar a thread de atendimento

### Requirement: Cobertura abrangente de testes de feature e isolamento
O sistema SHALL possuir suíte automatizada de testes de feature e integração que valide rigorosamente a unicidade de CPF por tenant, o isolamento multi-tenant impedindo vazamento de dados entre prefeituras, os fluxos de promoção a usuário (sucesso, tentativa sem permissão e tentativa sobre pessoa já promovida), a concorrência na eleição de contato principal, a exportação em formatos JSON e CSV, e a execução assíncrona do pipeline de importação.

#### Scenario: Validação de isolamento e unicidade entre tenants
- **WHEN** dois tenants distintos cadastram pessoas com o mesmo CPF
- **THEN** ambos os cadastros são aceitos com sucesso e nenhum tenant tem visibilidade sobre os registros do outro

#### Scenario: Garantia de exportação íntegra
- **WHEN** o endpoint de exportação é acionado com formato CSV ou JSON
- **THEN** o arquivo gerado contém os dados dos munícipes e servidores do tenant solicitante respeitando o mascaramento de documentos

### Requirement: Consumo de dados mestres (MDM) por módulos satélites
O sistema SHALL disponibilizar suporte para que outros módulos do ecossistema SYSGOV referenciem registros de pessoas por meio da chave estrangeira nula `pessoa_id` com índice composto `[tenant_id, pessoa_id]`, oferecendo contrato e utilitários no SDK TypeScript para consulta e resolução de pessoas por documento sem duplicar atributos civis nas tabelas de domínio satélite.

#### Scenario: Vínculo de operador com pessoa
- **WHEN** um operador de cemitério é cadastrado associando o identificador de uma pessoa física previamente registrada
- **THEN** o registro do operador referencia a pessoa correspondente do cadastro único, mantendo os dados civis centralizados e sem redundância
