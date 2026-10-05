# Design Técnico: Evolução do Módulo de Pessoas (MDM Central)

## Contexto

O módulo de Cadastro de Pessoas (`Modules\Pessoas` na API e `apps/web-client/src/modules/pessoas` no frontend) funciona como o cadastro único de dados civis e vínculos (servidores de carreira, comissionados, estagiários, munícipes, contribuintes) para o ecossistema SYSGOV.
Para que este módulo cumpra o papel de Hub Central compartilhado por todos os módulos satélites (Requerimentos, Cemitérios, Financeiro, RH, Licitações, CAPD, etc.), é imprescindível:
1. Proteger os dados pessoais conforme a LGPD, restringindo a visualização de dados civis completos e desmascarados a perfis de administrador/autorizados com rastreabilidade em log de auditoria.
2. Reformular os modais (`NovaPessoaWizard`, `PessoaDetailView`, modais de documentos, contatos e endereços) para uma experiência de usuário rica, ergonômica e completa.
3. Blindar os layouts e tipografia para evitar transbordamento ou quebra feia de texto em resoluções variadas, mantendo estrita conformidade com o `DESIGN_SYSTEM.md` e tipografia `JetBrains Mono` em dados técnicos.
4. Padronizar os componentes de integração (`PessoaPicker`, `usePessoaPicker`, `PessoaCard`, `PessoaBadge`) em `@sysgov/ui` para consumo ágil e desacoplado em qualquer parte do sistema.

## Metas / Não-Metas (Goals / Non-Goals)

**Metas:**
- Implementar autorização de visibilidade de dados sensíveis na API (`cadastros.pessoas.view_sensitive`) e no frontend, fornecendo desmascaramento sob demanda para administradores com registro em `audit_logs`.
- Expandir a completude dos modais: wizard de 4 passos com validação robusta, preenchimento de endereço via CEP, formulários de documentos com órgão e UF, contatos com consentimento de notificação e visualizador unificado de vínculos.
- Prevenir quebras de texto e bugs visuais através de `truncate`, `min-w-0`, `break-words`, tooltips de suporte e dados numéricos/documentais rigorosamente em `font-mono tabular-nums`.
- Consolidar a suíte de componentes do Hub MDM para reaproveitamento nos módulos existentes e futuros do `web-client`.

**Não-Metas:**
- Não criar mecanismos paralelos de autenticação (a identidade civil continua separada da conta de acesso, que é gerenciada pelo vínculo `PessoaUsuario`).
- Não alterar a estrutura fundamental do banco de dados (as tabelas `pessoas`, `pessoas_documentos`, `pessoas_enderecos`, `pessoas_contatos` e `pessoas_vinculos` já suportam a arquitetura normalizada necessária).

## Decisões Técnicas (Decisions)

### Decisão 1: Exposição Segura de Dados Sensíveis com Auditoria LGPD
- **Arquitetura**:
  - `PessoaPolicy`: Adicionar verificação `viewSensitive(User $user, Pessoa $pessoa)` checando `is_platform_admin` ou a permissão `cadastros.pessoas.view_sensitive`.
  - `PessoaResource`: Quando o usuário autenticado possuir permissão sensível, disponibiliza o campo `cpf_desmascarado` e flag `pode_desmascarar: true`. Caso contrário, omite atributos desmascarados e envia apenas `cpf_mascarado`.
  - Adição de endpoint `POST /api/pessoas/{pessoa}/auditar-acesso-sensivel` (ou registro automático no `AuditLogger` quando a ação for executada) para rastreabilidade estrita de conformidade à LGPD.
  - Na interface (`PessoaDetailView`), o CPF aparece mascarado por padrão mesmo para o administrador, com botão de revelação "olho" e cópia rápida, garantindo que mesmo administradores não deixem dados desnecessariamente expostos em tela.
- **Alternativas consideradas**:
  - *Retornar sempre desmascarado para admin no JSON*: Rejeitado por aumentar a exposição desnecessária em trânsito de rede; o desmascaramento sob demanda é a melhor prática recomendada pela LGPD.

