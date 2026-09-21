# Delta da Especificação: CAPD - Integrações RH & Embed

## ADDED Requirements

### Requirement: Painel Executivo e Métricas de Integração RH
O sistema DEVE apresentar no topo da aba "Integrações RH & Embed" um painel executivo composto por cartões de métricas analíticas (`StatCard` do `@sysgov/ui`), consolidando a saúde das integrações com os sistemas legados de folha e portais embutidos.

#### Scenario: Visualização consolidada de indicadores de integração
- **WHEN** o gestor de RH acessa a sub-aba "Integrações RH & Embed" do Portal do RH
- **THEN** o sistema exibe os cartões com o total de conectores ativos por driver, o total acumulado de sincronizações, a taxa percentual de sucesso das operações e o número de tokens de embed ativos, formatando valores e percentuais em `JetBrains Mono`.

#### Scenario: Tratamento de ausência de conexões configuradas
- **WHEN** o município ainda não possui nenhum conector ERP cadastrado
- **THEN** o sistema exibe os contadores zerados de forma graciosa e um estado descritivo orientando a inclusão do primeiro conector.

---

### Requirement: Gestão e Configuração de Conectores ERP
O sistema DEVE permitir a listagem, criação, edição, teste de conectividade e rotação segura de chave de API para conectores de sistemas de RH e folha de pagamento municipais (Betha, IPM, Senior, TOTVS e REST Genérico).

#### Scenario: Listagem e status operacional dos conectores
- **WHEN** o usuário visualiza a seção de conectores cadastrados
- **THEN** o sistema lista cada conector com seu nome amigável, driver correspondente, URL base, status (Ativo/Inativo), contagem de registros processados e indicador de última sincronização.

#### Scenario: Cadastro de novo conector com validação
- **WHEN** o usuário aciona "Novo Conector" e submete os dados de configuração obrigatórios (nome, driver, URL base, periodicidade)
- **THEN** o conector é cadastrado com credenciais criptografadas e passa a figurar na listagem de integrações disponíveis.

#### Scenario: Rotação segura de API Key
- **WHEN** o usuário solicita a regeneração da chave de autenticação de um conector existente
- **THEN** o sistema exige confirmação explícita através de diálogo modal (`ConfirmDialog`), gera uma nova chave aleatória, invalida a anterior e exibe a nova credencial com opção de cópia imediata.

---

### Requirement: Trilha de Auditoria e Logs de Sincronização
O sistema DEVE registrar e exibir o histórico cronológico de execuções de sincronização (`RhSyncLog`), permitindo filtragem multicritério e inspeção detalhada do payload processado.

#### Scenario: Filtragem analítica do histórico de logs
- **WHEN** o gestor pesquisa logs de sincronização aplicando filtros por tipo de dado (servidores, frequência, afastamentos, homologação), direção (inbound/outbound) ou status de execução
- **THEN** o sistema filtra os registros na tabela analítica (`DataTable`), exibindo data/hora, quantidade de registros afetados em `JetBrains Mono` e o status da rotina.

#### Scenario: Inspeção do detalhe do log
- **WHEN** o gestor clica para inspecionar um log que resultou em falha ou inconsistência
- **THEN** o sistema abre um modal apresentando o traceback do erro, a mensagem retornada pelo conector e o payload recebido formatado.

---

### Requirement: Emissão, Gerenciamento e Simulação de Tokens de Embed
O sistema DEVE fornecer ferramenta visual para o DRH emitir tokens seguros de incorporação headless (`CapdEmbedController`), gerando snippets prontos para `<iframe>` e simulador sandbox para teste em tempo real.

#### Scenario: Geração de token de embed parametrizado
- **WHEN** o operador escolhe o módulo de incorporação (autoavaliação, diário de bordo, espelho avaliativo ou recurso), define o tempo de expiração (TTL em minutos) e solicita a emissão do token
- **THEN** o sistema gera o token criptográfico, monta a URL pública segura e gera o código HTML do `<iframe>` com atributos de sandbox recomendados.

#### Scenario: Cópia rápida do snippet de incorporação
- **WHEN** o operador clica no botão "Copiar Código HTML"
- **THEN** o código do snippet é transferido para a área de transferência do navegador e um alerta visual de sucesso é exibido.

#### Scenario: Pré-visualização e teste no simulador sandbox
- **WHEN** o operador alterna para a aba "Simulador Sandbox"
- **THEN** o sistema carrega a URL de embed em um container simulado, permitindo validar a responsividade e o comportamento da interface incorporada sem sair do Portal do RH.
