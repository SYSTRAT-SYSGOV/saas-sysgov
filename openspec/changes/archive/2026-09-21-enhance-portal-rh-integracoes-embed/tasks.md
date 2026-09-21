# Tarefas de Implementação: Integrações RH & Embed no Portal do RH (CAPD)

## 1. Funções Utilitárias, Tipos e Testes Unitários

- [x] 1.1 Criar o arquivo `IntegracoesEmbedPanel.utils.ts` contendo as interfaces de dados (`RhConector`, `RhSyncLogItem`, `EmbedConfig`), funções de cálculo de KPIs, mascaramento seguro de API Key (`maskApiKey`), gerador de snippet HTML de iframe e validação de URL base; verificar via testes unitários.
- [x] 1.2 Criar a suíte de testes unitários `IntegracoesEmbedPanel.test.ts` cobrindo cenários de cálculo de taxas de sucesso, geração de snippets `<iframe>`, mascaramento de chaves e tratamento de dados ausentes; verificar execução com `npm --prefix apps/web-client test`.

## 2. Painel Executivo e Métricas Analíticas

- [x] 2.1 Criar o componente `IntegracoesEmbedPanel.tsx` estruturando o grid de indicadores executivos com 4 componentes `StatCard` (`@sysgov/ui`), exibindo contadores de conectores ativos, total de sincronizações, taxa de sucesso percentual e tokens embed ativos em `JetBrains Mono`; verificar renderização visual sem quebras de layout.
- [x] 2.2 Integrar o estado do painel com o carregamento assíncrono dos dados via SDK (`api.capd.listIntegracoesRh` e `api.capd.getIntegracoesLogs`) com tratamento gracioso de carregamento e estado vazio; verificar ausência de erros de renderização.

## 3. Gestão e Configuração de Conectores ERP

- [x] 3.1 Implementar a seção de conectores cadastrados com listagem em cards/tabela, exibindo badges para os drivers (Betha, IPM, Senior, TOTVS, REST), status operacional, URLs e endpoints configurados; verificar integridade visual dos elementos.
- [x] 3.2 Implementar modal de cadastro/edição de conector com formulário validado e seleção de periodicidade (tempo real, hora a hora, diário, sob demanda); verificar submissão sem diálogos nativos do navegador.
- [x] 3.3 Implementar fluxo de rotação segura de chave de API com modal de confirmação (`Modal` do `@sysgov/ui`), feedback visual de cópia da nova chave gerada e atualização imediata na lista; verificar comportamento ao confirmar e cancelar.

## 4. Trilha de Auditoria e Logs de Sincronização

- [x] 4.1 Implementar tabela analítica com o componente `DataTable` exibindo os logs de sincronização (`RhSyncLog`), colunas com data/hora, tipo de operação, direção (inbound/outbound), contagem de registros em `JetBrains Mono` e badges de status; verificar paginação e ordenação funcional.
- [x] 4.2 Implementar filtros rápidos por tipo de dado (`servidores`, `frequencia`, `afastamentos`, `homologacoes`) e status (`sucesso`, `erro`, `parcial`); verificar filtragem reativa da tabela.
- [x] 4.3 Implementar modal de detalhes do log para inspeção de payloads de erro e respostas do conector com destaque em bloco monoespaçado legível; verificar abertura e fechamento sem diálogos nativos.

## 5. Assistente de Emissão de Embed e Simulador Sandbox

- [x] 5.1 Implementar formulário de geração de token embed com seleção de escopo (`autoavaliacao`, `diario-bordo`, `espelho`, `recurso`), TTL em minutos e identificação do servidor; verificar chamada ao SDK `api.capd.generateEmbedToken`.
- [x] 5.2 Implementar gerador de código HTML para `<iframe>` com botão de cópia de um clique para o clipboard e alerta de confirmação; verificar cópia bem-sucedida.
- [x] 5.3 Implementar aba de pré-visualização sandbox com container simulado e iframe seguro (`sandbox`), permitindo inspecionar a interface embutida diretamente do Portal do RH; verificar renderização responsiva do simulador.

## 6. Integração no Portal do RH e Verificação Final

- [x] 6.1 Acoplar `<IntegracoesEmbedPanel />` em `apps/web-client/src/modules/capd/views/PortalRhView.tsx` substituindo o placeholder estático na sub-aba `integracao`; verificar carregamento suave ao alternar entre abas.
- [x] 6.2 Executar a verificação completa de tipos (`npx tsc --noEmit`) e rodar a suíte de testes com Vitest (`npm --prefix apps/web-client test`), garantindo zero regressões no frontend e conformidade com o Design System.
