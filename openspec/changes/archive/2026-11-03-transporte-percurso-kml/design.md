# Design

## Decisões

1. **O arquivo não é guardado.** A prévia lê o KML e devolve as linhas já simplificadas; a confirmação envia as coordenadas escolhidas e o servidor as **valida e recalcula** os km (nunca confia no valor do cliente). Assim não há arquivo temporário nem fila.
2. **Leitura segura do XML.** `DOMDocument` com `LIBXML_NONET`, sem expandir entidades, recusando `DOCTYPE` (XXE e "billion laughs"). KMZ: só `doc.kml` ou o primeiro `.kml` da raiz; tamanho descompactado limitado; nada é extraído em disco.
3. **Geometrias aceitas:** `LineString`, `MultiGeometry` com linhas e `gx:Track`. `Point` e `Polygon` são **ignorados** e contados no aviso ("N pontos ignorados"). Ordem do arquivo preservada.
4. **Coordenadas:** KML usa `longitude,latitude[,altitude]`. Valida faixa (lat ±90, lon ±180), descarta pares inválidos e recusa linha com menos de 2 pontos. Aviso se o traçado sair do retângulo do Brasil.
5. **Simplificação:** Douglas-Peucker com tolerância de ~11 m (0,0001°), como o SETE, e teto de 5.000 pontos por percurso (a tolerância sobe até caber). O km vem da linha **simplificada** (a que fica gravada), com haversine, arredondado a 2 casas.
6. **Limites do arquivo:** 5 MB (KML) / 20 MB descompactado (KMZ), 300.000 pontos antes de simplificar.
7. **Km da rota:** o usuário escolhe aplicar ou não. Aplicar grava `km_pavimentado = total - não pavimentado` e `km_nao_pavimentado`. O km de **um sentido** é o do traçado; o custo já multiplica por viagens por dia.
8. **Percurso na rota:** coluna JSON (`[[lat, lng], ...]`), `percurso_km` e `percurso_importado_em`. A lista de rotas só traz `tem_percurso` e `percurso_km`; a linha vem de `GET /rotas/{rota}/percurso`.
9. **Rota editada depois:** trocar o veículo, a escola ou os km à mão **não** apaga o percurso; a remoção é explícita.

## Perguntas abertas

1. Importar também GPX (o que o SETE realmente lê)? **Fora desta versão**, a pedido.
2. Criar paradas a partir dos pontos do KML? **Fora desta versão**, a pedido.
