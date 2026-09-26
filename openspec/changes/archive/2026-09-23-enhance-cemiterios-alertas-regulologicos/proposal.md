# Proposta: Alertas de Inteligência Regulológica (Concessões & Exumações)

## Visão Geral e Justificativa

A gestão de necrópoles municipais exige estrita aderência aos códigos de posturas municipais e normativas sanitárias vigentes. Dois dos maiores gargalos operacionais das administrações cemiteriais são:
1. **Controle de Concessões Temporárias**: Identificar antecipadamente títulos perpétuos ou temporários prestes a vencer para emissão oportuna de notificações ou editais de chamamento aos concessionários.
2. **Ciclo de Inumação e Elegibilidade para Exumação**: Identificar sepulturas onde o período legal de inumação (interstício sanitário, tipicamente 3 anos para adultos e 2 anos para crianças) já foi cumprido, tornando os restos mortais elegíveis para translado ao ossuário geral ou gaveta ossária familiar, liberando vagas críticas no cemitério municipal.
3. **Sinalização de Processos de Abandono/Ruína**: Apontar jazigos em estado de abandono comprovado ou notificação em andamento, resguardando o interesse público.

Esta mudança introduz inteligência regulológica automatizada no inventário de jazigos, fornecendo filtros especializados, badges de alerta inteligentes com contagem de dias em `JetBrains Mono` e visualização direta tanto na listagem geral quanto no Drawer de detalhe do jazigo.

## Principais Capacidades Adicionadas

1. **Cálculo Regulatório de Prazos**: Função utilitária pura de domínio sanitário/cemiterial que calcula prazos de vencimento de concessão e tempo decorrido de inumação em relação aos prazos legais.
2. **Badges de Alerta com Indicadores Visuais**: Badges semânticos de alta visibilidade (`Atenção`, `Crítico`, `Elegível`) respeitando o Design System do SYSGOV.
3. **Filtros Regulatórios Rápidos no Inventário**: Filtros dedicados em `InventarioFiltros.tsx` para segmentar instantaneamente jazigos com concessão a vencer (< 60 dias), concessão vencida ou inumação elegível para exumação.
4. **Card de Inteligência Regulológica no Drawer**: Sessão explicativa no Drawer com detalhamento do tempo decorrido, prazo restante, amparo legal e ação de emissão de notificação ou termo de exumação.
