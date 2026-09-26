# Proposta: Melhorias de Usabilidade, Ações e Modais no Inventário de Cemitérios

## Por que (Why)

Na aba de Inventário da Gestão de Cemitérios Municipais (SIGCM), os botões de ação "+ Novo Setor" e "+ Novo Jazigo" encontram-se indevidamente desabilitados quando o usuário não aplica previamente um filtro por cemitério específico, bloqueando fluxos rápidos de cadastro. Além disso, inconsistências de contrato entre a biblioteca `@sysgov/ui` e os modais da visão impedem o funcionamento do botão de fechar "X" (disparando falha silenciosa ou exceção de execução), a paginação padrão necessita ser padronizada de forma fixa em 10 itens por página, e a cortina lateral de detalhes e os modais precisam de aprimoramentos de ergonomia visual segundo o Design System oficial.

## O que muda (What Changes)

- **Desbloqueio Permanente das Ações de Cadastro**:
  - O botão `+ Novo Setor/Quadra` passa a ficar sempre habilitado para operadores autorizados. Ao ser acionado sem cemitério pré-selecionado no filtro, o formulário modal passa a disponibilizar campo de seleção do Cemitério de destino.
  - O botão `+ Novo Jazigo` passa a ficar sempre habilitado para operadores autorizados. O formulário modal passa a permitir a seleção em cascata ou direta do Cemitério e Setor/Quadra de destino, com opção de redirecionar para a criação de setor caso nenhum exista.
- **Correção e Robustez do Botão "X" nos Modais e Drawer**:
  - Adequação imediata de todos os modais do inventário (`ModalQrCodeJazigo`, `ModalFichaCadastral`, `ModalNovaVistoriaJazigo`, `ModalImportadorJazigos`, `ModalAcaoLoteManutencao`, `ModalImpressaoLoteQr`, `ModalFotoVistoria` e `FormModal`) para vincular a propriedade `onClose` ao disparador de fechamento, sanando a incompatibilidade com `onOpenChange`.
  - Fortalecimento do componente `Modal` / `Dialog` e `Drawer` em `@sysgov/ui` para aceitar com tolerância tanto `onClose` quanto `onOpenChange`, garantindo que o botão "X" (`DialogPrimitive.Close`), a tecla Escape e cliques no overlay executem o callback de fechamento com total confiabilidade.
- **Fixação da Paginação em 10 Itens**:
  - O componente `DataTable` do inventário passa a operar com paginação sempre fixa em 10 registros por página (`pageSize: 10`), simplificando a navegação do operador e padronizando o consumo visual de dados.
- **Aprimoramento Visual dos Modais e da Cortina Lateral (Drawer)**:
  - Melhoria da largura e do respiro visual da cortina lateral (`DetalheJazigo`) para `sm:max-w-lg` (ou variante ampla), permitindo leitura confortável das seções de inteligência regulatória, vistorias, ocupantes e mapa sem quebras indesejadas.
  - Suporte a `description` / subtítulo acessível nos cabeçalhos de modais e padronização com tokens do `DESIGN_SYSTEM.md` do SYSGOV e fontes `JetBrains Mono` (`font-mono tabular-nums`) para todos os dados técnicos.

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)
<!-- Nenhuma nova capacidade raiz necessária além do domínio existente cemiterio/inventario -->

### Capacidades Modificadas (Modified Capabilities)
- `cemiterio/inventario`: Modificação dos requisitos de paginação (fixa em 10 itens por página), habilitação contínua e autônoma das ações de criação de setor e jazigo, fechamento garantido e padronizado de modais/cortina lateral pelo botão "X" e aprimoramentos de ergonomia visual dos componentes.

## Impacto (Impact)

- **Frontend (`apps/web-client`)**:
  - Alterações em `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx` (desbloqueio dos botões de novo setor e jazigo, fixação do pageSize em 10, ampliação e polimento do Drawer).
  - Alterações em `apps/web-client/src/modules/cemiterios/views/comum.tsx` (`FormModal` suportando seleção dinâmica de cemitério/setor).
  - Correção dos modais: `ModalQrCodeJazigo.tsx`, `ModalFichaCadastral.tsx`, `ModalNovaVistoriaJazigo.tsx`, `ModalImportadorJazigos.tsx`, `ModalAcaoLoteManutencao.tsx`, `ModalImpressaoLoteQr.tsx`, `ModalFotoVistoria.tsx`.
- **Design System Compartilhado (`packages/ui`)**:
  - Ajustes de tolerância em `packages/ui/src/components/Dialog.tsx` e `packages/ui/src/components/Drawer.tsx` garantindo suporte bidirecional a `onClose` e `onOpenChange`, além de renderização opcional de `description` (`DialogDescription`).
- **APIs e Banco de Dados**:
  - Nenhuma alteração de schema de banco de dados ou migração necessária; os endpoints existentes de criação de setor (`POST /api/v1/cemiterios/parques/{parque}/setores`) e jazigo (`POST /api/v1/cemiterios/jazigos`) já atendem aos requisitos.
