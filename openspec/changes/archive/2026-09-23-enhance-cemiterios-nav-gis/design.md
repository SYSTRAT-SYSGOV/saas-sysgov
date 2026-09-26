# Decisões de Design: Navegação Cruzada com o Mapa GIS

## 1. Arquitetura de Navegação Inter-Abas

Criar um contexto de navegação leve em `src/modules/cemiterios/CemiteriosContext.tsx`:
- **`CemiteriosNavigationContext`**:
  - `abaAtiva: string`
  - `navegarParaAba: (aba: string) => void`
  - `focoMapa: { jazigoId: number; codigo: string; lat?: number | null; lng?: number | null } | null`
  - `navegarParaMapa: (params: { jazigoId: number; codigo: string; lat?: number | null; lng?: number | null }) => void`
  - `limparFocoMapa: () => void`

Esse contexto é provido pelo shell `CemiteriosModule.tsx` e consumido por `InventarioView.tsx` e `MapaView.tsx`.

## 2. Componente de Georreferenciamento no Drawer

Criar `src/modules/cemiterios/views/LocalizacaoGeorreferenciada.tsx`:
- Exibe card com:
  - Coordenadas geográficas com precisão decimal em `JetBrains Mono` (`lat, lng` com formatação tabular).
  - Badge semântico de status cartográfico:
    - `Georreferenciado` (verde esmeralda, com ícone de pin ativo) quando `lat` e `lng` existirem.
    - `Mapeamento Pendente` (âmbar, com aviso de desenho pendente) quando não houver coordenadas registradas.
  - Botão de ação "Ver no Mapa GIS" com ícone `MapPin`.
  - Se estiver pendente e o usuário tiver permissão `cemiterios.gis.edit`, exibe botão "Desenhar Polígono no Mapa" que já prepara a ferramenta de polígono com o ID do jazigo pré-preenchido.

## 3. Botão "Ver no Mapa" na Tabela do Inventário

Em `InventarioView.tsx`:
- Adicionar o botão de atalho `Ver no Mapa` na coluna `acoes` de cada linha do `DataTable`.
- Ao clicar, chama `navegarParaMapa({ jazigoId: row.original.id, codigo: row.original.codigo, lat: row.original.lat, lng: row.original.lng })`.

## 4. Integração no `MapaView`

Em `MapaView.tsx`:
- Ao montar ou ao receber `focoMapa` do contexto, se houver coordenadas ou jazigo ID:
  - Se `lat` e `lng` estiverem presentes, calcula a caixa delimitadora `[lng, lat, lng, lat]` e ajusta `setEnvelope(...)`.
  - Define `setSelecionado(focoMapa.jazigoId)`.
  - Se `lat` e `lng` forem nulos, realiza busca assíncrona pelo código (`cemiteriosApi.buscar(codigo)`) para obter o envelope retornado pelo backend e dá o zoom.

## 5. Tipografia Técnica & Design System

- Coordenadas e dados numéricos estritamente em `JetBrains Mono` (`font-mono tabular-nums`).
- Componentes exclusivamente do `@sysgov/ui` (`Card`, `Badge`, `Button`).
- Sem pacotes adicionais do npm.
