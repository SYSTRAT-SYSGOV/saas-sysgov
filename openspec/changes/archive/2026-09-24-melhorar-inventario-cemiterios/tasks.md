# Tarefas de Implementação: Melhorias no Inventário de Cemitérios

## 1. Fortalecimento da Biblioteca Compartilhada (@sysgov/ui)

- [x] 1.1 Atualizar `packages/ui/src/components/Dialog.tsx` tornando `onClose` opcional e adicionando suporte a `onOpenChange?: (open: boolean) => void` e `description?: React.ReactNode`, garantindo que o fechamento por "X", Escape e overlay funcione de forma interoperável, e verificar com testes unitários em `packages/ui`.
- [x] 1.2 Atualizar `packages/ui/src/components/Drawer.tsx` suportando `onOpenChange?: (open: boolean) => void` e classes customizáveis de largura, verificando se o fechamento pelo botão "X" e backdrop opera sem erros.

## 2. Correção e Padronização dos Modais do Módulo de Cemitérios

- [x] 2.1 Corrigir `apps/web-client/src/modules/cemiterios/views/ModalQrCodeJazigo.tsx` vinculando `onClose={onFechar}` ao invés de `onOpenChange`, garantindo fechamento instantâneo pelo botão "X" e tecla Escape.
- [x] 2.2 Corrigir `apps/web-client/src/modules/cemiterios/views/ModalFichaCadastral.tsx` vinculando `onClose={onFechar}`, garantindo fechamento instantâneo pelo botão "X".
- [x] 2.3 Corrigir `apps/web-client/src/modules/cemiterios/views/ModalNovaVistoriaJazigo.tsx` e `ModalFotoVistoria.tsx` vinculando `onClose`, verificando fechamento sem exceções no console.
- [x] 2.4 Corrigir `apps/web-client/src/modules/cemiterios/views/ModalImportadorJazigos.tsx`, `ModalAcaoLoteManutencao.tsx` e `ModalImpressaoLoteQr.tsx` com `onClose={onFechar}`, verificando o comportamento de fechamento em cada um.
- [x] 2.5 Atualizar `apps/web-client/src/modules/cemiterios/views/comum.tsx` (`FormModal`) para garantir compatibilidade estrita com `onClose` e propagação de foco acessível.

## 3. Desbloqueio e Habilitação Permanente das Ações de Cadastro

- [x] 3.1 Em `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx`, remover a desabilitação `disabled={!filtros.parqueId}` do botão "+ Novo Setor/Quadra" e atualizar o fluxo para permitir a seleção de cemitério caso nenhum esteja filtrado, verificando abertura autônoma do modal.
- [x] 3.2 Em `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx`, remover a desabilitação `disabled={!parque.dados?.setores?.length}` do botão "+ Novo Jazigo" e estruturar o formulário para seleção dinâmica do setor a partir de todos os setores disponíveis, verificando abertura autônoma do modal.

## 4. Fixação da Paginação do Inventário em 10 Itens

- [x] 4.1 Modificar as propriedades do `DataTable` em `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx` fixando `pageSize={10}` e desabilitando seletores concorrentes de tamanho de página (`pageSizeSelector={false}`), verificando que a listagem renderiza estritamente até 10 registros por página.

## 5. Refinamento Ergonômico da Cortina Lateral e Detalhes da Unidade

- [x] 5.1 Atualizar `apps/web-client/src/modules/cemiterios/views/InventarioView.tsx` no componente `DetalheJazigo`, configurando a largura da cortina lateral (`Drawer`) para `sm:max-w-lg`, ajustando espaçamentos e garantindo que o botão "X" feche a cortina suavemente.
- [x] 5.2 Revisar todos os indicadores e textos técnicos no Drawer para assegurar uso obrigatório de `JetBrains Mono` (`font-mono tabular-nums`), verificando aderência visual ao `DESIGN_SYSTEM.md`.

## 6. Testes e Validação Integrada

- [x] 6.1 Executar a suíte de testes unitários do frontend (`npm test -- --run`) nos módulos afetados (`cemiterios` e `@sysgov/ui`), garantindo que todos os testes existentes e novos passem com sucesso.
- [x] 6.2 Executar build e validação de tipos TypeScript (`npm run build` ou `tsc --noEmit`), garantindo zero erros de tipagem.
