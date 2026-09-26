# Design Técnico: Melhorias no Inventário de Cemitérios

## Contexto

A aba de inventário do módulo de cemitérios (`apps/web-client/src/modules/cemiterios`) gerencia necrópoles municipais, quadras/setores e unidades de sepultamento (jazigos, gavetas, ossuários, covas). Os componentes de interface consumidos pelo módulo derivam do pacote `@sysgov/ui` e da camada `@/components/ui`.

Atualmente, observam-se três gargalos de usabilidade e integridade:
1. **Ações bloqueadas no topo**: Os botões `+ Novo Setor/Quadra` e `+ Novo Jazigo` exigem que um cemitério específico esteja selecionado no filtro de busca (`disabled={!filtros.parqueId}` e `disabled={!parque.dados?.setores?.length}`), frustrando o fluxo de cadastro direto a partir da visão geral municipal.
2. **Falha de fechamento no botão "X" dos modais**: Diversos modais foram criados repassando a prop `onOpenChange={(abrir) => !abrir && onFechar()}` em vez de `onClose={onFechar}`. Na implementação de `Dialog.tsx` de `@sysgov/ui`, a função invocada no fechamento pelo Radix (`DialogPrimitive.Close`) espera `onClose()`. Na ausência da prop, ocorre falha e o modal não fecha ao clicar no "X" ou pressionar Escape.
3. **Paginação não padronizada**: O `DataTable` utiliza `pageSize={25}` com seletor aberto `[10, 25, 50, 100]`, enquanto a diretriz operacional exige listagem sempre fixa em 10 itens por página.
4. **Espaço restrito na cortina lateral (Drawer)**: A largura padrão `sm:max-w-md` (448px) comprime dados críticos de vistorias, inumações e alertas regulatórios.

## Objetivos e Não-Objetivos

**Objetivos:**
- Habilitar permanentemente as ações de cadastro de Setor e Jazigo na barra de ações para usuários autorizados, provendo formulários inteligentes com seleção dinâmica de cemitério/setor.
- Garantir que 100% dos modais e a cortina lateral do inventário fechem infalivelmente pelo botão "X", tecla Escape e clique no backdrop externo.
- Tornar o primitivo `Dialog` / `Modal` e `Drawer` em `@sysgov/ui` tolerante e resiliente, suportando simultaneamente `onClose` e `onOpenChange`.
- Fixar a paginação da listagem em 10 itens por página (`pageSize: 10`) no `DataTable`.
- Aprimorar o respiro visual, hierarquia e legibilidade da cortina lateral (`DetalheJazigo`) e dos modais.

**Não-Objetivos:**
- Alterar schemas de banco de dados, migrações no Laravel ou regras de negócio no backend (`Modules/Cemiterios`).
- Modificar o fluxo de permissões RBAC (`cemiterios.inventario.manage`).
- Alterar as regras matemáticas de cálculo de prazos de exumação ou de concessão regulatória.

## Decisões Técnicas e Arquitetura

### 1. Tolerância Bidirecional em `@sysgov/ui` (`Dialog.tsx` e `Drawer.tsx`)
**Decisão**: Atualizar as interfaces `DialogProps` e `DrawerProps` para aceitar opcionalmente tanto `onClose?: () => void` quanto `onOpenChange?: (open: boolean) => void`. No manipulador interno de fechamento do Radix:
```tsx
const handleOpenChange = (next: boolean) => {
  onOpenChange?.(next);
  if (!next) {
    onClose?.();
  }
};
```
Além disso, adicionar suporte a `description?: React.ReactNode` e `DialogDescription` quando fornecido.
**Alternativas consideradas**:
- *Apenas alterar os modais consumidores*: Resolveria nos call-sites atuais, mas deixaria o primitivo frágil para outros desenvolvedores ou novos modais que utilizem a convenção do shadcn `onOpenChange`. A abordagem combinada (tolerância no componente base + correção nos call-sites) é infinitamente mais robusta.

### 2. Padronização dos Call-Sites dos Modais no Inventário
**Decisão**: Em todos os modais da pasta `views`:
- `ModalQrCodeJazigo.tsx`
- `ModalFichaCadastral.tsx`
- `ModalNovaVistoriaJazigo.tsx`
- `ModalImportadorJazigos.tsx`
- `ModalAcaoLoteManutencao.tsx`
- `ModalImpressaoLoteQr.tsx`
- `ModalFotoVistoria.tsx`
- `comum.tsx` (`FormModal`)

Substituir o padrão inconsistente para o padrão canônico com `open={aberto}` e `onClose={onFechar}`.

### 3. Desbloqueio e Dinamismo nas Ações "+ Novo Setor" e "+ Novo Jazigo"
**Decisão**:
- **Novo Setor**:
  - Remover `disabled={!filtros.parqueId}`.
  - Se `filtros.parqueId` existir, preencher o cemitério ativo automaticamente.
  - Se `filtros.parqueId` for nulo, injetar no formulário modal o campo `parque_id` (Select) alimentado por `parques.dados`. Ao submeter, despachar `cemiteriosApi.criarSetor(parqueId, payload)`.
- **Novo Jazigo**:
  - Remover `disabled={!parque.dados?.setores?.length}`.
  - O campo `sector_id` do formulário passa a exibir os setores disponíveis do município agrupados por cemitério (ex.: `[Nome do Cemitério] - Setor A`), permitindo criar unidades imediatamente. Se não houver setores cadastrados no município, exibir aviso informativo orientando a criar um setor primeiro.

### 4. Paginação Fixa em 10 Registros no `DataTable`
**Decisão**: Ajustar as propriedades do componente `DataTable` em `InventarioView.tsx`:
- `pageSize={10}`
- `pageSizeSelector={false}` (removendo o dropdown de troca de tamanho, garantindo consistência estrita em 10 registros por página).

### 5. Ampliação e Polimento Ergonômico da Cortina Lateral (`Drawer`)
**Decisão**:
- No componente `DetalheJazigo`, passar `className="sm:max-w-lg"` (512px) para o `Drawer`.
- Organizar as seções em blocos com respiro vertical harmonioso, mantendo cabeçalhos de cartões com ícones temáticos (`Layers`, `User`, `History`, `Scale`) e dados em `JetBrains Mono` (`font-mono tabular-nums`).

## Riscos e Mitigações

- **[Risco]** Usuário submeter criação de setor sem selecionar cemitério quando estiver na visão integrada.
  - **Mitigação**: Campo `parque_id` configurado como `obrigatorio: true` com validação de cliente antes do envio à API.
- **[Risco]** Alteração no componente compartilhado `Dialog` quebrar diálogos existentes em outros módulos.
  - **Mitigação**: A alteração é estritamente retrocompatível; `onClose` continua sendo chamado sempre que `next === false`, e `onOpenChange` apenas amplia a tolerância sem efeitos colaterais.

## Plano de Verificação

1. **Testes Unitários / Componentes**:
   - Rodar `npm test` nos pacotes `packages/ui` e `apps/web-client` garantindo que os testes de `Dialog`, `Drawer` e `InventarioView` passem integralmente.
2. **Validação do Botão "X"**:
   - Simular clique no botão "X" em cada modal e no Drawer, verificando se o callback `onClose` é chamado e o modal é ocultado.
3. **Validação de Paginação**:
   - Verificar se a listagem inicial renderiza 10 linhas e que o seletor alternativo foi removido.
4. **Validação dos Botões de Cadastro**:
   - Confirmar que "+ Novo Setor" e "+ Novo Jazigo" estão habilitados mesmo com filtros limpos.
