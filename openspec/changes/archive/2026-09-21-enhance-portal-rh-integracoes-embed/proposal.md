# Proposta: Melhorias e Expansão da Aba de Integrações RH & Embed no Portal do RH (CAPD)

## Por Que

Atualmente, a sub-aba "Integrações RH & Embed" (`activeTab === 'integracao'`) dentro do Portal do RH do módulo CAPD (`PortalRhView.tsx`) consiste em um mero componente de marcação estático (placeholder de 15 linhas de texto), sem qualquer interatividade, monitoramento ou controle operacional. 

Entretanto, o backend do SYSGOV (`RhIntegrationController.php` e `CapdEmbedController.php`) já disponibiliza uma infraestrutura de integração madura e segura, suportando múltiplos drivers de conectores ERP (Betha, IPM, Senior, TOTVS e REST Genérico), rotação de chaves de API, logs analíticos de sincronização de servidores e frequência/afastamentos (`RhSyncLog`), além de emissão parametrizada de tokens de incorporação (embed) para autoavaliações, diário de bordo e espelho avaliativo (`CapdEmbedPage.tsx`).

Com a aproximação dos ciclos avaliativos em larga escala nos municípios clientes, os gestores do Departamento de Recursos Humanos necessitam com urgência de um painel unificado e profissional para:
1. Configurar, monitorar e testar conectores com os sistemas de folha de pagamento e gestão de pessoas (ERP);
2. Auditar a integridade das sincronizações de dados cadastrais e ocorrências funcionais por meio de histórico detalhado de logs;
3. Gerar, configurar e simular tokens de embed e snippets de código `<iframe>` para disponibilizar a experiência do CAPD em portais do servidor ou intranets municipais sem atrito de autenticação.

## O Que Muda

- **Substituição do Placeholder Estático**: Remoção do bloco de texto estático em `PortalRhView.tsx` e acoplamento do novo componente modular `<IntegracoesEmbedPanel />`.
- **Painel Executivo de Indicadores (KPIs)**: Implementação de 4 cartões de indicadores analíticos (`StatCard` de `@sysgov/ui`) apresentando:
  - *Conectores Ativos* (com relação total/ativos e badges dos drivers suportados);
  - *Total de Sincronizações Realizadas*;
  - *Taxa de Sucesso (%)* das rotinas de sincronização;
  - *Tokens Embed Emitidos / Ativos* com status de expiração.
- **Gestão Operacional de Conectores ERP / REST**:
  - Listagem dos conectores cadastrados com badges de status, driver (Betha, IPM, Senior, TOTVS, REST), URL do endpoint e segredo de webhook mascarado;
  - Modal para cadastro e edição de conexões com parametrização de frequência de sincronização;
  - Ação de rotação/regeneração segura de API Key mediante confirmação explícita (`ConfirmDialog` / `Modal`);
  - Teste de conectividade e sincronização sob demanda.
- **Trilha de Auditoria e Logs de Sincronização**:
  - Tabela analítica e paginada (`DataTable`) para inspeção de `RhSyncLog`;
  - Filtros por tipo de payload (`servidores`, `frequencia`, `afastamentos`, `homologacoes`, `webhook`), direção (`inbound`/`outbound`) e status (`sucesso`, `erro`, `parcial`);
  - Modal de visualização dos detalhes da carga de dados com payloads em formato JSON legível em `JetBrains Mono`.
- **Gerador e Simulador de Embed Headless**:
  - Formulário para DRH emitir tokens com escopo (`autoavaliacao`, `diario-bordo`, `espelho`, `recurso`), TTL em minutos e identificação do servidor;
  - Geração instantânea de URL segura e snippet de incorporação HTML (`<iframe ...>`);
  - Botão de cópia rápida para a área de transferência com feedback visual (Toast / Badge);
  - Pré-visualização interativa (simulador sandbox) da experiência do servidor incorporada.
- **Conformidade Rigorosa com Design System**: Uso exclusivo dos componentes de `@sysgov/ui` e da fonte `JetBrains Mono` (`font-mono tabular-nums`) para chaves, tokens, números, datas e contadores de registros.

## Capacidades

### Capacidades Modificadas
- `capd`: Expande os requisitos do Portal do RH para adicionar a gestão completa de conectores ERP, auditoria de logs de sincronização e gerador/simulador de tokens de embed.

## Impacto

- **Frontend (`apps/web-client`)**:
  - Criação do componente `apps/web-client/src/modules/capd/IntegracoesEmbedPanel.tsx`;
  - Criação do módulo de funções utilitárias puras `apps/web-client/src/modules/capd/IntegracoesEmbedPanel.utils.ts`;
  - Criação da suíte de testes unitários `apps/web-client/src/modules/capd/__tests__/IntegracoesEmbedPanel.test.ts`;
  - Atualização da aba `integracao` em `apps/web-client/src/modules/capd/views/PortalRhView.tsx`.
- **APIs & SDK**:
  - Consumo direto dos endpoints já providos por `RhIntegrationController` e `CapdEmbedController` via métodos correspondentes no SDK (`api.capd`).
- **Segurança & Multi-Tenant**:
  - Isolamento estrito por `tenant_id` em todas as consultas e operações de regeneração de chave;
  - Mascaramento visual de credenciais sensíveis e cópia segura.
