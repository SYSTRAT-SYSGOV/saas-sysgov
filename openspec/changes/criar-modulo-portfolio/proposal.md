# Proposta: criar-modulo-portfolio

## Why

Os professores precisam registrar e acompanhar a produção dos alunos ao longo do ano — trabalhos avaliados,
fotos das evidências e a evolução por matéria — e hoje isso existe só como um protótipo React isolado
(`Portfolio Digital/PortfolioDigital.jsx`) que guarda tudo no `localStorage` do navegador, com alunos
digitados à mão. Sem servidor não há multi-tenant, escopo por professor, auditoria nem relatório confiável. O
SYSGOV já tem o cadastro escolar (escolas, turmas, alunos, matérias, trimestres e professores por matéria), então
o portfólio pode nascer integrado e sem dados duplicados.

## What Changes

- Novo módulo de negócio **Portfolio** (`apps/api/Modules/Portfolio`, alias `portfolio`), dependente de `Admin` e
  `Escola`, com menu, permissões e perfis próprios — pode ser liberado por tenant independentemente.
- Registro de **trabalhos** por aluno do cadastro escolar: título, matéria (da turma do aluno), data, avaliação de
  0 a 10 com uma casa decimal, descrição e observações do professor. Cada trabalho guarda a turma e a matéria do
  momento em que foi registrado e o ano letivo/trimestre deduzidos da data.
- **Evidências em imagem**: até 6 imagens por trabalho (JPG, PNG ou WebP, até 5 MB cada), guardadas em disco por
  tenant e servidas só a usuários autorizados.
- **Linha do tempo** do aluno (mais recentes primeiro) e **desempenho** calculado no servidor: média e quantidade
  por matéria, média geral e evolução por trimestre, com filtro por ano letivo e trimestre.
- **Relatório PDF do portfólio do aluno**, gerado no servidor, com resumo por matéria e os trabalhos com imagens.
- **Escopo do professor**: quem tem só `portfolio.professor` vê e lança apenas nas turmas × matérias em que é o
  professor vinculado no cadastro escolar; o gestor (`portfolio.manage`) atua em toda a escola.
- Tela do módulo no Painel do Cliente (`apps/web-client/src/modules/portfolio`) em `@sysgov/ui`, com gráficos em
  `recharts`.
- A avaliação do portfólio é **independente** das notas trimestrais do Pedagógico (não altera o boletim).
- Fora do escopo desta versão: acesso de pais/responsáveis, BNCC, Google Classroom, relatório consolidado por
  turma e exportação CSV.

## Capabilities

### New Capabilities
- `portfolio`: portfólio digital dos alunos do cadastro escolar — trabalhos avaliados com evidências em imagem,
  linha do tempo, desempenho por matéria e trimestre, relatório PDF, permissões e escopo do professor.

### Modified Capabilities
<!-- Nenhuma: o módulo apenas lê o cadastro escolar (escola), sem mudar seus requisitos. -->

## Impact

- **Backend**: novo módulo `apps/api/Modules/Portfolio` (migrations `portfolio_trabalhos` e `portfolio_imagens`,
  models `TenantAware` + `EscolaAware`, services, policies, controllers, rotas com `escola:portfolio`, view Blade
  do PDF via `barryvdh/laravel-dompdf`, seeder RBAC, testes). Registro do provider em `bootstrap/app.php` e do
  seeder RBAC em `docker-entrypoint.sh`.
- **Leitura do módulo Escola**: `Aluno`, `Turma`, `Materia`, `TurmaMateria` (professor por matéria) e `Trimestre`.
- **Frontend**: módulo `apps/web-client/src/modules/portfolio`, entrada no registry gerado
  (`moduleRegistry.generated.ts`) e ícone no Dashboard.
- **Cliente HTTP**: `api.ts` próprio do módulo no web-client, como Passeio e Formatura (sem mudança no SDK).
- **Armazenamento**: arquivos em `portfolio/{tenant_id}/trabalhos/{trabalho_id}/` no disco local; exclusão do
  trabalho remove as imagens.
- **Documentação**: `docs/modules/portfolio.md`.
- Sem dependências novas: `recharts`, `dompdf` e a extensão `gd` já estão no projeto.
