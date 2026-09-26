# Proposta: Modernização dos Detalhes da Sepultura, Ficha Cadastral e Filtros Avançados no Inventário de Cemitérios

## Motivação (Why)

A gestão operacional e fiscal do inventário cemiterial exige visualização holística de cada unidade de sepultamento (túmulo/jazigo). O uso anterior de uma cortina lateral retrátil estreita (`Drawer sm:max-w-lg`) limitava a visualização simultânea dos dados cadastrais, técnicos, ocupacionais e históricos, além de omitir integralmente a dimensão financeira (taxas de manutenção anual, guias DAM, situação de adimplência e arrecadação vinculada ao túmulo). Ademais, o modal da ficha cadastral oficial possuía restrições de largura (`max-w-3xl`) que forçavam barras de rolagem excessivas e quebra vertical de informações, e a busca no inventário carecia de filtros avançados para segmentar túmulos por status fiscal, tipo de concessão, capacidade e georreferenciamento.

Esta melhoria substitui a cortina lateral por um Modal Completo com Sub-abas temáticas, expande a Ficha Cadastral para uma visualização ampla e ergonômica sem barras de rolagem desnecessárias, e introduz um painel expansível de Filtros Avançados no Inventário Cemiterial.

---

## O que muda (What Changes)

- **Substituição da Cortina Lateral por Modal Completo com Sub-abas (`ModalDetalheJazigo`)**:
  - Elimina a gaveta lateral retrátil (`Drawer`) estreita de 512px.
  - Implementa modal de grande escala (`size="2xl"` / `max-w-5xl` ou `max-w-6xl`) organizado em 5 sub-abas temáticas e integradas:
    1. **Visão Geral & Cadastro Físico**: Dimensões (m, m²), georreferenciamento, capacidade com indicador de ocupação, estado operacional e ações rápidas (alteração de estado, atalho para mapa GIS, atalho para plaqueta QR Code e Ficha Cadastral).
    2. **Concessão & Titulares**: Termo de concessão vigente, modalidade (perpétua/temporária), vigência, dados do concessionário com CPF/CNPJ mascarado, histórico de sucessões hereditárias e processos administrativos vinculados.
    3. **Sepultados & Inumações**: Grade detalhada de falecidos sepultados por gaveta/carneira, certidão de óbito, cartório de registro civil, datas em `JetBrains Mono`, prazos regulatórios sanitários e elegibilidade para exumação.
    4. **Financeiro & Taxas**: Situação de adimplência consolidada da sepultura (adimplente, pendente, em atraso), extrato de guias de recolhimento emitidas (taxa anual de manutenção, taxas de sepultamento/concessão), valores em centavos (`R$`), situação das guias, download de PDF e emissão de 2ª via.
    5. **Vistorias & Obras**: Histórico de vistorias técnicas com fotos e pareceres, alvarás de obras/reformas executadas por empreiteiros credenciados e linha do tempo de auditoria.
- **Ampliação e Reestruturação da Ficha Cadastral (`ModalFichaCadastral`)**:
  - Expansão da largura do modal para `max-w-5xl` / `max-w-6xl` responsivo.
  - Reorganização do layout do documento em grid inteligente multi-colunas de alta densidade visual.
  - Exibição de cabeçalho municipal, dados do jazigo, titular, inumados e autenticidade com QR Code em visualização contínua na tela, eliminando barras de rolagem excessivas para resoluções padrão desktop (1080p / 1366x768).
- **Painel de Filtros Avançados no Inventário**:
  - Implementação de painel retrátil de filtros com contagem de filtros ativos e ação de limpeza imediata.
  - Filtros combináveis por:
    - **Situação da Concessão**: Com concessão ativa, Sem concessão/Vago, Concessão vencida, Em sucessão hereditária.
    - **Situação Financeira**: Todas, Adimplente (sem débitos), Inadimplente (com guias vencidas), Sem guias geradas.
    - **Ocupação**: Livre (0%), Parcialmente ocupado, Capacidade esgotada (100%).
    - **Georreferenciamento**: Apenas georreferenciados (com GPS), Sem coordenadas.
    - **Regulatório**: Elegível para exumação, Em processo de abandono.
- **Suporte no Backend (`JazigoController` e `FinanceiroController`)**:
  - Inclusão de suporte aos filtros avançados na listagem de jazigos (`JazigoController::index`).
  - Suporte ao filtro por `plot_id` no endpoint de guias (`FinanceiroController::guias`), autorizando visualização para usuários com `cemiterios.view`.

---

## Capacidades (Capabilities)

### Modified Capabilities
- `cemiterio/inventario`: Atualização dos requisitos de visualização detalhada da sepultura (substituição do Drawer lateral pelo Modal estruturado em sub-abas com informações financeiras), ampliação dimensional da Ficha Cadastral sem barras de rolagem e implementação dos filtros avançados.

---

## Impacto (Impact)

- **Frontend (`apps/web-client`)**:
  - [InventarioView.tsx](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/InventarioView.tsx): Substituição da chamada do `DetalheJazigo` drawer pelo novo `ModalDetalheJazigo` com sub-abas; inclusão do painel retrátil de filtros avançados.
  - [ModalDetalheJazigo.tsx](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/ModalDetalheJazigo.tsx): Novo componente modal unificado com 5 sub-abas: Geral, Concessão, Sepultados, Financeiro e Vistorias/Obras.
  - [ModalFichaCadastral.tsx](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/ModalFichaCadastral.tsx): Ampliação para `max-w-5xl`/`max-w-6xl` e reestruturação do grid para eliminação de rolagem vertical.
  - [MapaView.tsx](file:///c:/laragon/www/saas-sysgov/apps/web-client/src/modules/cemiterios/views/MapaView.tsx): Consumo transparente do `ModalDetalheJazigo` ao selecionar túmulo no mapa interativo.
- **Backend (`apps/api`)**:
  - [JazigoController.php](file:///c:/laragon/www/saas-sysgov/apps/api/Modules/Cemiterios/Http/Controllers/JazigoController.php): Adição de parâmetros de filtros avançados (`concessao_status`, `financeiro_status`, `ocupacao_status`, `georreferenciado`).
  - [FinanceiroController.php](file:///c:/laragon/www/saas-sysgov/apps/api/Modules/Cemiterios/Http/Controllers/FinanceiroController.php): Suporte a `plot_id` em `guias()`, associando cobranças por concessão e permitindo leitura com `cemiterios.view`.
- **Compatibilidade e Design System**:
  - Uso estrito de componentes de `@sysgov/ui` (`Modal`, `Tabs`, `Badge`, `Button`, `DataTable`, `Card`).
  - Tipografia técnica JetBrains Mono (`font-mono tabular-nums`) para dados monetários, códigos, datas, dimensões e coordenadas.
