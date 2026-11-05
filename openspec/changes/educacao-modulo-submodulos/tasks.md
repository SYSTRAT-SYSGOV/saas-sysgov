# Tarefas

## 1. Levantamento (antes de mexer em código)

- [ ] 1.1 Conferir em produção, somente leitura e com autorização, as linhas de `client_menu_items` e `client_menu_groups` dos cinco aliases (rota, rótulo, `parent_id`, ordem, ativo) e se algum tenant personalizou o menu.
- [ ] 1.2 Listar todos os pontos que citam as rotas antigas (`navigate('/escola')`, `TopBar`, `MenuManager`, `ClientMenuSeeder`, `AuthProvider`, cards do painel, atalhos, testes) e os nomes antigos dos módulos.
- [ ] 1.3 Decidir as perguntas em aberto do design (Passeio, ícone e ordem).

## 2. Backend

- [ ] 2.1 Adicionar `menu.parent` e `menu.slug` ao `module.json` dos cinco módulos e padronizar os rótulos.
- [ ] 2.2 `RegisterModuleCommand`: criar o agrupador "Educação" quando faltar e registrar o submódulo como filho; não recriar item solto; respeitar `--dry-run` e `--force`.
- [ ] 2.3 `ClientNavigationService`: omitir o agrupador sem filhos visíveis.
- [ ] 2.4 Migração idempotente que reposiciona os itens existentes sob o agrupador (D7) e invalida o cache de navegação.
- [ ] 2.5 Atualizar `ClientMenuSeeder` (instalações novas).
- [ ] 2.6 Testes de backend: agrupador visível/oculto por permissão, módulo inativo e liberação por unidade; idempotência da migração; item removido pelo tenant não é recriado.

## 3. Frontend

- [ ] 3.1 `generate-module-registry.js`: ler `menu.parent` e `menu.slug`, gerar as rotas `educacao/<slug>` e a entrada `educacao`; regerar `moduleRegistry.generated.ts`.
- [ ] 3.2 Módulo `educacao`: página inicial com os submódulos permitidos e `EducacaoShell` com a barra de submódulos (teclado, foco visível, rolagem em tela estreita).
- [ ] 3.3 `AppRouter`: rotas `/educacao/*` e redirecionamento das cinco rotas antigas preservando *query* e *hash*.
- [ ] 3.4 Substituir os `navigate('/escola')` e afins por constantes de rota; ajustar `TopBar`, `MenuManager`, cards do painel e `AuthProvider`.
- [ ] 3.5 `Sidebar`: confirmar o agrupador expandido quando a rota atual é de um filho.
- [ ] 3.6 Testes: redirecionamento com `?aba=`, página inicial por permissão, barra de submódulos, menu em dois níveis.

## 4. Documentação e spec

- [ ] 4.1 `docs/modules/educacao.md` (novo) e atualização dos módulos para as rotas novas.
- [ ] 4.2 Specs `educacao` (nova) e `client` (alterada). A spec principal `client` ganhou o cabeçalho `## Requirements` (sem ele o arquivamento recusa o delta).

## 5. Entrega

- [ ] 5.1 Rodar a suíte de backend, PHPStan, a suíte do web-client e `tsc`.
- [ ] 5.2 Backup do banco, PR, CI verde, merge e deploy, **só com autorização explícita**.
- [ ] 5.3 Conferir em produção: menu "Educação" com os submódulos, redirecionamento das rotas antigas, perfis de acesso restrito (ver só um submódulo) e nenhum tenant sem acesso ao que tinha.
- [ ] 5.4 Arquivar a mudança no OpenSpec.
