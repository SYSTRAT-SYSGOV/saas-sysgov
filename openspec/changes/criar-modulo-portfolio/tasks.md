# Tasks

## 1. Estrutura do módulo e permissões

- [x] 1.1 Gerar `apps/api/Modules/Portfolio` com `php artisan make:module Portfolio` (no container) e remover os artefatos de exemplo; verificar que o teste de isolamento gerado roda verde
- [x] 1.2 Ajustar `module.json` (alias `portfolio`, `requires: ["Admin", "Escola"]`, menu GESTÃO SETORIAL/`FolderOpen`, permissões `portfolio.view|professor|manage` com descrições em pt-BR); verificar com o teste de estrutura de módulos
- [x] 1.3 Criar `PortfolioRbacSeeder` com os perfis-modelo `portfolio_professor` e `portfolio_gestor` (ambos com `escola.view`), registrar o provider em `bootstrap/app.php` e o seeder em `docker-entrypoint.sh`; teste: seeder idempotente e perfis com as permissões esperadas
- [x] 1.4 Registrar as rotas com `auth:sanctum`, `tenant`, `escola:portfolio`, `bindings`, `module-access:portfolio`; teste: rota sem módulo habilitado responde 403 e sem escola definida (várias escolas) responde 422

## 2. Modelo de dados e regras de trabalho

- [x] 2.1 Migrations `portfolio_trabalhos` e `portfolio_imagens` conforme D2 (FKs, índices iniciados por `tenant_id`, softDeletes no trabalho); verificar `migrate` e `migrate:rollback` no sqlite de teste
- [x] 2.2 Models `Trabalho` (`TenantAware`, `EscolaAware`, cast de `avaliacao_decimos`) e `Imagem` (`TenantAware`) com relações para Aluno, Turma, Materia e User; teste de isolamento entre tenants e entre escolas do mesmo tenant
- [x] 2.3 `EscopoPortfolio` (D3): turmas visíveis, matérias lançáveis, visibilidade de aluno e restrição de consulta; testes com professor de uma matéria, professor de duas turmas e gestor
- [x] 2.4 `TrabalhoService` + `TrabalhoRequest`: criar/alterar com validações da spec (título, matéria da turma, data no ano letivo, avaliação 0–10 em passos de 0,1, aluno transferido recusado), turma congelada no registro e trimestre deduzido pela data; auditoria via `AuditLogger`; testes cobrindo cada cenário de "Registro de trabalhos" e "Situação do aluno"
- [x] 2.5 `TrabalhoPolicy` (ver → 404 fora do escopo; escrever → 403 sem permissão) e `TrabalhoController` (store, update, destroy) com `TrabalhoResource` (avaliação em número com uma casa); testes de 403/404 do escopo do professor

## 3. Evidências em imagem

- [x] 3.1 `ImagemService`: validação (JPG/PNG, 5 MB, máximo 6 por trabalho), redução para JPEG de 1600 px com GD, gravação em `portfolio/{tenant}/trabalhos/{trabalho}/` e remoção após commit; `docker/api/Dockerfile` copia `docker/php/uploads.ini`; testes com `Storage::fake` para limite, tipo inválido e redução
- [x] 3.2 Rotas de imagem (acrescentar uma por requisição, excluir, servir); exclusão do trabalho remove os arquivos; testes de acesso negado (404) para professor de outra turma e de remoção dos arquivos

## 4. Linha do tempo, desempenho e listagens

- [x] 4.1 Endpoints `turmas`, `turmas/{turma}/alunos` (contagem e média no período) e `turmas/{turma}/materias` respeitando o escopo; testes para professor e gestor
- [x] 4.2 Endpoint `alunos/{aluno}/trabalhos` com filtro de ano/trimestre e ordenação (data desc, id desc), restrito às matérias do professor; testes dos cenários de "Linha do tempo"
- [x] 4.3 `DesempenhoService` + endpoint `alunos/{aluno}/desempenho` (total, média geral, por matéria, por trimestre; médias em décimos com arredondamento half-up); testes com os exemplos da spec (8, 9, 7 → 8,0) e aluno sem trabalhos

## 5. Relatório PDF

- [x] 5.1 View Blade `portfolio::relatorio` e `RelatorioService` (miniaturas de 480 px em data-URI, limite de 60 imagens com aviso de omitidas, rodapé com data e usuário) e endpoint `alunos/{aluno}/relatorio`; auditoria da geração; testes: 200 + `application/pdf`, conteúdo restrito à matéria do professor, PDF com várias imagens dentro do limite de memória padrão

## 6. Integração com o Painel do Cliente

- [x] 6.1 Incluir `/portfolio` em `ROTAS_COM_ESCOLA`, regenerar o registry (`SYSGOV_API_URL=http://127.0.0.1:1/x node scripts/generate-module-registry.js`) e adicionar o ícone no Dashboard; verificar `portfolio` no `moduleRegistry.generated.ts` e teste do `escolaAtiva`
- [x] 6.2 `api.ts`, tipos e `formato.ts` do módulo (avaliação `8,5`, datas pt-BR, conversão para envio); testes vitest de `formato.ts`
- [x] 6.3 `PortfolioModule.tsx` com seletor de escola/ano/trimestre, `ListaAlunos` (busca, total e média) e `CabecalhoAluno` com "Exportar PDF" via `useArquivoAutenticado`; teste vitest da lista com filtro
- [x] 6.4 Aba **Trabalhos**: `LinhaDoTempo`, `CardTrabalho` (miniaturas autenticadas, editar/excluir conforme permissão), `VisualizadorImagem` e `TrabalhoFormModal` (matérias lançáveis, validação, até 6 imagens reduzidas no navegador por `reduzirImagem`); testes vitest do modal (validação e envio) e de `reduzirImagem`
- [x] 6.5 Aba **Desempenho**: `PainelDesempenho` com `KpiCard`s, barras de média por matéria, rosca de quantidade e linha por trimestre (só em "Ano todo"), números em `font-mono tabular-nums`; teste vitest da montagem dos dados dos gráficos

## 7. Documentação e verificação final

- [x] 7.1 `docs/modules/portfolio.md` (objetivo, permissões e perfis, regras, rotas, armazenamento, PDF) e referência no `module.json`/README de módulos, se houver índice
- [x] 7.2 Verificação integrada: `phpunit` completo no container (com `-d memory_limit=2G`), `npx tsc --noEmit` e `npx vitest run` no web-client verdes; PHPStan do módulo sem erros novos
- [x] 7.3 Conferência no navegador com dados criados pela API (escola, turma, professor vinculado): professor lança trabalho com imagem, gestor vê tudo, gráficos e PDF corretos; dados de teste removidos pela API ao final
