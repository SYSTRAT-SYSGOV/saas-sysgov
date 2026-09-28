# Tarefas de Implementação (Tasks)

## 1. Backend: Endpoints de Guias e Filtros Avançados de Jazigos

- [x] 1.1 Estender `FinanceiroController@guias` para aceitar parâmetro `plot_id`, relacionar guias de concessão correspondentes e permitir leitura para usuários com permissão `cemiterios.view`. Verificar com teste de requisição HTTP retornando guias vinculadas.
- [x] 1.2 Implementar no `JazigoController@index` os parâmetros de filtragem avançada: `concessao_status`, `financeiro_status`, `faixa_ocupacao` e `georreferenciado`. Verificar executando consultas com combinações de filtros via tinker/curl.
- [x] 1.3 Adicionar testes de feature no backend para validação dos filtros avançados e extração de guias por jazigo em `Modules/Cemiterios/Tests/Feature/InventarioFiltrosAvancadosTest.php`. Verificar execução com `php artisan test --filter=InventarioFiltrosAvancadosTest`.

## 2. Frontend: Tipos, API Client e Componente de Filtros Avançados

- [x] 2.1 Atualizar `api.ts` em `apps/web-client` expandindo os parâmetros de busca de `jazigos()` e tipagem para as guias vinculadas ao jazigo. Verificar compilação com `tsc -b`.
- [x] 2.2 Desenvolver o painel retrátil de filtros avançados `InventarioFiltrosAvancados` integrado a `InventarioView.tsx`, com opções de concessão, regularidade fiscal, ocupação e georreferenciamento, contador de filtros ativos e botão de limpeza rápida. Verificar comportamento em tela.

## 3. Frontend: Modal Completo de Detalhes da Sepultura com Sub-Abas

- [x] 3.1 Criar o componente `ModalDetalheJazigo.tsx` com layout amplo (`max-w-5xl`), cabeçalho com ações rápidas (Ficha Cadastral e QR Code) e 5 sub-abas temáticas: Visão Geral, Concessão, Sepultados, Financeiro e Vistorias/Obras. Verificar renderização de estrutura e navegação de abas.
- [x] 3.2 Implementar a sub-aba "Financeiro" exibindo cards de regularidade fiscal (adimplente/inadimplente), métricas em `JetBrains Mono` (`font-mono tabular-nums`), tabela de guias DAM com download de PDF e solicitação de 2ª via.
- [x] 3.3 Substituir a cortina lateral `Drawer` em `InventarioView.tsx` e atualizar a chamada em `MapaView.tsx` para o novo `ModalDetalheJazigo`, mantendo o export `DetalheJazigo` para compatibilidade. Verificar carregamento assíncrono e ausência de bloqueio na interface.

## 4. Frontend: Ampliação e Rediagramação da Ficha Cadastral Oficial

- [x] 4.1 Reestruturar `ModalFichaCadastral.tsx` para largura ampliada (`max-w-6xl`) e grid multi-colunas de alta densidade visual, exibindo cabeçalho, dados físicos, titular, inumados e autenticidade com QR Code simultaneamente sem barras de rolagem verticais em desktop.
- [x] 4.2 Validar a preservação das regras de impressão `@media print` para saída impecável em folha A4 contínua. Verificar disparando `window.print()` e inspecionando estilos.

## 5. Validação Integrada e Cobertura de Testes

- [x] 5.1 Atualizar e expandir os testes unitários do frontend em `ModalFichaCadastral.test.tsx` e `InventarioView.test.tsx`, e criar teste para `ModalDetalheJazigo.test.tsx`. Verificar executando `npm --prefix apps/web-client run test`.
- [x] 5.2 Executar o build completo de produção do frontend (`npm --prefix apps/web-client run build`) assegurando 0 erros de compilação TypeScript e Vite.
- [x] 5.3 Executar a suíte completa de testes do módulo de Cemitérios no backend (`php vendor/bin/phpunit Modules/Cemiterios/Tests`) garantindo 100% de aprovação.

## 6. Busca Livre por Sepultado, Detalhamento Completo e Edição (Titular e Sepultado)

