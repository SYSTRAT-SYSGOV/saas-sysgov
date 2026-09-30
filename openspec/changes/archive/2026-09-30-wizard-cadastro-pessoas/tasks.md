# Tasks

## 1. Backend: listagem

- [x] 1.1 `PessoaService::listar()` ganha `->with(['vinculos', 'usuario'])`; verificar com teste que `GET /api/pessoas` retorna `vinculos` e `usuario` (quando existir) para cada item, sem consulta N+1 por pessoa (spec: Scenario "Listagem traz os vínculos de cada pessoa")

## 2. Frontend: extração do componente de promoção

- [x] 2.1 Extrair `PromoverPessoaModal` (recebe `pessoa` e `onPromovido`) a partir da lógica hoje embutida em `DetalhePessoaModal` (busca de papéis via `accessApi.tenantRoles()`, formulário de email+papel, chamada a `pessoasApi.promover`), preservando o comportamento atual; `DetalhePessoaModal` passa a usar o componente extraído
- [x] 2.2 Executar `npm run typecheck` do `apps/web-client` (limpo) após a extração, antes de seguir para as próximas tarefas

## 3. Frontend: promoção mais visível

- [x] 3.1 Botão "Promover a usuário" no topo do `DetalhePessoaModal` (junto ao nome/CPF, fora da seção "Conta de acesso"), usando o `PromoverPessoaModal` extraído; visível apenas quando `podePromover && !pessoa.usuario`
- [x] 3.2 Ícone de ação rápida "Promover" na coluna de ações da tabela de listagem, usando o mesmo `PromoverPessoaModal`, visível apenas quando `podePromover && !pessoa.usuario` (spec: Scenario "Promoção acessível pela listagem")
- [x] 3.3 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 4. Frontend: wizard de cadastro

- [x] 4.1 Componente `NovaPessoaWizard` com 4 passos (Identificação civil, Vínculo, Documento, Endereço/Contato); passo 1 obrigatório, chama `pessoasApi.criar` e guarda o `pessoa.id` retornado; passos 2-4 puláveis, cada um chamando o endpoint correspondente (`adicionarVinculo`/`adicionarDocumento`/`adicionarEndereco`+`adicionarContato`) só quando o usuário opta por preenchê-lo
- [x] 4.2 Navegação do wizard: "Avançar"/"Pular"/"Voltar" (voltar não desfaz uma chamada já confirmada) e "Concluir" disponível a partir do passo 1 já criado, fechando o wizard e recarregando a listagem
- [x] 4.3 Botão "Nova pessoa" da tela de listagem passa a abrir `NovaPessoaWizard` em vez do `FormModal` atual
- [x] 4.4 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 5. Frontend: formulário de edição reorganizado

- [x] 5.1 Reorganizar o `FormModal` de "Editar pessoa" em seções visuais (ex.: Identificação, Filiação, Documentos civis) mantendo os mesmos campos e o mesmo comportamento de submissão única — sem virar wizard. Achado durante a implementação: `pessoaSelecionada` nunca era definido com uma pessoa real em nenhum ponto do código — o caminho de edição existia mas era inalcançável (nenhum botão o acionava). Corrigido junto: botão "Editar" na seção "Dados civis" do `DetalhePessoaModal` agora abre o `EditarPessoaModal`.
- [x] 5.2 Executar `npm run typecheck` do `apps/web-client` (limpo)

## 6. Verificação final

- [x] 6.1 `phpstan analyse Modules/Pessoas` limpo (0 erros)
- [x] 6.2 Suíte do módulo passando (`vendor/bin/phpunit Modules/Pessoas`), incluindo um teste novo/ajustado cobrindo o eager-load da tarefa 1.1, sem regressão nos testes de listagem, promoção e permissão já existentes — 45/45
- [x] 6.3 Verificação manual (ou teste) de que criar uma pessoa pelo wizard pulando todos os passos opcionais produz o mesmo resultado que o fluxo atual de "Nova pessoa" (pessoa criada, sem vínculo/documento/endereço/contato) — verificado por rastreamento de código (sem endpoint novo no backend, já coberto pelos testes de `PessoaControllerTest`): passo 1 chama `pessoasApi.criar(valores)` com o mesmo conjunto de campos do formulário antigo (o `autoriza_notificacoes` residual do estado inicial do wizard é silenciosamente descartado por `PessoaController::validar()`, que só extrai as chaves da allowlist — sem efeito observável); `irPara()` reseta `valores` a cada passo, então em "Concluir agora"/"Pular" nos passos 2-4 sem preencher nada, `submeterPassoAtual()` não dispara nenhuma chamada (`tipo_vinculo`/`tipo`+`numero`/campos de endereço/contato todos vazios) — resultado: exatamente 1 `Pessoa` criada, zero vínculo/documento/endereço/contato, idêntico ao fluxo antigo
