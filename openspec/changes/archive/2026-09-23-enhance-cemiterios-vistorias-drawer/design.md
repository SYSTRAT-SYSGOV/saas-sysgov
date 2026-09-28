# Design: Galeria de Vistorias e Laudos Fotográficos no Drawer do Jazigo

## Context

O Drawer `DetalheJazigo` atualmente renderiza quatro blocos: Cabeçalho de Status, Dimensões e Localização, Concessão Vinculada, Ocupantes Sepultados e Linha do Tempo. Integrar vistorias técnicas e fotos de laudo enriquece a tomada de decisão antes de processos de ruína e manutenção.

## Goals / Non-Goals

**Goals:**
- Criar o componente `SecaoVistoriasJazigo.tsx` com lista de vistorias, laudos e fotos.
- Criar modal de lightbox/zoom para ampliação das fotos de vistoria (`ModalFotoVistoria.tsx`).
- Criar o componente `ModalNovaVistoriaJazigo.tsx` para cadastro ágil com upload de fotos via `paraFormData` e consumo do endpoint `cemiteriosApi.registrarVistoria`.
- Utilizar badges semânticos do Design System (`FiscalSeverity` ou `StatusChip`).

**Non-Goals:**
- Processamento de imagem no backend (a API recebe os arquivos de imagem em FormData e armazena os metadados).

## Decisions

1. **Card Expansível e Galeria de Fotos no Drawer**:
   - Cada vistoria exibe um cabeçalho com a data formatada, badges de risco (baixo = verde, médio = âmbar, alto = rose) e conservação.
   - Fotos são renderizadas em grid de miniaturas com clique para ampliação em modal lightbox.

2. **Revalidação Reativa**:
   - Ao concluir o registro de uma nova vistoria, o hook `useDados` da lista de vistorias e o histórico do jazigo são recarregados imediatamente.

## Risks / Trade-offs

- [Fotos pesadas ou muitas fotos] → Miniaturas no drawer limitadas a tamanho compacto (h-16 w-16) com `object-cover` e lazy loading para não sobrecarregar a memória do navegador.
