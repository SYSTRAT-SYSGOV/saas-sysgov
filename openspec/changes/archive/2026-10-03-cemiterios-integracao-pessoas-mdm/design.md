# Design Técnico: Integração do Módulo de Cemitérios com o Cadastro Central de Pessoas (MDM)

## Contexto

Conforme fundamentado em `proposal.md`, o ecossistema SYSGOV definiu o módulo de Pessoas (`Modules/Pessoas` no backend e `apps/web-client/src/modules/pessoas`) como a fonte canônica e autoritativa de dados mestres (MDM) para todas as pessoas físicas vinculadas ao município.

No módulo de Cemitérios (`apps/web-client/src/modules/cemiterios`), o `ModalDetalheJazigo.tsx` concentra as consultas e operações do inventário cemiterial. Sua aba **Concessão & Titulares** atualmente gerencia os dados do titular concessionário com formulários desacoplados e dados duplicados, sem atalho para visualização do cadastro civil unificado e sem integração direta com o seletor universal de pessoas.

O backend de Cemitérios (`Modules/Cemiterios/Models/Concessionario.php`) já dispõe da coluna `pessoa_id` e do relacionamento `belongsTo(Pessoa::class)`. É necessário expor essa integração no frontend e estendê-la de forma consistente em todo o módulo.

## Objetivos / Não-Objetivos

**Objetivos:**
- Integrar a aba "Concessão & Titulares" de `ModalDetalheJazigo.tsx` com o cadastro mestre de pessoas, permitindo visualização rica do perfil (`PessoaDetailView`).
- Prover seleção e substituição de titular com `PessoaPicker` com busca reativa e opção de cadastro rápido inline via `PessoaFormModal`.
- Permitir a criação de nova concessão diretamente a partir do jazigo sem concessão outorgada, exigindo a seleção do titular pelo `PessoaPicker`.
- Garantir que `ConcessoesView`, `ModalNovaInumacao` e `HerdeirosTable` operem harmoniosamente com o seletor mestre de pessoas.
- Respeitar a tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`) e as diretrizes do `@sysgov/ui`.

**Não-Objetivos:**
- Reescrever a estrutura de tabelas ou migrações do banco de dados (as colunas `pessoa_id` já existem nos modelos `concession_holders`, `deceased_records` e `cemetery_operators`).
- Alterar as regras financeiras de cálculo de taxas de concessão ou emissão de guias DAM.

## Decisões Técnicas

### Decisão 1: Invocação do `PessoaDetailView` a partir de `ModalDetalheJazigo`
- **Abordagem**: Ao acionar "Ver Cadastro Central" ou clicar na identificação do titular concessionário na aba Concessão & Titulares, acionar o componente `PessoaDetailView` importado de `@/modules/pessoas/views/PessoaDetailView`.
- **Resolução de ID**:
  - Se `concessionario.pessoa_id` estiver preenchido, abrir diretamente a pessoa correspondente.
  - Se for um registro legado (sem `pessoa_id`), permitir abrir busca rápida ou criar vínculo imediato pelo CPF/documento da concessão.
- **Alternativas consideradas**:
  - *Redirecionar para outra rota (`/cadastros/pessoas?id=...`)*: Rejeitado porque tiraria o operador do contexto do inventário/jazigo, forçando perda da navegação.
  - *Modal customizado local*: Rejeitado por ferir a regra do [AGENTS.md](file:///c:/laragon/www/saas-sysgov/AGENTS.md) de não reimplementar componentes existentes.

### Decisão 2: Refatoração do Modal "Editar Titular" com `PessoaPicker` e Autocompletar
- **Abordagem**: No modal `editandoTitular` em `ModalDetalheJazigo.tsx`:
  - Inserir no topo o componente `PessoaPicker` com `usePessoaPicker`.
  - Ao selecionar uma pessoa física mestre:
    - Preencher automaticamente `nome`, `documento`, `email`, `telefone` e os campos de endereço (`logradouro`, `numero`, `bairro`, `cidade`, `uf`, `cep`).
    - Guardar o `pessoa_id` no payload de atualização do titular (`cemiteriosApi.atualizarConcessionario`).
  - Habilitar o botão de "Nova Pessoa" inline integrado com `PessoaFormModal`, permitindo cadastrar um novo cidadão na base central sem sair do modal do jazigo.
- **Alternativas consideradas**:
  - *Manter apenas os inputs de texto antigos*: Inviável, pois perpetuaria a duplicação cadastral e inconsistência com o MDM.

### Decisão 3: Criação de Nova Concessão na Aba do Jazigo Vago
- **Abordagem**: Quando `concessaoAtiva` for nula na aba Concessão & Titulares, exibir banner informativo com botão destacado `+ Outorgar Concessão / Vincular Titular`.
  - Esse botão abre modal de criação de concessão com:
    - Seletor obrigatório de titular via `PessoaPicker`.
    - Modalidade (perpétua, temporária 5 anos, etc.).
    - Número do Termo de Concessão e Processo Administrativo Municipal.
    - Data de início e término.
  - Ao salvar, a concessão é persistida na API vinculando o `holder_id` com o `pessoa_id` e associada ao `jazigo_id`.

### Decisão 4: Padronização do Hub MDM em Todo o Módulo de Cemitérios
- **Abordagem**:
  - Em `ConcessoesView.tsx`: garantir que os modais de nova concessão e edição usem o `PessoaPicker` atualizado com busca por CPF/nome.
  - Em `ModalNovaInumacao.tsx`: garantir que o requerente e o falecido sejam selecionados ou cadastrados via `PessoaPicker`.
  - Em `HerdeirosTable.tsx`: manter a seleção de herdeiros para sucessão conectada a pessoas físicas do município.

## Riscos / Trade-offs

- **[Risco]** Concessionários legados sem `pessoa_id` associado no banco de dados.
  - **Mitigação**: O sistema continuará exibindo o titular legado normalmente, mas apresentará um botão discreto de "Vincular ao Cadastro Central", permitindo que o operador localize a pessoa mestre ou cadastre e vincule instantaneamente.
- **[Risco]** Modais aninhados (`ModalDetalheJazigo` abrindo `PessoaDetailView` ou `PessoaFormModal`).
  - **Mitigação**: O componente `Modal` de `@sysgov/ui` gerencia `z-index` de forma limpa com `portal`, permitindo que modais sobrepostos fechem individualmente sem fechar o modal pai.
