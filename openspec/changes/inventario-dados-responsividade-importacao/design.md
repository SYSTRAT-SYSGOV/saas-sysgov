# Documento de Design Técnico: Responsividade do Inventário e Saneamento de Importação

## Context

A aba de inventário do módulo de cemitérios (`InventarioView.tsx`) exibe uma grade detalhada com informações cadastrais, topográficas, jurídicas, físicas e regulatórias de cada unidade de sepultamento. No estado atual, a largura somada das colunas ultrapassa 1.480px, gerando barra de rolagem horizontal forçada. Além disso, a importação histórica a partir de bases legadas do Clipper injetou registros sentinelas (como `Q0000-L0000`, `"NAO CONSTA FALECIDO"`, datas fictícias como `31/12/2012`), bem como gerou concessões repetidas que causam divergência na contagem de titulares e dessincronização entre as gavetas ocupadas e o estado operacional do jazigo.

## Goals / Non-Goals

**Goals:**
- Eliminar a barra de rolagem horizontal da tabela de inventário em resoluções desktop padrão (a partir de 1280px) através da consolidação estratégica de colunas de baixa densidade.
- Garantir que a coluna de Titular/Concessão exiba unicamente os dados da concessão vigente atual, corrigindo contadores inflados de cotitulares (`+2`, `+1`) causados por concessões duplicadas ou inativas.
- Prover tratamento e higienização visual para registros legados com nomes ou datas sentinelas (ex.: `"NAO CONSTA FALECIDO"`, datas arbitrárias).
- Criar um comando Artisan de reconciliação cadastral (`cemiterios:reconciliar-inventario`) para recalcular a ocupação física real (`ocupacao`) e o estado operacional (`estado`) de todos os jazigos com base nas inumações confirmadas e termos de concessão vigentes.
- Aperfeiçoar o `MigrarClipperCommand` para ignorar registros sentinelas inválidos (ex.: quadra/lote `0000`).

**Non-Goals:**
- Não remover dados técnicos existentes: todas as informações (dimensões, livro legado, coordenadas, histórico, certidões) continuam acessíveis no `ModalDetalheJazigo` (Drawer de detalhes) e em tooltips contextuais.
- Não alterar a modelagem de banco relacional existente (schema das tabelas `plot_inventory`, `concessions`, `cemetery_burials` e `deceased_records` permanece intacto).
- Não refazer a lógica interna de cálculo financeiro ou emissão de taxas (mantém-se o padrão do módulo Financeiro).

## Decisions

### 1. Fusão e Consolidação Ergonômica das Colunas do `DataTable`
Para eliminar a barra de rolagem horizontal e trazer a largura total da tabela para menos de 1.100px:
- **Coluna 1 — Seleção (Checkbox)**: `size: 38px`.
- **Coluna 2 — Topografia & Localização** (`size: 140px`):
  - Integra o Código do túmulo (`Q0001-L0002`) em `JetBrains Mono` com link/botão para abrir os detalhes.
  - Subtítulo com Setor/Quadra (`Quadra 0001`) e referência ao livro legado (`Livro: ...`), eliminando a coluna isolada "Setor / Quadra" que ocupava 130px de espaço quase vazio.
- **Coluna 3 — Tipologia & Dimensões** (`size: 110px`):
  - Exibe o tipo de unidade (Jazigo, Gaveta, Ossuário, Cova) e, logo abaixo, as dimensões métricas (`2.2 × 1.1 m` ou `—`), eliminando a coluna autônoma de dimensões (que ocupava 130px).
- **Coluna 4 — Titular / Concessão** (`size: 170px`):
  - Exibe o concessionário titular da concessão vigente, número da concessão e badge de falecido.
  - O contador de adicionais `(+N)` só deve considerar cotitulares efetivos da concessão vigente.
- **Coluna 5 — Ocupação & Gavetas** (`size: 130px`):
  - Exibe fração numérica `N / M gavetas` em tipografia mono e mini-barra de progresso percentual com status (`Livre`, `X livre(s)` ou `Lotado`).
- **Coluna 6 — Sepultados** (`size: 150px`):
  - Exibe o nome do inumado ativo mais recente (ou badge neutro sanitizado se for histórico sem nome), data de sepultamento e contador de outros sepultados na sepultura.
