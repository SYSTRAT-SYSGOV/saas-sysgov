# Design — Transporte, Fase 2: Rotas e itinerários

As decisões comuns (D1 a D10) estão em `transporte-fase-1-fundacao-e-frota/design.md`.

## Modelo de dados

- `transporte_paradas`: `nome`, `descricao`, `latitude` e `longitude` (`decimal(10,7)`, nulos), `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `referencia`, `ativa`. Índice `(tenant_id, nome)`.
- `transporte_rotas`: `escola_id`, `ano_letivo` (inteiro), `empresa_id`, `veiculo_id`, `motorista_id` (todos nulos), `nome`, `turno` (`manha|tarde|noite|integral`), `tipo_rede` (`rural|urbana|mista`), `km_pavimentado`, `km_nao_pavimentado` (`decimal(8,2)`, ≥ 0), `horario_saida`, `horario_chegada`, `horario_retorno`, `ativa`, `observacoes`. O **total de km** é um atributo calculado no model (soma, 2 casas), não uma coluna gerada, para rodar igual no SQLite dos testes e no MySQL.
- `transporte_rota_paradas`: `rota_id`, `parada_id`, `ordem` (> 0), `embarque_previsto`, `desembarque_previsto`. Únicos `(rota_id, ordem)` e `(rota_id, parada_id)`.

## Decisões

### D11. Escola da rota não usa `EscolaAware`
A rota guarda `escola_id` como chave comum (escola de **destino**). O Transporte é de secretaria: o coordenador vê as rotas de todas as escolas. O filtro por escola é um parâmetro de consulta, não escopo global.

### D12. Ano letivo vem do Escola
O ano letivo da rota é um inteiro. A lista de anos oferecidos é a dos `escola_turmas.ano_letivo` existentes no tenant, mais o ano corrente. Não existe tabela de ano letivo.

### D13. Regularidade da rota
Ao **criar ou editar** a rota, o Service recusa com 409 e a mensagem do item irregular: empresa da rota ou do veículo (locadora ou prestadora) com contrato vencido, veículo inativo ou sem vistoria válida, motorista inativo ou inelegível. Veículo de origem `propria` não depende de contrato. Rota **já gravada** que fica irregular depois (vistoria venceu) não é alterada: ela é exibida com o selo "irregular" e os motivos, e passa a barrar novas alocações (Fase 3).

### D14. Reordenar o itinerário sem colidir os únicos
A reordenação recebe a lista completa e ordenada de `parada_id`. Dentro de uma transação, o Service primeiro desloca as ordens para uma faixa temporária e depois grava as definitivas, evitando violar `(rota_id, ordem)` no meio da operação. Lista com parada repetida ou de outra rota retorna 422.

### D15. Mapa
Leaflet com tiles OpenStreetMap, como nos demais mapas do `web-client`. Marcadores numerados na ordem do itinerário e uma linha ligando-os na mesma ordem (linha reta; **não** é roteirização viária, e o ADR-006 do Cemitério não é reaproveitado). Paradas sem coordenada ficam numa lista ao lado, com o aviso "sem coordenada". Escolas não têm coordenadas no cadastro, então o destino aparece no cabeçalho do mapa e não como marcador.

### D16. Coordenadas
Informadas clicando no mapa ou digitando. O CEP preenche só o endereço (serviço do navegador); falha do serviço deixa os campos livres.

## Riscos

- Rotas e paradas podem ser numerosas; as listagens são paginadas e filtradas no servidor.
- Excluir parada usada em itinerário: bloqueado com 409; só inativar.
