# Proposal: Galeria de Vistorias e Laudos Fotográficos no Drawer do Jazigo

## Why

A fiscalização e conservação física das unidades de sepultamento municipais demandam comprovação material do estado estrutural dos túmulos (especialmente para respaldar processos de ruína, interdição e editais de abandono com presunção de fé pública). Atualmente, a aba de inventário exibe dados físicos, concessão e inumações, mas não exibe o histórico de vistorias técnicas nem laudos fotográficos anexados, obrigando o gestor a navegar para outras abas. Centralizar as vistorias, classificação de risco e galeria de fotos diretamente no Drawer da sepultura agiliza a tomada de decisão técnica.

## What Changes

- Adição de card/seção **"Vistorias e Laudos de Conservação"** no Drawer `DetalheJazigo`:
  - Listagem cronológica das vistorias técnicas da unidade (`cemiteriosApi.vistorias(jazigoId)`).
  - Badges semânticos de **Estado de Conservação** (Ótimo, Bom, Regular, Ruim, Crítico) e **Nível de Risco** (Baixo, Médio, Alto).
  - Exibição de laudos e pareceres técnicos descritos pelo fiscal.
- Adição da **Galeria Fotográfica de Vistoria**:
  - Miniaturas das fotos capturadas na vistoria com data e hora.
  - Modal de ampliação / lightbox fotográfico para inspeção visual minuciosa dos danos estruturais da sepultura.
- Botão de ação rápida **"Nova Vistoria"** no próprio Drawer:
  - Modal para registro rápido de laudo de vistoria (data, estado de conservação, risco, observações e upload de fotos) que atualiza o histórico e recalcula o estado operacional do jazigo.

## Capabilities

### Modified Capabilities
- `cemiterio/inventario`: Adição dos requisitos para visualização de vistorias técnicas, laudos fotográficos e registro de nova inspeção a partir do Drawer da unidade de sepultamento.

## Impact

- **Frontend (`apps/web-client`)**: Novos componentes `SecaoVistoriasJazigo.tsx` e `ModalNovaVistoriaJazigo.tsx` integrados ao Drawer `DetalheJazigo` em `InventarioView.tsx`.
- **API**: Consumo dos endpoints existentes `GET /api/cemiterios/vistorias?plot_id={id}` e `POST /api/cemiterios/vistorias`.