- **Coluna 7 — Estado** (`size: 110px`):
  - Chip padronizado (`Disponível`, `Concedido`, `Ocupado`, `Capacidade Máxima`, `Em Manutenção`).
- **Coluna 8 — Alertas Regulatórios** (`size: 120px`):
  - Badges semânticos de alertas (`Elegível p/ Exumação`, `Concessão a Vencer`, `Regular`).
- **Coluna 9 — Ações** (`size: 90px`):
  - Botão compacto `Ver` com ícone de olho e menu de contexto/ações rápidas secundárias (QR Code, Ficha Cadastral).

### 2. Otimização do Eager Loading no Backend (`JazigoController`)
No método `index` de `JazigoController.php`:
```php
'concessoes' => function ($q) {
    $q->where('situacao', 'vigente')
      ->orderByDesc('id')
      ->select('id', 'plot_id', 'holder_id', 'numero', 'modalidade', 'situacao', 'inicio', 'termino')
      ->with('concessionario:id,nome,documento,titular_falecido');
},
'inumacoes' => function ($q) {
    $q->where('situacao', 'confirmada')
      ->whereNull('deleted_at')
      ->orderByDesc('sepultado_em')
      ->select('id', 'plot_id', 'deceased_id', 'sepultado_em', 'gaveta_numero')
      ->with('falecido:id,nome');
},
```
Essa alteração assegura que concessões antigas extintas não sejam contadas como cotitulares adicionais e que inumações canceladas/exumadas não afetem a visualização de ocupação.

### 3. Tratamento de Nomes Sentinelas no Frontend e API
Criar utilitário de formatação de falecidos:
- Se o nome coincidir com strings sentinelas do Clipper (`"NAO CONSTA FALECIDO"`, `"SEM NOME"`, `"FALECIDO NAO INFORMADO"`, `"DESCONHECIDO"`), renderizar como:
  `<span className="text-muted-foreground/80 italic text-xs">Sem identificação nominal (Histórico)</span>`.
- O valor bruto original permanece preservado no banco para auditoria.

### 4. Comando Artisan de Reconciliação de Inventário (`cemiterios:reconciliar-inventario`)
Criar comando CLI para execução sob demanda ou agendada:
- **Passo 1**: Identificar e listar jazigos sentinelas órfãos com quadra e lote `0000` sem nenhuma inumação ou concessão vinculada, permitindo arquivamento lógico (`soft delete`).
- **Passo 2**: Contar o total de inumações confirmadas para cada jazigo e sincronizar a coluna `ocupacao` de `plot_inventory`.
- **Passo 3**: Recalcular o campo `estado` (`capacidade_maxima`, `ocupado`, `concedido`, `disponivel`, mantendo `manutencao` se já existente).
- **Passo 4**: Deduplicar termos de concessão repetidos gerados pela migração para o mesmo titular e jazigo.

### 5. Blindagem no `MigrarClipperCommand`
No processamento de `LOTES.csv`:
- Adicionar validação para ignorar linhas onde `QUADRA === '0000'` e `LOTE === '0000'`, ou linhas onde ambos sejam nulos/vazios.
- Ao associar falecidos em `DADOS.csv`, se o nome for sentinela, marcar a inumação com flag `revisao_pendente = true`.

## Risks / Trade-offs

- **[Risco] Ocultar informações secundárias na tabela**: Reduzir colunas pode gerar dúvida sobre onde encontrar as dimensões completas ou livro de registro.
  - **Mitigação**: Manter as dimensões no subtítulo do tipo e disponibilizar tooltip rico, além do acesso direto pelo botão "Ver" ao `ModalDetalheJazigo`, onde todos os dados constam de forma ampla.
- **[Risco] Reconciliação alterar estados previamente visualizados**: Jazigos que apareciam como "Concedido" mas que já continham sepultamento podem mudar para "Ocupado".
  - **Mitigação**: Esta é a correção desejada da regra de negócio (ocupação > 0 prevalece sobre concessão). O comando gera relatório detalhado das correções efetuadas antes de persistir.

## Migration Plan

1. Executar os ajustes no frontend em `InventarioView.tsx`.
2. Atualizar as relações no `JazigoController.php`.
3. Implementar e rodar o comando `cemiterios:reconciliar-inventario --tenant=all --dry-run` para auditar inconsistências e em seguida rodar sem dry-run.
4. Atualizar `MigrarClipperCommand.php` para prevenir futuras cargas com ruídos.
