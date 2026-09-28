# ADR-007: Modo humanizado como reestilização client-side, não uma camada de tiles ilustrada

- **Status**: Aceita
- **Data**: 2026-09-26
- **Mudança relacionada**: `openspec/changes/cemiterios-mapa-gis-avancado`

## Contexto

O objetivo central desta mudança é uma "planta humanizada" acolhedora para visitantes, com vegetação,
caminhos ilustrados e paleta pastel, para o Cemitério Municipal Jardim Independência e demais necrópoles.
O mapa técnico atual já renderiza as mesmas camadas vetoriais (parques, setores, jazigos) via duas funções
puras de estilo em `mapa.utils.ts` (`estiloFeicao`/`estiloJazigoSemantico`), consumidas por `GeoJSON` do
`react-leaflet`.

## Decisão

Implementar o modo humanizado como uma reestilização em tempo real das mesmas camadas vetoriais já
carregadas — um parâmetro de modo nas funções de estilo existentes, mais camadas adicionais leves
(vegetação como pontos, caminhos redesenhados com aparência de piso), tudo renderizado no cliente a partir
do mesmo GeoJSON que já chega do backend. Nenhuma nova chamada de API é feita ao alternar de modo.

## Alternativas consideradas

- **Gerar/hospedar uma camada de tiles (raster) ilustrada da planta**, produzida em uma ferramenta de
  design fora do sistema e servida como imagem de fundo: produziria um resultado visual potencialmente mais
  rico, mas criaria um segundo canal de dados a manter manualmente sincronizado com a geometria real — toda
  vez que um jazigo fosse desenhado, movido ou uma quadra remodelada, a "planta ilustrada" ficaria
  desatualizada até alguém regenerá-la manualmente.
- **Renderizar a planta humanizada em SVG estático gerado no servidor** (imagem única por necrópole): evita
  o descompasso do raster hospedado à parte, mas perde interatividade (não seria possível clicar num jazigo
  na planta humanizada para abrir seus detalhes, nem manter a mesma seleção/filtros ao alternar de modo,
  como a spec exige).

## Consequências

- (+) A planta humanizada nunca desalinha do cadastro real: qualquer edição de geometria aparece
  imediatamente nos dois modos.
- (+) Interatividade completa preservada (seleção, filtros, clique em jazigo) em ambos os modos.
- (−) O resultado visual depende do que é possível expressar com estilo vetorial (cor, opacidade, ícones de
  ponto) — não alcança o acabamento de uma ilustração desenhada à mão; se o município exigir um acabamento
  artístico mais elaborado no futuro, será necessário revisitar esta decisão.
