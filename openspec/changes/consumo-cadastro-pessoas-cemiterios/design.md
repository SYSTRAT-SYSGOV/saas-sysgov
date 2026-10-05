# Design Técnico: Consumo do cadastro central de pessoas no web-client (Fase 2 — piloto Cemitérios)

## Contexto
O ecossistema SYSGOV possui um backend consolidado onde o módulo `Pessoas` (`apps/api/Modules/Pessoas`) atua como Master Data Management (MDM) de identidades civis com suporte a criptografia de CPF em repouso, cálculo de `cpf_hash` e exibição segura de `cpf_mascarado`. O módulo de Cemitérios (`apps/api/Modules/Cemiterios`) já recebeu as migrações que adicionam a chave estrangeira `pessoa_id` em `cemetery_operators` e `cemetery_contractors`.

No frontend (`apps/web-client`), o módulo de pessoas já existe registrado via lazy loading. No entanto, formulários operacionais de outros domínios — como coveiros, pedreiros e empreiteiros em Cemitérios — ainda coletavam dados civis em campos paralelos, gerando duplicidade e divergência cadastral. Este design define a arquitetura da camada de consumo reutilizável no `@sysgov/ui`, a orquestração via hooks no `apps/web-client` e a integração piloto no módulo de Cemitérios.

Ver [proposal.md](./proposal.md) para a contextualização e motivação da mudança.

## Objetivos / Não-Objetivos

**Objetivos:**
- Criar e refinar componentes reutilizáveis, controlados e acessíveis no `@sysgov/ui` (`PessoaPicker`, `PessoaCard`, `PessoaFormModal`) seguindo o `DESIGN_SYSTEM.md` e a paleta GOV.BR azul do `web-client`.
- Garantir desacoplamento estrito no `@sysgov/ui`: os componentes são puramente controlados via props (não realizam chamadas HTTP, não conhecem Axios/Fetch, não têm dependência de tenant).
- Padronizar o hook `usePessoas` no `apps/web-client` para orquestrar busca com debounce conservador (300ms), paginação (`page`, `per_page: 20`) e estados de carregamento e erro, reutilizando a instância canônica do `PessoasClient` existente em `src/modules/pessoas/api.ts`.
- Adotar o cadastro central de pessoas no módulo Cemitérios (`OperadoresView.tsx` e `EmpreiteirosView.tsx`) para novos registros gravando `pessoa_id`, sem duplicar colunas civis (`nome`, `cpf`).
- Assegurar conformidade integral com a LGPD: somente `nome` e `cpf_mascarado` são expostos na UI.
- Garantir compatibilidade transparente com registros legados históricos que não possuem `pessoa_id` (fallback para os campos legados).

**Não-Objetivos:**
- Realizar backfill automático ou script de reconciliação de operadores/empreiteiros históricos (escopo de mudança futura dedicada).
- Alterar o backend `apps/api` (nenhum controller, service, model ou migration backend será modificado).
- Unificar as entidades ou telas de `Pessoa` (identidade civil) e `User` (conta de acesso).
- Estender a adoção para outros módulos do sistema (RH, Financeiro, Protocolo) nesta fase.

## Decisões Técnicas de Arquitetura

### 1. Separação de Responsabilidades: UI Controlada vs. Orquestração de Rede
- **Decisão**: Todos os componentes em `@sysgov/ui` (`PessoaPicker`, `PessoaCard`, `PessoaFormModal`) operam de forma puramente controlada (`controlled components`). Eles recebem coleções de dados, estados booleanos de carregamento e callbacks de evento (`onSearch`, `onSelect`, `onQuickCreate`, `onCreated`) por props.
- **Alternativas Consideradas**:
  - *Componente autônomo com fetch interno*: O `PessoaPicker` faria requisições HTTP internamente. **Rejeitado**: Viola o contrato do `@sysgov/ui`, que deve ser agnóstico a transporte de rede e reutilizável tanto no `web` quanto no `web-client` e em diferentes contextos de tenant.
  - *Context global de pessoas*: Injetar dados via React Context. **Rejeitado**: Complexidade desnecessária para seletores pontuais em formulários; hooks locais garantem isolamento de ciclo de vida.

### 2. Contrato de Props do `PessoaPicker`
- **Decisão**: A interface de `PessoaPicker` utilizará o padrão combobox sobre Radix Popover e Command, recebendo:
  ```typescript
  export interface PessoaPickerProps {
    value?: number | null;
    selectedPessoa?: PessoaResumo | null;
    pessoas: PessoaResumo[];
    loading?: boolean;
    onSearch: (termo: string) => void;
    onSelect: (pessoaId: number | null, pessoa?: PessoaResumo | null) => void;
    onQuickCreate?: () => void;
    placeholder?: string;
    disabled?: boolean;
    canCreate?: boolean;
    className?: string;
  }
  ```
- **Rationale**: Ao receber a lista `pessoas` e o callback `onSearch`, a responsabilidade por debounce, cancelamento de requisição e chamada à API fica no hook do consumidor (`usePessoas` no web-client), mantendo a renderização rápida e testável via mocks de arrays simples.

