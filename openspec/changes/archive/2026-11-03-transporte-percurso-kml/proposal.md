# Proposal

## Why

A rota guarda só os quilômetros digitados à mão (pavimentado e não pavimentado) e o itinerário liga as paradas em linha reta. O trajeto real, desenhado no Google Earth, no Google My Maps ou num aplicativo de GPS, não entra no sistema. O SETE (UFG/CECATE, MIT) resolve isso importando o traçado do percurso de um arquivo de GPS, mostrando-o no mapa e calculando os quilômetros. O órgão já tem esses traçados em **KML**.

## What Changes

- **Importar o percurso de uma rota** a partir de arquivo **KML** (ou KMZ, o KML compactado que o Google Earth e o My Maps exportam).
- **Prévia** antes de gravar: lista as linhas do arquivo (nome, pontos, km), mostra o traçado no mapa e deixa escolher quais linhas entram, **inverter o sentido** e informar quanto do percurso é não pavimentado.
- **Quilômetros calculados** pelo comprimento do traçado e, se o usuário quiser, aplicados em `km_pavimentado` e `km_nao_pavimentado` da rota (alimentam o custo).
- **Percurso guardado na rota** (linha simplificada) e exibido no mapa do itinerário.
- **Auditoria** da importação e da remoção do percurso.
- Fora do escopo: criar paradas a partir dos pontos do arquivo, sugerir rotas automaticamente, roteirização viária e arquivos GPX ou shapefile.

## Capabilities

### Modified Capabilities

- `transporte`: acrescenta o percurso da rota importado de KML.

## Impact

- **Backend**: `Geo/LeitorKml`, `Geo/Percurso` (distância e simplificação), `PercursoService`, `PercursoController`; colunas `percurso`, `percurso_km` e `percurso_importado_em` em `transporte_rotas`.
- **Frontend**: ação "Importar percurso (KML)" na lista de rotas e linha do percurso no mapa do itinerário.
- **Permissão**: reaproveita `transporte.rotas.gerenciar`; ver o percurso exige só `transporte.view`.
- **Sem dado pessoal**: o arquivo não é guardado, só a linha simplificada.
