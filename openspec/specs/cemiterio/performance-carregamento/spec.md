# cemiterio/performance-carregamento Specification

## Purpose
Estabelece as metas de tempo de resposta, limites de paginação, carregamento sob demanda (lazy loading) e indexação composta para assegurar a navegabilidade fluida nas telas do módulo de Cemitérios Municipais.

## Requirements

### Requirement: Paginação e Limite de Payload de Jazigos
O sistema DEVE limitar a quantidade padrão de jazigos retornados por página a no máximo 50 registros, tanto na API quanto no componente de listagem do inventário, prevenindo bloqueio do thread e sobrecarga de memória no navegador.

#### Scenario: Carga padrão do inventário de jazigos
- **WHEN** o gestor acessa o inventário de uma necrópole sem especificar tamanho de página customizado
- **THEN** o sistema SHALL solicitar e renderizar 50 jazigos por página por padrão
- **THEN** o payload JSON retornado pela API não deve ultrapassar 50 registros por página

#### Scenario: Navegação paginada em necrópole extensa
- **GIVEN** uma necrópole com mais de 5.000 jazigos cadastrados
- **WHEN** o gestor navega para a próxima página de resultados
- **THEN** a resposta da API SHALL ser entregue em menos de 800 milissegundos aproveitando os índices compostos de ordenação

### Requirement: Indexação Composta para Consultas de Inventário
A base de dados DEVE dispor de índices compostos cobrindo o identificador do tenant, do cemitério e o código do jazigo `(tenant_id, park_id, codigo)`, eliminando operações de ordenação em disco (filesort) e varreduras completas de tabela.

#### Scenario: Consulta de jazigos filtrada por cemitério e ordenada por código
- **GIVEN** a tabela de inventário de jazigos com dezenas de milhares de registros
- **WHEN** a API executa a query de busca filtrada por `tenant_id` e `park_id` com ordenação por `codigo`
- **THEN** o plano de execução (EXPLAIN) SHALL utilizar o índice composto cobrindo o filtro e a ordenação sem disparar filesort

### Requirement: Eliminação de Consultas Redundantes de Cemitérios
O frontend DEVE reutilizar o estado compartilhado de cemitérios e setores já resolvido no provedor de navegação (`CemiteriosContext`), impedindo requisições duplicadas de `/api/cemiterios/parques` ao montar visões internas.

#### Scenario: Transição da seleção municipal para o inventário da necrópole
- **GIVEN** que a lista de cemitérios municipais já foi obtida na inicialização do módulo
- **WHEN** o usuário clica em um cemitério para entrar na sua gestão
- **THEN** o componente de inventário NÃO DEVE disparar uma nova requisição `GET /api/cemiterios/parques`
- **THEN** os dados de setores e identificação da necrópole devem ser lidos diretamente do contexto já existente

### Requirement: Carregamento sob Demanda (Lazy Loading) de Titulares de Concessão
O módulo de Concessões DEVE adiar a requisição de busca de titulares de concessão (`/api/cemiterios/concessionarios`) até o momento em que o usuário selecione expressamente a aba ou modal de titulares.

#### Scenario: Acesso inicial à aba de concessões
- **WHEN** o gestor entra na aba "Concessões"
- **THEN** o sistema SHALL carregar exclusivamente as concessões vigentes daquela necrópole
- **THEN** o sistema NÃO DEVE disparar a consulta da base global de titulares até que a sub-aba de titulares seja aberta pelo usuário
