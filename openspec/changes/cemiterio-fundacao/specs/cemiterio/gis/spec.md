# Spec Delta

## Purpose

Georreferencia cemitérios, setores e jazigos sobre imagem de satélite, valida a topologia contra as regras
legais de distanciamento e dimensão e oferece mapa interativo com camadas, cores por estado, busca com zoom e
histórico do jazigo.

## ADDED Requirements

### Requirement: Mapa base de satélite
<!-- rastreabilidade: RF-15; premissa P01 (sem levantamento topográfico) -->
O mapa SHALL usar como camada base imagem de satélite e mapa de ruas de um provedor externo configurável
(referência: Google Maps; alternativas equivalentes permitidas), sobre a qual os limites de cemitérios, setores
e jazigos são desenhados. A credencial do provedor SHALL ficar no servidor/configuração e SHALL NOT ser
fornecida pelo usuário final.

#### Scenario: Troca de provedor
- **WHEN** o provedor de mapa base configurado é alterado
- **THEN** as camadas de cemitérios, setores e jazigos continuam exibidas nas mesmas posições

### Requirement: Desenho e edição de geometrias
<!-- rastreabilidade: RF-01, RF-02, RF-03 -->
Usuários com permissão de edição GIS SHALL desenhar e editar no mapa o polígono de cada cemitério, setor e
jazigo. O sistema SHALL aceitar e devolver geometrias em GeoJSON com coordenadas WGS 84 (longitude, latitude) e
SHALL rejeitar geometrias inválidas (auto-interseção, anel aberto).

#### Scenario: Polígono auto-intersectante
- **WHEN** o usuário envia um polígono de jazigo cujas arestas se cruzam
- **THEN** o sistema rejeita com erro de validação geométrica

### Requirement: Geração de jazigos em grade
<!-- rastreabilidade: RF-03; RN-07, RN-08 -->
O sistema SHALL permitir gerar jazigos em grade dentro de um setor, a partir de um ponto de origem, uma
orientação (dois pontos no mapa), quantidade de linhas e colunas, dimensões do jazigo, espaçamento e padrão de
código. A geração SHALL recusar espaçamento menor que o distanciamento mínimo e dimensões acima das máximas
parametrizadas, e SHALL criar somente os jazigos inteiramente contidos no setor, informando os descartados.
Códigos já existentes SHALL NOT ser duplicados.

#### Scenario: Grade dentro da quadra
- **WHEN** o usuário gera 10 × 20 jazigos de 2,50 m × 1,20 m com espaçamento de 0,60 m em uma quadra que comporta todos
- **THEN** 200 jazigos são criados como Disponível, com códigos sequenciais e geometrias válidas

#### Scenario: Espaçamento abaixo do mínimo
- **WHEN** o distanciamento mínimo é 0,50 m e o espaçamento informado é 0,30 m
- **THEN** a geração é recusada sem criar nenhum jazigo

### Requirement: Validação topológica
<!-- rastreabilidade: RF-18; RN-07, RN-08; ADR-001 -->
Ao criar ou alterar geometria, o sistema SHALL garantir que: o setor está contido no cemitério; o jazigo está
contido no setor; o jazigo não se sobrepõe a outro jazigo; a distância entre o jazigo e os vizinhos é maior ou
igual ao distanciamento mínimo parametrizado (referência 0,50 m); e as dimensões do jazigo não excedem as
dimensões máximas do túmulo parametrizadas (referência 3,00 m × 2,10 m). Distâncias e dimensões SHALL ser
medidas em metros.

#### Scenario: Jazigo muito próximo do vizinho
- **WHEN** o distanciamento parametrizado é 0,50 m e o novo jazigo fica a 0,30 m do vizinho
- **THEN** o sistema rejeita informando a distância medida e a mínima exigida

#### Scenario: Jazigo fora do setor
- **WHEN** o polígono do jazigo extrapola o polígono do setor
- **THEN** o sistema rejeita a geometria

#### Scenario: Túmulo acima da dimensão
- **WHEN** as dimensões máximas são 3,00 m × 2,10 m e o jazigo mede 3,40 m × 2,00 m
- **THEN** o sistema rejeita informando a dimensão excedida

### Requirement: Mapa interativo por camadas
<!-- rastreabilidade: RF-15, RF-16 -->
O painel do órgão SHALL exibir mapa com camadas ligáveis (mapa base, cemitérios, quadras e jazigos), colorindo
cada jazigo pelo estado — verde para Disponível, vermelho para Ocupado, amarelo para Em Ruína/Manutenção, azul
para Concedido e roxo para Capacidade Máxima — com legenda. O mapa SHALL carregar apenas as geometrias da área
visível (recorte por caixa delimitadora).

#### Scenario: Cores por estado
- **WHEN** a camada de jazigos é exibida
- **THEN** jazigos Disponíveis aparecem em verde, Ocupados em vermelho e Em Ruína/Manutenção em amarelo

#### Scenario: Recorte pela área visível
- **WHEN** o usuário aproxima o mapa sobre uma quadra
- **THEN** somente jazigos que intersectam a área visível são solicitados e desenhados

### Requirement: Busca unificada com zoom
<!-- rastreabilidade: RF-17 -->
O sistema SHALL oferecer busca única por nome do falecido, código do jazigo, número da concessão ou CPF/nome do
concessionário (os dois últimos apenas para perfis autorizados; CPF por correspondência exata), retornando
resultados que, ao serem selecionados, centralizam e aproximam o mapa na geometria do jazigo com animação.

#### Scenario: Busca por CPF
- **WHEN** um operador autorizado busca pelo CPF completo de um concessionário
- **THEN** o resultado lista os jazigos das concessões dele e, ao selecionar, o mapa aproxima o jazigo

#### Scenario: Busca por código do jazigo
- **WHEN** o usuário busca "Q12-J045"
- **THEN** o mapa centraliza no jazigo correspondente e o destaca

### Requirement: Painel lateral de histórico
<!-- rastreabilidade: RF-19 -->
Ao selecionar um jazigo no mapa, o sistema SHALL exibir painel lateral com estado atual, concessão vigente,
ocupantes (respeitando o acesso restrito) e a linha do tempo do jazigo definida em `cemiterio/inventario`.

#### Scenario: Clique em jazigo
- **WHEN** o usuário clica em um jazigo Ocupado
- **THEN** o painel lateral abre com estado, concessão, ocupantes e histórico

### Requirement: Desempenho geoespacial
<!-- rastreabilidade: RNF-03 -->
Consultas geoespaciais do mapa (recorte por área visível e busca com zoom) SHALL responder em menos de 1 segundo
para cemitérios de até 50.000 jazigos, apoiadas em índice espacial.

#### Scenario: Carga de quadra densa
- **WHEN** o recorte visível contém 2.000 jazigos em um cemitério com 50.000 jazigos
- **THEN** a resposta da API é entregue em menos de 1 segundo
