# Proposta: Integração do Módulo de Cemitérios com o Cadastro Central de Pessoas (MDM)

## Por que

No módulo de Cemitérios (`apps/web-client/src/modules/cemiterios`), especificamente na aba de Inventário ao abrir o modal de detalhes do jazigo (`ModalDetalheJazigo`), a aba **Concessão & Titulares** atualmente manipula dados do titular concessionário de forma desacoplada ou manual através de campos de texto genéricos. Essa desconexão impede que os operadores municipais acessem a ficha cadastral centralizada da pessoa (documentos, endereços padronizados, histórico e proteção de dados sensíveis LGPD recentemente implementada no módulo de Pessoas), além de dificultar o reaproveitamento de pessoas físicas já cadastradas no ecossistema SYSGOV na edição de titulares existentes e na criação de novas concessões.

Com a consolidação do módulo de Pessoas como o **Hub de Dados Mestres (MDM)** do SYSGOV, é fundamental integrar todos os pontos de identificação civil do módulo de Cemitérios — começando pelo modal do jazigo (concessão, titulares e cotitulares), estendendo-se para inumações (falecidos e requerentes) e sucessões (herdeiros) — utilizando os componentes unificados `@sysgov/ui` (`PessoaPicker`, `PessoaFormModal`, `PessoaCard`) e os hooks de consumo centralizados.

## O que muda

- **Visualização do Titular no Modal do Jazigo**:
  - Habilitação de botão e atalhos na aba "Concessão & Titulares" para abertura direta da ficha cadastral completa da pessoa (`PessoaDetailView`) no módulo de Pessoas, com visualização de documentos civis, contatos e desmascaramento seguro de dados sensíveis para administradores.
- **Edição de Titulares Conectada ao MDM**:
  - No modal de edição do titular concessionário, integração do componente `PessoaPicker` com busca com debounce, cache e opção de cadastro rápido inline (`PessoaFormModal`), permitindo tanto vincular uma pessoa existente quanto cadastrar uma nova sem descontinuidade de fluxo.
  - Sincronização automática do `pessoa_id` com a API de cemitérios ao salvar a alteração.
- **Novos Cadastros de Concessão e Vínculo de Titulares**:
  - Na aba "Concessão & Titulares", quando o jazigo estiver vago ou pendente de concessão, disponibilização de ação "Nova Concessão / Vincular Titular" integrada ao `PessoaPicker`, viabilizando outorga direta a partir do cadastro mestre.
- **Integração Integral em todo o Módulo de Cemitérios**:
  - Padronização em `ConcessoesView`, `ModalNovaInumacao`, `HerdeirosTable` e `OperadoresView` para que qualquer menção a cidadãos, concessionários, falecidos ou requerentes utilize o seletor mestre `PessoaPicker` e permita inspeção do cadastro central.
- **Conformidade com o Design System**:
  - Utilização estrita dos componentes compartilhados de `@sysgov/ui` e tipografia técnica em `JetBrains Mono` (`font-mono tabular-nums`) para CPF, termos de concessão, processos administrativos e telefones.

## Capacidades

### Novas Capacidades
<!-- Nenhuma nova capacidade raiz criada, pois estendemos o inventário e as regras existentes -->

### Capacidades Modificadas

- `cemiterio/inventario`: Habilitar a integração da aba "Concessão & Titulares" do modal de detalhes do jazigo com o cadastro central de pessoas (MDM) para visualização, edição de titulares e registro de novas concessões.
- `cemiterio/regras-concessao-sucessao`: Estabelecer a exigência e sincronização de vínculo entre concessionários e o cadastro mestre de pessoas (`pessoa_id`).

## Impacto

- **Frontend (`apps/web-client/src/modules/cemiterios`)**:
  - `views/ModalDetalheJazigo.tsx`: Refatoração da aba Concessão & Titulares e dos modais de titular para consumir `PessoaPicker`, `usePessoaPicker` e permitir abertura do `PessoaDetailView`.
  - `views/ConcessoesView.tsx`: Enriquecimento dos formulários de nova concessão e edição com o seletor MDM unificado.
  - `views/operacoes/ModalNovaInumacao.tsx` e `components/HerdeirosTable.tsx`: Integração refinada com `PessoaPicker`.
- **Backend (`apps/api/Modules/Cemiterios`)**:
  - `Http/Controllers/ConcessaoController.php` e `ConcessionarioController.php`: Garantir persistência e retorno completo do relacionamento `pessoa` e `pessoa_id` nos recursos de concessão e concessionário.