- [x] 6.1 Backend: Estender `JazigoController@index` com parâmetro `sepultado` para busca profunda em falecidos e inumações (nome, CPF, certidão, médico, etc.), e `OperacaoController@update` para edição de inumações/falecidos com auditoria via `AuditLogger`.
- [x] 6.2 Frontend: Integrar campo de busca livre por sepultado dentro do Accordion de filtros avançados em `InventarioFiltros.tsx` e `InventarioView.tsx`.
- [x] 6.3 Frontend: Exibir dados cadastrais completos do titular (endereço, telefone, e-mail, status de óbito) e sepultados (documentos, certidão de óbito, cartório, médico atestante, livro de sepultamento, coveiro e pedreiro) no `ModalDetalheJazigo.tsx` e `ModalFichaCadastral.tsx`.
- [x] 6.4 Frontend: Implementar modais de edição `ModalEditarTitular` e `ModalEditarInumacao` integrados aos endpoints de atualização com feedback visual e recarregamento automático dos dados.
- [x] 6.5 Testes e Build: Cobertura de testes unitários atualizada em `InventarioFiltros.test.tsx` e `ModalDetalheJazigo.test.tsx`, validação do build de produção Vite (`npm run build`) e suite completa do backend PHPUnit.

## 7. Edição de Informações do Túmulo, Desmascaramento de CPF, Endereço Estruturado com CEP e Modais Ampliados

- [x] 7.1 Backend: Expandir `JazigoController@update` para aceitar alteração de `codigo`, `codigo_legado`, `processo_administrativo`, `tipo`, `capacidade`, dimensões e coordenadas GPS, com registro de auditoria via `AuditLogger`.
- [x] 7.2 Backend: Configurar `ConcessaoController@index` para desmascarar o campo `documento` do titular (`makeVisible(['documento'])`) na consulta por jazigo (`plot_id`) e no `updateTitular`, e suportar endereços detalhados em `validarTitular`.
- [x] 7.3 Frontend: Implementar `cemiteriosApi.atualizarJazigo`, `cemiteriosApi.titular` e função `consultarCep` via ViaCEP com tratamento de fallback no `api.ts`.
- [x] 7.4 Frontend: Ativar a edição das informações do túmulo através de `ModalEditarJazigo`, acessível pelo cabeçalho do modal e pela aba "Visão Geral".
- [x] 7.5 Frontend: Exibir o CPF/CNPJ completo e formatado do titular na aba "Concessão" e na Ficha Cadastral oficial (`formatarCpfCnpj`), garantindo que venha pré-preenchido ao abrir a edição.
- [x] 7.6 Frontend: Aprimorar `ModalEditarTitular` com layout ampliado (`size="xl"`), campos de endereço estruturados (CEP, logradouro, número, complemento, bairro, cidade, UF) e preenchimento automático integrado via CEP.
- [x] 7.7 Frontend: Aprimorar `ModalEditarInumacao` para tamanho expandido (`size="xl"` / `max-w-4xl`), grid espaçoso em 12 colunas sem campos espremidos ou truncados, e inclusão de CPF do falecido.
- [x] 7.8 Testes e Build: Cobertura estendida com 8 testes em `ModalDetalheJazigo.test.tsx`, aprovação em 100% da suíte Vitest (19 arquivos, 66 testes) e PHPUnit (101 testes), além de compilação sem falhas no build de produção.
- [x] 7.9 Frontend & Backend: Correção e ampliação da modal "Editar Informações do Túmulo" (`size="2xl"` / `max-w-4xl`) com layout em 12 colunas sem campos truncados, inicialização correta de capacidade mínima respeitando sepultados existentes, fechamento imediato da modal ao clicar em "Salvar Alterações" e recarregamento automático dos dados (`detalhe.recarregar()` e `historico.recarregar()`), com exibição visível de alertas de erro.
- [x] 7.10 Frontend: Abertura imediata (0ms) do modal "Editar Titular" utilizando dados já carregados no App Shell, e enriquecimento profundo dos cards da sepultura segundo a dinâmica cemiterial brasileira (gaveteiro visual nicho a nicho, cálculo do prazo de carência legal de 3 anos / 36 meses segundo CONAMA e vigilância sanitária, identificação de corpos aptos à exumação para liberação de gaveta familiar, métricas de solo com perímetro e atalho SIG para Google Maps).
- [x] 7.11 Frontend & Banco de Dados: Saneamento e recalibração dos KPIs da tela principal e listagem do inventário cemiterial. Executada migração de dados `2026_09_26_160000_sincronizar_capacidade_minima_jazigos.php` eliminando 15.489 distorções históricas onde a ocupação excedia a capacidade nominal herdada. Recalibrados os cards de KPI (Card "Em Uso / Ocupadas" contabilizando todas as unidades com sepultamentos `ocupacao > 0` sem discrepância de 0 vs 92%, e Card "Em Ruína / Manut." exibindo indicador de interdições sanitárias sem cálculo corrompido de 588%). Enriquecida a tabela do inventário com colunas de Titular/Concessão, Sepultados recentes com somatório de inumados, código topográfico com livro de registro legado e pin GPS, dimensões em metros com cálculo de área em m², e barra de ocupação calibrada sem estouro de gavetas.