### 3. Orquestração no Web-Client via Hook `usePessoas`
- **Decisão**: Implementar no web-client o hook `usePessoas(filtroInicial?: { per_page?: number })`:
  - Mantém o estado `busca` com debounce de 300ms via `setTimeout`/`clearTimeout` ou hook de debounce interno.
  - Invoca o `PessoasClient.list({ q, page, per_page })` já exportado em `apps/web-client/src/modules/pessoas/api.ts`.
  - Expõe `{ pessoas, loading, erro, page, totalPages, setBusca, irParaPagina, recarregar }`.
- **Alternativas Consideradas**:
  - *Criar um novo client HTTP dedicado*: **Rejeitado**: Viola a regra de não duplicar clientes HTTP no ecossistema; o `PessoasClient` existente do SDK/api.ts já possui interceptors, headers de tenant e tratamento de status.

### 4. Integração no Módulo Cemitérios (Operadores e Empreiteiros)
- **Decisão**:
  - No formulário de inclusão de operador (`OperadoresView.tsx`) e empreiteiro (`EmpreiteirosView.tsx`), substituir os campos manuais de texto de nome e CPF pelo `PessoaPicker`.
  - Ao selecionar uma pessoa física, o componente `PessoaCard` é renderizado logo abaixo do seletor como confirmação visual dos dados vinculados.
  - No envio do formulário (`onSave`), o payload incluirá `pessoa_id: selectedPessoa.id`. Em novos cadastros, os campos legados `nome` e `cpf_cnpj` não serão preenchidos em duplicidade no payload quando `pessoa_id` for informado, ou serão preenchidos de forma derivada sem que o usuário precise digitá-los.
  - Se o usuário não encontrar a pessoa e tiver `cadastros.pessoas.create`, o botão de cadastro rápido aciona o `PessoaFormModal`. Após a criação da pessoa no cadastro central, o hook seleciona a nova pessoa automaticamente.
- **Tratamento de Registros Legados**:
  - Na tabela de listagem e na visualização de detalhes, a UI verifica: `if (operador.pessoa_id && operador.pessoa) { ... } else { /* exibe operador.nome e operador.documento_mascarado legados */ }`.
  - Zero necessidade de backfill ou migração destrutiva.

### 5. Conformidade com LGPD e Segurança
- **Decisão**:
  - O `PessoaPicker` e o `PessoaCard` exibem estritamente `nome` (ou `nome_social`) e `cpf_mascarado` (ex.: `***.456.789-**`).
  - O CPF não mascarado só é manipulado no momento do envio do `PessoaFormModal` via HTTPS diretamente para o endpoint de cadastro seguro (`StorePessoaRequest`), que o criptografa em repouso no backend.
  - Nenhuma informação de `cpf_hash` ou CPF em texto puro é serializada para o DOM do componente.

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| **Digitação rápida gerando flood de requisições no backend** | Médio | Debounce de 300ms no hook `usePessoas`, descartando termos intermediários e cancelando buscas obsoletas. |
| **Usuário sem permissão tentando cadastrar pessoa rápida** | Baixo | Prop `canCreate` no `PessoaPicker` derivada de `can('cadastros.pessoas.create')`, ocultando o botão se a permissão não for atendida; o backend valida com HTTP 403. |
| **Quebra de visualização em registros históricos sem `pessoa_id`** | Alto | Implementação estrita de fallback: os componentes de listagem e detalhe usam `operador.pessoa?.nome ?? operador.nome` e `operador.pessoa?.cpf_mascarado ?? operador.documento_mascarado`. |
| **Incompatibilidade de CSS entre temas** | Médio | Componentes do `@sysgov/ui` utilizam exclusivamente tokens semânticos CSS (Tailwind) e classes utilitárias `cn()`, adaptando-se perfeitamente à paleta GOV.BR azul do `web-client`. |

## Plano de Testes e Validação
1. **Testes de Componente (`packages/ui`)**:
   - `PessoaPicker.test.tsx`: renderização com opções, disparo de `onSearch` ao digitar, seleção de item disparando `onSelect`, exibição de botão de cadastro rápido quando lista vazia e `canCreate=true`, ocultação do botão quando `canCreate=false`.
   - `PessoaCard.test.tsx`: exibição correta de nome, `cpf_mascarado` e vínculos sem expor dados sensíveis.
   - `PessoaFormModal.test.tsx`: validação de campos obrigatórios, bloqueio de submissão com CPF inválido, emissão de `onCreated`.
2. **Testes de Hooks (`apps/web-client`)**:
   - `usePessoas.test.ts`: mock do `PessoasClient`, verificação de chamada com debounce de 300ms, controle de paginação e estados de erro.
3. **Testes de Regressão no Módulo Cemitérios**:
   - Execução de `npm test` no `web-client`, garantindo que `OperadoresView.test.tsx` e `EmpreiteirosView.test.tsx` continuem passando sem quebras.
4. **Verificação TypeScript**:
   - `npm run check:types` ou `tsc --noEmit` limpo em `packages/ui` e `apps/web-client`.
