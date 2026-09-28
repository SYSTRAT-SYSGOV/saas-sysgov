# Design

## Context

O módulo de cemitérios já possui implementações básicas de concessões (cadastro de concessionário, concessão temporária/perpétua simples, expiração automática, renovação e notificação prévia). Este design expande essas funcionalidades para atender ao ciclo de vida jurídico completo conforme especificado nos requisitos. O sistema já utiliza Laravel 13 com arquitetura modular, trait TenantAware para isolamento de dados, policies para autorização e OutboxPublisher para integrações externas.

## Goals / Non-Goals

**Goals:**
- Implementar máquina de estados robusta para concessões com todas as transições especificadas
- Garantir isolamento por tenant em todas as operações relacionadas a concessões
- Manter consistência entre estado da concessão e estado do jazigo vinculado
- Integrar com módulo financeiro via outbox para geração automática de guias de manutenção
- Fornecer histórico auditável completo de todas as transições de concessão
- Suportar documentos digitais associados às concessões com verificação de integridade
- Implementar validações de negócio conforme legislação municipal parametrizável

**Non-Goals:**
- Implementar portal público para concessionários (será feito em mudança separada)
- Integrar com sistemas externos de pagamento (apenas geração de guias via outbox)
- Criar interface para gestão de documentos além do upload básico e download
- Modificar o funcionamento básico de criação/renovação de concessões já existente

## Decisions

### Modelo de Dados
**Decisão:** Estender a tabela existente de concessões e criar novas tabelas para histórico, documentos e herdeiros, todas com tenant_id e usando o trait TenantAware.
**Justificativa:** 
- Reutiliza estrutura existente minimizando impacto
- Garantir isolamento por tenant através do padrão já estabelecido no projeto
- Manter consistência com outras entidades do módulo cemitérios
**Alternativas consideradas:** 
- Criar completamente novas tabelas sem herdar das existentes (rejeitado por duplicar código)
- Usar EAV (Entity-Attribute-Value) para flexibilidade (rejeitado por complexidade e perda de integridade referencial)

### Máquina de Estados
**Decisão:** Implementar máquina de estados usando campo `estado` na tabela concessions com transições controladas através de métodos específicos no service e validações no controller.
**Justificativa:**
- Simples de implementar e entender
- Permite consultas eficientes por estado
- Fácil de auditar e rastrear
**Alternativas consideradas:**
- Usar pacote externo de máquina de estados (rejeitado por sobrecarregar dependência para uso simples)
- Implementar com tabela separada de estados (rejeitado por sobremodelagem para este caso)

### Controle de Concorrência
**Decisão:** Usar lock_version para optimistic locking em todas as transações que modificam concessões.
**Justificativa:**
- Padrão já usado em outras partes do projeto
- Evita bloqueios pesados de pessimistic locking
- Adequado para aplicação com concorrência moderada
**Alternativas consideradas:**
- Bloqueio pessimistic com SELECT FOR UPDATE (rejeitado por impacto na performance)
- Não tratar concorrência (rejeitado por risco de inconsistência)

### Integração Financeira
**Decisão:** Usar OutboxPublisher para publicar eventos quando taxas de manutenção vencem, deixando o módulo financeiro consumir esses eventos e gerar as guias.
**Justificativa:**
- Segue padrão já estabelecido no projeto para chamadas externas
- Desacopla o módulo de concessões do financeiro
- Permite processamento assíncrono e retry em caso de falha
**Alternativas consideradas:**
- Chamada síncrona direta ao módulo financeiro (rejeitado por acoplamento e risco de falha em cascata)
- Usar filas de mensagem (rejeitado por sobrecomplexidade para este caso)

### Armazenamento de Documentos
**Decisão:** Armazenar documentos no sistema de arquivos local com referência na tabela e hash SHA-256 para verificação de integridade.
**Justificativa:**
- Simples de implementar e testar
- Permite verificação de integridade através do hash
- Segue padrões comuns de armazenamento de documentos
**Alternativas consideradas:**
- Armazenar como BLOB no banco (rejeitado por crescimento excessivo do banco)
- Usar serviço externo de armazenamento (rejeitado por dependência externa desnecessária)

### Busca e Filtros
**Decisão:** Estender as existentes funcionalidades de busca e filtros na listagem de concessões para incluir os novos campos e estados.
**Justificativa:**
- Reutiliza componentes e patterns já existentes
- Minimiza trabalho de desenvolvimento
- Mantém consistência de experiência do usuário
**Alternativas consideradas:**
- Reimplementar do zero (rejeitado por duplicar esforço)
- Usar biblioteca externa de busca avançada (rejeitado por sobrecarga)

## Risks / Trade-offs

[Risco de inconsistência entre estado da concessão e estado do jazigo] → Mitigar com transações de banco que atualizam ambas as entidades atomicamente e validações em tempo real

[Complexidade na manutenção da máquina de estados à medida que novas regras são adicionadas] → Mitigar com documentação clara das transições permitidas e testes abrangentes de cada cenário

[Dependência do módulo financeiro para processamento correto das guias] → Mitigar com contrato claro de eventos e monitoramento de falhas no outbox

[Performance na listagem de concessões com muitos filtros e junções] → Mitigar com índices adequados nas tabelas e paginação eficiente

[Complexidade na gestão de documentos em ambiente de múltiplos servidores] → Mitigar usando storage compartilhado ou sincronização (fora do escopo desta mudança, a ser considerada na arquitetura de infraestrutura)

## Migration Plan

1. Criar novas migrations para tabelas concession_historico, concession_documentos e concession_herdeiros
2. Modificar migration existente de concessões para adicionar novos campos (tipo, estado, data_fim, prazo_anos, taxa_manutencao_centavos, vigencia_manifestacao_dias, lock_version)
3. Atualizar models Concession, ConcessionHistorico, ConcessionDocumento, ConcessionHerdeiro com traits e relacionamentos adequados
4. Criar políticas de autorização para as novas ações e estados
5. Implementar methods no GisService (ou novo ConcessionService) para lidar com todas as transições de estado
6. Atualizar GisController com novos endpoints para todas as operações necessárias
7. Atualizar api.ts no frontend com novos métodos de serviço
8. Atualizar componentes frontend para lidar com novos estados e funcionalidades
9. Criar testes unitários e de feature para cobrir todos os cenários especificados
10. Executar migration em ambiente de teste para validar estrutura
11. Fazer deploy em ambiente de staging para testes de integração
12. Monitorar logs e métricas após deploy em produção

## Open Questions

- Qual é o valor padrão do prazo de manifestação para concessões temporárias vencidas? (Deve ser configurável por tenant)
- O sistema deve permitir download múltiplo de documentos ou apenas individual por vez?
- Como devem ser tratados os casos de concessões que entram em estado de litígio judicial?