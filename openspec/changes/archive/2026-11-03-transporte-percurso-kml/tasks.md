# Tarefas — Transporte: percurso da rota por KML

## 0. Antes de começar
- [x] 0.1 Escopo definido pelo usuário: percurso da rota + km (sem criar paradas, sem GPX)

## 1. Backend
- [x] 1.1 Migration: `percurso` (JSON), `percurso_km`, `percurso_importado_em` em `transporte_rotas`
- [x] 1.2 `Geo/Percurso` (haversine, Douglas-Peucker, teto de pontos) e `Geo/LeitorKml` (KML, KMZ, gx:Track, segurança)
- [x] 1.3 `PercursoService` (prévia, gravar, remover, auditoria) e `PercursoController`
- [x] 1.4 Rotas `POST /rotas/{rota}/percurso/previa`, `GET|PUT|DELETE /rotas/{rota}/percurso`; `tem_percurso` e `percurso_km` na rota

## 2. Backend — testes
- [x] 2.1 Leitor: LineString, MultiGeometry, gx:Track, KMZ, pontos/polígonos ignorados, par inválido, vazio
- [x] 2.2 Segurança: DOCTYPE/entidade externa, XML inválido, arquivo grande, KMZ com tamanho descompactado excessivo
- [x] 2.3 Km conferidos à mão; não pavimentado > total; substituição; remoção; auditoria; tenant e permissões
- [x] 2.4 PHPStan nível 6

## 3. Frontend
- [x] 3.1 API e tipos
- [x] 3.2 Modal "Importar percurso (KML)": arquivo, linhas com seleção, inverter, não pavimentado, aplicar km, mapa
- [x] 3.3 Percurso no mapa do itinerário e indicação na lista de rotas
- [x] 3.4 Testes

## 4. Documentação
- [x] 4.1 `docs/modules/transporte.md` e spec principal
