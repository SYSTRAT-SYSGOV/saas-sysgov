# Design

## Context

O módulo Gestão de Cemitérios Municipais (SIGCM) possui na tela `InventarioView.tsx` uma interface inicial que realiza buscas simples e exibe jazigos em uma tabela com poucos atributos. No entanto, a gestão física de necrópoles exige uma visão gerencial de alto nível combinada com controles operacionais avançados.

O módulo CAPD (`apps/web-client/src/modules/capd`) estabeleceu um padrão de excelência de interface no SYSGOV através do uso de `StatCard` com acentuações semânticas nas bordas, tipografia técnica obrigatória (`JetBrains Mono`, `tabular-nums`) e `DataTable` de TanStack Table com ordenação, filtros avançados e exportação multiformato (CSV/XLSX/PDF).

Este documento detalha o desenho técnico para elevar o inventário cemiterial ao mesmo patamar visual e funcional do CAPD.

## Goals / Non-Goals

**Goals:**
- Implementar grid superior de indicadores (KPIs) utilizando os componentes `StatCard` de `@sysgov/ui` com o padrão semântico do CAPD.
- Adicionar painel de filtros avançados com suporte a seleção em cascata (Cemitério $\to$ Setores), tipos de unidade, estados, faixas de ocupação e busca textual combinada.
- Adotar o componente padrão `DataTable` com ordenação numérica/alfanumérica real (`meta.sortValue`), paginação com múltiplos tamanhos de página e exportação nativa (`meta.exportValue`).
- Expandir o painel lateral (Drawer) de detalhes do jazigo com visão de ocupantes inumados, dados da concessão ativa, dimensões e histórico completo.
- Manter 100% de conformidade com o Design System oficial (`DESIGN_SYSTEM.md`), tipografia em `JetBrains Mono` para dados técnicos e isolamento multi-tenant.

**Non-Goals:**
- Não altera a máquina de estados do jazigo nem regras de negócio do DRS já aprovadas (RF-01 a RF-05).
- Não substitui nem modifica o componente `MapaView` ou a biblioteca GIS/Leaflet.
- Não introduz dependências externas de UI fora de `@sysgov/ui` e do monorepo.

## Decisions

### 1. Grid de Métricas Operacionais com `StatCard` no Padrão CAPD
**Decisão**: Utilizar o componente `StatCard` de `@sysgov/ui` organizado em um grid responsivo (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5`).
- **Métricas**:
  1. *Total de Unidades*: volume total cadastrado no escopo atual (`border-l-primary`);
  2. *Disponíveis*: vagas livres aptas a concessão ou inumação imediata (`border-l-emerald-500`);
  3. *Concedidas*: unidades sob contrato ativo (`border-l-indigo-500`);
  4. *Ocupadas*: unidades com restos mortais inumados (`border-l-cyan-500`);
  5. *Capacidade Máxima*: unidades com 100% dos nichos/gavetas preenchidos (`border-l-rose-500`);
  6. *Em Manutenção*: unidades em ruína ou reparo interditadas (`border-l-amber-500`).
- **Racional**: Uniformidade imediata com o Portal do Servidor e Portal do RH do CAPD, transmitindo segurança e clareza aos gestores municipais.

### 2. Painel de Filtros Avançados Integrado
**Decisão**: Criar componente `InventarioFiltros` integrado à barra superior da tabela com:
- Seletor de Cemitério com contagem de unidades;
- Seletor de Setor/Quadra dependente do cemitério ativo;
- Seletor de Tipo de Unidade (Jazigo, Gaveta, Ossuário, Cova Pública);
- Seletor de Estado Operacional com chips semânticos (`EstadoChip`);
- Seletor de Faixa de Ocupação (Todas, Vazio [0%], Parcial [1..Cap-1], Lotado [Capacidade]);
- Busca textual instantânea por código do jazigo ou identificador do concessionário;
- Botão "Limpar Filtros" e tag informando a quantidade de registros filtrados.
- **Racional**: Permite que o operador filtre e localize qualquer sepultura em menos de 3 cliques, essencial para atendimento funerário ágil.

### 3. Configuração Completa de `DataTable`
**Decisão**: Configurar `DataTable` com colunas ricas e metadados de exportação:
- **Colunas**:
  - `codigo`: formatado com `<Mono className="font-bold">`, ordenável por `meta.sortValue`;
  - `cemiterio`: nome do cemitério e setor (`setor.codigo`);
  - `tipo`: tipo legível com ícone ou identificador textual;
  - `ocupacao`: barra visual compacta de progresso + indicador mono (`ocupacao/capacidade`);
  - `dimensoes`: comprimento × largura em metros com tipografia mono;
  - `estado`: `EstadoChip` com cores semânticas oficiais do Design System;
  - `acoes`: botão de acesso rápido aos detalhes no Drawer e alteração de estado.
- **Exportação**: habilitação de `exportable` para gerar planilhas e relatórios para a Secretaria de Serviços Públicos.

### 4. Drawer de Detalhes Completo
**Decisão**: Reestruturar o `DetalheJazigo` para exibir cartões temáticos de informação:
- *Dados Físicos*: tipo, capacidade, dimensões, georreferenciamento;
- *Concessão Vigente*: titular, número do termo, data de início e término (ou indicação de perpétua);
- *Ocupantes*: tabela/lista de restos mortais inumados com nome, data de inumação e grau de parentesco;
- *Histórico*: linha do tempo cronológica com autor, motivo e data em formato mono;
- *Ação de Manutenção*: modal de confirmação com motivo obrigatório para transição segura de estado.

## Risks / Trade-offs

- **Volume de Jazigos em Memória**: Municípios de grande porte podem ter mais de 10.000 jazigos por cemitério.
  $\to$ **Mitigação**: Paginação orientada pela API com suporte a `per_page` ajustável e busca filtrada no backend, evitando sobrecarga de renderização no DOM do navegador.
- **Inconsistência de Setores ao Trocar de Cemitério**: Usuário com setor "Setor B" selecionado troca para outro cemitério que não tem "Setor B".
  $\to$ **Mitigação**: Efeito reativo no filtro que reseta automaticamente o `setorId` para `null` caso ele não pertença ao novo cemitério selecionado.
