# Tasks

## 1. Backend: Controle de Visibilidade de Dados Sensíveis e Auditoria LGPD

- [x] 1.1 Adicionar permissão `cadastros.pessoas.view_sensitive` e método `viewSensitive` em `PessoaPolicy.php`, validando se o usuário possui essa permissão ou atributo `is_platform_admin`
- [x] 1.2 Atualizar `PessoaResource.php` para expor condicionalmente `cpf_desmascarado` e flag `pode_desmascarar` apenas quando autorizado pela policy, mantendo `cpf_mascarado` como padrão
- [x] 1.3 Adicionar endpoint ou método de registro em `AuditLogger` para auditoria do evento `pessoa.sensivel_visualizado` quando dados sensíveis forem acessados
- [x] 1.4 Criar testes de feature em `PessoasControllerTest.php` cobrindo visualização mascarada para usuários sem permissão e acesso autorizado com auditoria para administradores

## 2. Pacote Compartilhado (`packages/ui`): Componentes MDM e Tipografia

- [x] 2.1 Atualizar `PessoaPicker.tsx` garantindo renderização de CPF mascarado e dados técnicos em `JetBrains Mono` (`font-mono tabular-nums`) e contenção de texto com `truncate`
- [x] 2.2 Enriquecer `PessoaFormModal.tsx` com campos adicionais (nome social, data de nascimento, filiação e contatos), busca de CEP e validação visual de CPF
- [x] 2.3 Refinar `PessoaCard.tsx` e `PessoaVinculosBadge.tsx` para suporte a quebra limpa de texto, badges com variantes semânticas e avatar com iniciais
- [x] 2.4 Validar build e testes do pacote `@sysgov/ui` executando `npm test --workspace=@sysgov/ui` ou `npm run build --workspace=@sysgov/ui`

## 3. Frontend (`web-client`): Evolução dos Modais do Módulo de Pessoas

- [x] 3.1 Refatorar `NovaPessoaWizard.tsx` com 4 etapas bem demarcadas (Identificação Civil, Vínculos, Endereço com busca CEP automática e Documentação/Contatos), com validações reativas e prevenção de perda de dados
- [x] 3.2 Evoluir `PessoaDetailView.tsx` para modal amplo e rico, adicionando abas bem espaçadas, botão de revelação e cópia de CPF para administradores com feedback visual, e visualização completa de vínculos e filiação
- [x] 3.3 Aprimorar `SubEntidadesManager.tsx` para permitir inclusão e edição de múltiplos documentos com data de emissão e UF, múltiplos endereços com autocompletar de CEP e múltiplos contatos com sinalização de principal e autorização de notificações
- [x] 3.4 Atualizar `PromoverPessoaModal.tsx` com dados civis em destaque, validação de e-mail institucional e confirmação clara de permissões

## 4. Frontend (`web-client`): Blindagem de Layout e Contenção de Texto

- [x] 4.1 Aplicar regras de contenção de largura (`min-w-0`, `truncate`, `max-w-xs`, `break-words`) e tooltips informativos em títulos, nomes longos e e-mails na `PessoasListView.tsx`
- [x] 4.2 Garantir que todos os números de documentos (CPF, RG, NIS, Matrícula), CEP, telefones e datas utilizem `font-mono tabular-nums` em toda a interface do módulo de pessoas
- [x] 4.3 Ajustar a responsividade dos modais garantindo rolagem interna (`overflow-y-auto max-h-[85vh]`), footer fixo com botões bem dimensionados e sem quebras visuais em mobile e desktop

## 5. Hub MDM: Integração e Verificação End-to-End

- [x] 5.1 Atualizar `usePessoaPicker.ts` com cache eficiente, debounce nas buscas e integração direta com o modal de cadastro rápido sem perda de contexto
- [x] 5.2 Executar suíte de testes de componentes do módulo de pessoas em `apps/web-client` verificando a conformidade dos modais e do picker
- [x] 5.3 Executar testes unitários e de integração do backend (`php artisan test Modules/Pessoas`) e linters para assegurar conformidade com os padrões do SYSGOV
