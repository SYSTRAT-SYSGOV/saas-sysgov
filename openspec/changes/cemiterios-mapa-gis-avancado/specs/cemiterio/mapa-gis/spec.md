# Spec Delta

## ADDED Requirements

### Requirement: Modo de Apresentação Alternável (Técnico/Humanizado)
O sistema SHALL oferecer um modo de apresentação "humanizado", alternável em relação ao modo "técnico" já
existente, que reestiliza as camadas de parques, setores e jazigos (paleta pastel, bordas suaves,
`fillOpacity` maior) e adiciona elementos de contexto (vegetação, textura de caminhos), reutilizando a
mesma base geoespacial já carregada — sem disparar nova requisição de dados ao alternar.

#### Scenario: Alternar modos preserva estado
- **WHEN** o usuário alterna de técnico para humanizado com um jazigo selecionado e filtros ativos
- **THEN** a seleção e os filtros permanecem e as camadas são reestilizadas sem recarregar

### Requirement: Vegetação no Modo Humanizado
O sistema SHALL exibir, no modo humanizado, uma camada de pontos de vegetação (árvores) com ícones de copa
verde e leve sombra, renderizada apenas nesse modo.

#### Scenario: Exibir vegetação
- **WHEN** o usuário ativa o modo humanizado em um recinto com pontos de vegetação cadastrados
- **THEN** as árvores aparecem como ícones; ao voltar ao modo técnico, elas somem

### Requirement: Textura de Caminhos no Modo Humanizado
O sistema SHALL estilizar, no modo humanizado, as vias/alamedas cadastradas como piso (bege claro, borda
sutil), diferenciando-as visualmente das quadras.

#### Scenario: Caminhos ilustrados
- **WHEN** o modo humanizado está ativo e há vias cadastradas para a necrópole
- **THEN** os caminhos ganham aparência de piso e permanecem legíveis sobre a vegetação

### Requirement: Persistência da Preferência de Modo de Apresentação
O sistema SHALL persistir a preferência de modo (técnico/humanizado) na sessão do módulo, preservando-a
entre a navegação de abas dentro da mesma necrópole ativa.

#### Scenario: Preferência sobrevive à troca de aba
- **WHEN** o usuário ativa o modo humanizado no Mapa GIS e navega para outra aba do módulo e volta ao mapa
- **THEN** o mapa é exibido no modo humanizado, sem exigir nova seleção

### Requirement: Exportação da Planta Humanizada em PNG e PDF
O sistema SHALL permitir, no modo humanizado, exportar a planta como imagem PNG em escala 2× e como PDF
(A3/A4 paisagem) compondo título do cemitério, legenda de estados, indicação de norte e barra de escala.

#### Scenario: Exportar para totem
- **WHEN** o usuário aciona "Exportar Planta" no modo humanizado
- **THEN** o sistema gera o download do PNG em escala 2× com a composição completa e do PDF equivalente

### Requirement: Camadas de Vias e de Equipamentos da Necrópole
O sistema SHALL disponibilizar, isoladas pela necrópole ativa, uma camada vetorial de vias/alamedas
internas e uma camada de equipamentos (portaria, capela, sanitários, administração, pontos de água), cada
uma exibível/ocultável independentemente das camadas de parques, setores e jazigos.

#### Scenario: Equipamentos aparecem fora do fluxo de rota
- **WHEN** o operador ativa a camada de equipamentos da necrópole ativa
- **THEN** o mapa exibe os pontos de portaria, capela, sanitários, administração e água cadastrados, mesmo
  sem nenhum jazigo selecionado

#### Scenario: Isolamento por necrópole ativa
- **WHEN** o usuário está navegando na necrópole A
- **THEN** o mapa não exibe vias nem equipamentos cadastrados para outra necrópole do mesmo tenant

### Requirement: Roteirização Real Portaria→Jazigo com Fallback
O sistema SHALL calcular o trajeto entre o ponto de acesso (portaria) e o jazigo selecionado seguindo as
vias internas cadastradas quando existir um caminho conectando os dois pontos, e SHALL retornar
automaticamente ao traçado em linha reta hoje existente quando não houver vias cadastradas para a
necrópole ou não existir caminho conectando origem e destino.

#### Scenario: Rota segue as vias cadastradas
- **WHEN** o usuário aciona "Como Chegar" para um jazigo cuja necrópole tem vias cadastradas conectando a
  portaria ao setor do jazigo
- **THEN** o mapa traça o trajeto pelas vias internas e exibe a distância real percorrida, não a distância
  em linha reta

#### Scenario: Fallback sem vias cadastradas
- **WHEN** o usuário aciona "Como Chegar" para uma necrópole sem nenhuma via cadastrada
- **THEN** o mapa mantém o comportamento atual de traçar a linha reta entre portaria e jazigo

### Requirement: Clusterização de Jazigos em Zoom Baixo
O sistema SHALL agrupar visualmente (clusterizar) os polígonos de jazigos quando o nível de zoom estiver
abaixo do limiar mínimo de legibilidade individual já usado pela camada de jazigos, expandindo o
agrupamento automaticamente ao aproximar o zoom.

#### Scenario: Necrópole com milhares de jazigos não trava o mapa
- **WHEN** o usuário visualiza uma necrópole com milhares de jazigos no menor nível de zoom em que a
  camada de jazigos é carregada
- **THEN** o mapa exibe agrupamentos (clusters) em vez de milhares de polígonos individuais, e a interação
  (pan/zoom) permanece fluida

### Requirement: Busca Unificada com Debounce e Agrupamento por Tipo
O sistema SHALL disparar a busca unificada automaticamente após 300 ms de inatividade de digitação (sem
exigir confirmação manual), e SHALL agrupar os resultados exibidos por tipo (falecido, jazigo, concessão).

#### Scenario: Busca sem clique em "Buscar"
- **WHEN** o usuário digita ao menos 2 caracteres no campo de busca do mapa e para de digitar
- **THEN** o sistema exibe os resultados automaticamente após 300 ms, agrupados por tipo, sem necessidade
  de submeter um formulário

### Requirement: Validação Topológica em Tempo Real ao Desenhar
O sistema SHALL alertar o operador em tempo real, durante o desenho ou edição de um polígono de jazigo,
quando o traçado atual se sobrepuser a um jazigo vizinho ou ficar fora do setor, antes da tentativa de
salvamento.

#### Scenario: Alerta imediato de sobreposição
- **WHEN** o operador arrasta um vértice do polígono em edição para uma posição que sobrepõe um jazigo
  vizinho
- **THEN** o mapa exibe um alerta visual imediato de sobreposição, sem esperar a resposta de erro do
  salvamento no servidor
