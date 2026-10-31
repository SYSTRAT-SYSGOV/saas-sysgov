# Tarefas — Transporte, Fase 2: Rotas e itinerários

## 1. Backend — estrutura
- [x] 1.1 Migrations: `transporte_paradas`, `transporte_rotas`, `transporte_rota_paradas` (com `tenant_id`, índices compostos e únicos do design)
- [x] 1.2 Models `TenantAware` (`Parada`, `Rota`, `RotaParada`) com total de km calculado; enum `Turno`
- [x] 1.3 Confirmar a leitura de `escola_escolas` e de `escola_turmas.ano_letivo` sem `EscolaAware` (D11/D12)

## 2. Backend — regras
- [x] 2.1 `ParadaService`: coordenadas em par e dentro da faixa; exclusão bloqueada se usada
- [x] 2.2 `RotaService`: valida escola do tenant, quilometragem, regularidade de empresa/veículo/motorista (409 com o item), calcula selo "irregular" na leitura. Desvio de D13: na edição só confere o item que foi trocado, para que uma rota que ficou irregular depois ainda possa ser renomeada
- [x] 2.3 `ItinerarioService`: adicionar, remover com renumeração, reordenar atômico (faixa temporária), parada repetida 409
- [x] 2.4 Consulta paginada com filtros e contagem de paradas; paradas por rota na ordem. O filtro de situação cobre ativa/inativa; "irregular" é derivado na leitura e só é sinalizado
- [x] 2.5 Policies, auditoria, Controllers, Form Requests, Resources e rotas

## 3. Backend — testes
- [x] 3.1 Isolamento de tenant para paradas, rotas e itinerários
- [x] 3.2 Coordenadas válidas, fora da faixa e só uma delas
- [x] 3.3 Rota: total de km, km negativo, escola de outro tenant
- [x] 3.4 Regularidade: veículo sem vistoria válida, motorista inelegível, contrato vencido (locadora e prestadora), veículo próprio sem empresa, rota que ficou irregular
- [x] 3.5 Itinerário: ordem, repetida, reordenação, parada de fora, remoção com renumeração
- [x] 3.6 Filtros da listagem e isolamento entre paradas de rotas
- [x] 3.7 Permissões e auditoria

## 4. Frontend
- [x] 4.1 Tipos e cliente de paradas, rotas e itinerário em `api.ts` do módulo (mesmo desvio da Fase 1: sem `@sysgov/sdk`)
- [x] 4.2 Aba Paradas: lista, formulário com CEP (serviço de `pessoas/services/cep.ts`), coordenadas digitadas ou pelo mapa
- [x] 4.3 Aba Rotas: lista com filtros e selo de irregular, formulário, editor do itinerário com reordenar
- [x] 4.4 Mapa do itinerário (react-leaflet): marcadores numerados, linha, lista de paradas sem coordenada
- [x] 4.5 Fonte técnica, permissões na interface, `generate:registry`, typecheck e vitest

## 5. Entrega
- [x] 5.1 phpunit, phpstan e front verdes; CI verde
- [ ] 5.2 Conferência no navegador: criar paradas, montar rota, reordenar, ver o mapa
- [ ] 5.3 PR pelo fork; mesclar só com autorização; rebuild de `api` e `web`

## 6. Acréscimos
- [x] 6.1 Veículo, motorista ou empresa usados por uma rota não podem ser excluídos (409), como previsto no comentário da Fase 1
