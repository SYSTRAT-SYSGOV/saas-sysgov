# Módulo Educação (web-client `/educacao`)

A Educação **agrupa a navegação** de seis módulos que já existiam. Não é um módulo de backend: não tem alias, API,
permissão nem tabela. Cada submódulo continua sendo o módulo Laravel de mesmo alias, com as próprias permissões, perfis,
prefixo de API (`/api/escola`, `/api/pedagogico`, …) e dados.

Spec: `openspec/specs/educacao/spec.md` (mudança `educacao-modulo-submodulos`).

| Submódulo | Alias (backend) | Rota | Rota antiga (redireciona) | Permissão de acesso |
|---|---|---|---|---|
| Cadastro Escolar | `escola` | `/educacao/cadastro-escolar` | `/escola` | `escola.view` |
| Gestão Pedagógica | `pedagogico` | `/educacao/pedagogico` | `/pedagogico` | `pedagogico.view` |
| Formatura e Eventos | `formatura` | `/educacao/formatura` | `/formatura` | `formatura.view` |
| Passeios | `passeio` | `/educacao/passeio` | `/passeio` | `passeio.view` |
| Portfólio Digital | `portfolio` | `/educacao/portfolio` | `/portfolio` | `portfolio.view` |
| Transporte Escolar | `transporte` | `/educacao/transporte` | `/transporte` | `transporte.view` |

## Como funciona

- **Menu.** Item raiz "Educação" (`/educacao`), sem módulo e sem permissão, com os submódulos como filhos. O agrupador só
  aparece quando o usuário enxerga ao menos um filho (módulo ativo no tenant, permissão e liberação por unidade); sem
  filho visível, `ClientNavigationService` o omite.
- **Registro.** O `module.json` de cada submódulo declara `menu.parent = "educacao"`, `menu.slug` e `menu.label`.
  `php artisan module:register` cria o agrupador (se faltar) e coloca o item como filho, em `/educacao/<slug>`. Um item
  solto que já existia é reaproveitado, mantendo atalho e situação (ativo ou não).
- **Migração do menu já gravado.** `2026_11_05_100000_agrupar_modulos_da_educacao_no_menu` reposiciona os itens
  existentes de `client_menu_items` sob o agrupador. Não apaga nada, não recria item que o tenant removeu, mantém
  permissão e ícone, roda mais de uma vez sem duplicar e invalida o cache de navegação dos tenants. Reversível.
- **Rotas do web-client.** `AppRouter` monta `/educacao/<slug>` dentro do `EducacaoShell` (barra de submódulos) e deixa a
  rota antiga redirecionando, preservando `?aba=` e o fragmento. A lista dos submódulos fica em
  `modules/educacao/submodulos.ts`; um teste confere que ela bate com os `module.json`.
- **Página inicial.** `/educacao` lista só os submódulos que o usuário pode abrir.
- **Escola de trabalho.** Continua por submódulo (cada tela usa `ComEscola`). Um seletor único no topo da Educação é
  melhoria futura.

## Para incluir um novo submódulo

1. No `module.json` do módulo: `menu.parent = "educacao"`, `menu.slug`, `menu.label`.
2. Acrescente o módulo em `modules/educacao/submodulos.ts` (a ordem da lista é a ordem de exibição) e em
   `Agrupadores::submodulosDaEducacao()`.
3. Rode `node scripts/generate-module-registry.js` e `php artisan module:register <Módulo>`.
