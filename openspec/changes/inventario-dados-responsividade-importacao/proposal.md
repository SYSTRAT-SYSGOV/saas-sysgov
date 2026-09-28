# Proposta: Revisão da Listagem de Inventário, Eliminação do Scroll Horizontal e Reconciliação da Importação de Dados

## Why

A listagem de inventário físico dos cemitérios municipais (`InventarioView.tsx`) apresenta gargalos críticos de usabilidade e integridade visual:
1. **Divergência de Dados e Registros Sentinelas**: Foram observados registros importados do sistema legado com dados inconsistentes ou artificiais, como lotes zerados (`Q0000-L0000`), concessões duplicadas gerando contadores de cotitulares incorretos (`+2`, `+1`), registros de inumados com rótulos sentinelas legados (ex.: `"NAO CONSTA FALECIDO"`, datas fictícias como `31/12/2012`), e dessincronização entre a contagem de inumações ativas, o indicador de ocupação (`0/1` vs `1/2`) e os estados do jazigo (`DISPONÍVEL`, `CONCEDIDO`, `OCUPADO`).
2. **Barra de Rolagem Horizontal Indesejada**: O `DataTable` possui excesso de colunas com larguras estáticas elevadas (somando mais de 1.480px), forçando um scroll horizontal permanente em telas padrão desktop e notebooks, o que prejudica a velocidade operacional dos servidores e fiscais do cemitério.
3. **Fragilidade na Importação de Dados**: Tanto o pipeline de migração do acervo legado (`MigrarClipperCommand`) quanto o assistente de importação via planilha (`ModalImportadorJazigos`) necessitam de regras aprofundadas de higienização, deduplicação e validação para evitar a injeção de inconsistências no banco de dados.

## What Changes

- **Eliminação da Barra de Rolagem Horizontal no Inventário**:
  - Reestruturação e compactação das colunas da tabela:
    - Fusão de `Código` e `Setor/Quadra` em uma coluna integrada de **Topografia & Localização** (com código principal em `JetBrains Mono` e quadra/setor como metadado contextual secundário).
    - Compactação de `Tipo & Dimensões` em uma única coluna harmonizada, exibindo dimensões apenas quando preenchidas ou em tooltip de alta densidade.
    - Consolidação de **Titular & Concessão** priorizando a concessão estritamente vigente (evitando contadores fantasmas de concessões passadas/canceladas).
    - Redução da coluna de **Ações** para botão compacto de alta densidade com menu de ações secundárias (QR Code, Ficha Cadastral, Histórico).
    - Aplicação de `table-layout: fixed` ou controle de largura percentual flexível, assegurando visualização completa sem rolagem horizontal em viewports padrão a partir de 1280px.
- **Correção e Reconciliação de Divergências na Listagem**:
  - Ajuste nas consultas do backend (`JazigoController`):
    - Carregamento de concessões filtrando por situação `vigente` e ordenando por vigência atual para exibição correta do titular principal.
    - Carregamento de inumações ativas (apenas sepultamentos vigentes, excluindo exumados/trasladados das métricas de ocupação física).
    - Higienização visual para registros legados sem identificação (exibindo badges ou textos padronizados como *Não identificado / Em apuração cadastral* em vez de strings brutas como `"NAO CONSTA FALECIDO"`).
    - Garantia de alinhamento estrito entre a quantidade de gavetas ocupadas, o badge de estado (`Disponível`, `Concedido`, `Ocupado`, `Capacidade Máxima`) e a barra de preenchimento.
- **Revisão e Aprimoramento da Importação de Dados**:
  - **Migração do Acervo Legado (`MigrarClipperCommand` e comandos de correção)**:
    - Descarte ou isolamento de registros sentinelas inválidos (como quadra `0000` e lote `0000`).
    - Validação de datas de óbito/sepultamento (rejeitando ou sinalizando datas artificiais de virada de ano `31/12/2012` ou datas zeradas `0000-00-00`).
    - Deduplicação robusta de concessionários e termos de concessão.
    - Script de re-sincronização automática para atualizar `ocupacao` e `estado` de todos os jazigos com base nas inumações e concessões vigentes reais.
  - **Assistente de Importação Web (`ModalImportadorJazigos`)**:
    - Suporte a modelo CSV ampliado com validação de dados de setor, capacidade e tipo.
    - Pré-visualização com detecção imediata de códigos duplicados ou divergentes.
    - Otimização do envio para o backend com tratamento transparente de falhas por linha.

## Capabilities

### Modified Capabilities

- `cemiterio/inventario`: Revisa a visualização tabular do inventário físico de túmulos para eliminar a barra de rolagem horizontal, compactar colunas sem perda de dados técnicos (JetBrains Mono) e reconciliar a exibição de concessionários vigentes, inumações ativas, alertas regulatórios e estados operacionais.
- `cemiterio/migracao-legado`: Aprimora as rotinas de importação e higienização de dados do acervo legado (Clipper/CSV), tratando registros sentinelas, datas fictícias, deduplicação de vínculos de concessão e provendo recálculo consistente de ocupação física e estado dos jazigos.

## Impact

- **Frontend (`apps/web-client`)**:
  - `src/modules/cemiterios/views/InventarioView.tsx`: Redesenho das colunas e larguras do `DataTable`, agrupamento informativo, eliminação de overflow horizontal.
  - `src/modules/cemiterios/views/ModalImportadorJazigos.tsx`: Melhorias na importação assistida de unidades.
  - Testes unitários atualizados em `InventarioView.test.tsx`.
- **Backend (`apps/api`)**:
  - `Modules/Cemiterios/Http/Controllers/JazigoController.php`: Eager loading otimizado para concessões vigentes e inumações ativas.
  - `Modules/Cemiterios/Console/MigrarClipperCommand.php` e novo comando de saneamento/reconciliação `cemiterios:reconciliar-inventario`: Higienização de registros corrompidos e sentinelas.
  - `Modules/Cemiterios/Services/JazigoEstadoService.php`: Garantia de sincronização de estado físico.