### Decisão 2: Design e Ergonomia dos Modais com `@sysgov/ui`
- **Arquitetura**:
  - `NovaPessoaWizard.tsx`: Estruturação em 4 etapas numeradas (`1. Identificação Civil`, `2. Vínculo Municipal`, `3. Endereço & Localização`, `4. Documentação & Contatos`), com indicador visual de etapas ativas/completas, integração com `useCep` para autopreenchimento imediato de logradouro/bairro/município/UF, e validação reativa com cálculo de dígitos de CPF.
  - `PessoaDetailView.tsx`: Cabeçalho com avatar de iniciais, status chip, vínculos destacados e badges de credencial de usuário. Abas organizadas (`Identificação & Filiação`, `Vínculos Funcionais`, `Documentos, Endereços e Contatos`, `Segurança & Conta`).
  - `SubEntidadesManager.tsx`: Ações modais dedicadas com modais sem empilhamento quebrado (z-index consistente), botões de ação claros e confirmação inline para remoções.
  - `PromoverPessoaModal.tsx`: Visualização clara dos dados da pessoa civil e campos para e-mail e perfil inicial no SYSGOV.
- **Alternativas consideradas**:
  - *Formulário único longo com scroll infinito*: Rejeitado por gerar fadiga visual e alta taxa de abandono/erros cadastrais.

### Decisão 3: Blindagem Visual contra Quebra de Texto e Conformidade com Design System
- **Arquitetura**:
  - Aplicar classes de contenção de largura e quebra: `min-w-0`, `truncate`, `max-w-xs`, `break-words`.
  - Para campos com dados longos (ex.: e-mails extensos, nomes completos, descrições de vínculos), empregar atributo `title` ou componente de tooltip permitindo leitura completa sem comprometer o grid.
  - Para todo e qualquer dado numérico/identificador (`CPF`, `RG`, `NIS`, `Matrícula`, `CEP`, telefones, datas): uso compulsório de `JetBrains Mono` (`font-mono tabular-nums`).
- **Alternativas consideradas**:
  - *Permitir wrap irrestrito de colunas da tabela*: Rejeitado pois desalinha as linhas da tabela e empurra botões de ação para fora da tela em resoluções menores.

### Decisão 4: Padronização do Hub MDM Compartilhado (`usePessoaPicker` e `PessoaPicker`)
- **Arquitetura**:
  - Centralizar a lógica de busca com cache e debounce em `usePessoaPicker`.
  - No `PessoaPicker` (`packages/ui`), exibir informações relevantes no dropdown (nome, CPF mascarado, matrícula ou tipo de vínculo principal).
  - Incluir botão de "Novo Cadastro Rápido" inline com modal simplificado (`PessoaFormModal`) para que nenhum outro módulo precise interromper o preenchimento de formulários (ex.: abertura de requerimento ou concessão de jazigo).
- **Alternativas consideradas**:
  - *Redirecionar o operador para outra página para cadastrar a pessoa*: Rejeitado por destruir o estado de preenchimento do formulário no módulo chamador.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco: Concorrência ou duplicidade de CPF durante cadastro rápido inline]**
  → *Mitigação*: Validação instantânea algorítmica de CPF no client antes do submit e captura graciosa de erro 422 da API caso o CPF já exista no tenant, oferecendo selecionar a pessoa existente imediatamente.
- **[Risco: Lentidão ao listar dados em tenants populosos]**
  → *Mitigação*: Uso da flag `compact=1` em requisições de autocomplete/picker, retornando somente campos indexados essenciais (`id`, `nome`, `nome_social`, `cpf_mascarado`, `status`), sem carregar relacionamentos pesados.
- **[Risco: Quebra de layout em telas mobile em modais complexos]**
  → *Mitigação*: Modais com rolagem interna independente (`max-h-[85vh] overflow-y-auto`), footer fixo e grids responsivos com transição de 1 para 2 ou 3 colunas dependendo do breakpoint (`sm:`, `lg:`).
