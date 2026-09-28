# Proposta: Navegação Cruzada com o Mapa GIS (Localização Cartográfica & Visualização Espacial)

## Why

Os gestores e fiscais de cemitérios municipais operam frequentemente alternando entre a visão tabular analítica do inventário (código, capacidade, titulares, datas de sepultamento) e a visualização espacial georreferenciada no mapa GIS (localização no cemitério, quadra, arruamentos, proximidade física e orientação). 

Atualmente, para localizar um jazigo no mapa a partir do inventário, o operador precisa memorizar o código, trocar manualmente para a aba "Mapa" e digitar o código na caixa de pesquisa. Essa fricção operacional reduz a produtividade das equipes de campo e da administração central.

A navegação cruzada direta entre a listagem/drawer do inventário e a aba cartográfica GIS fecha esse elo, permitindo com um único clique voar (`flyToBounds`) e focar imediatamente na sepultura selecionada, além de apresentar visualização de coordenadas técnicas e status georreferenciado diretamente no Drawer de detalhes.

## What Changes

1. **Ação "Ver no Mapa" na Tabela do Inventário**: Botão com ícone `MapPin` nas ações de cada linha da tabela `DataTable`, acionando a transição imediata para a aba Mapa GIS com a unidade pré-selecionada e zoom automático.
2. **Card de Georreferenciamento e Ação no Drawer**: No Drawer `DetalheJazigo`, exibição destacada das coordenadas em `JetBrains Mono` (`font-mono tabular-nums`), indicação de unidade georreferenciada ou pendente de mapeamento, e botão de ação para navegar ao mapa.
3. **Comunicação Inter-Abas no Shell do Módulo (`CemiteriosModule`)**: Mecanismo de estado compartilhado (contexto ou propriedades) permitindo que a seleção ou intenção de navegação a partir do `InventarioView` alterne a aba ativa para `mapa` e injete o alvo no `MapaView` para voar ao envelope correspondente.
