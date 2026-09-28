# Tasks

> Pré-requisito: Fase 2 do Cursos mergeada (#39). Não depende da change
> `add-cursos-inscricao-publica-e-email`; se ela já estiver na `main`, os relatórios usam a
> coluna `origem` (design D5).
> Testes do backend rodam no container `api` com o ambiente do CI (`APP_ENV=testing`, SQLite em
> memória, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`) e
> `php -d memory_limit=-1`; chamados abaixo de "phpunit (Docker)". Frontend: `npm --workspace
> apps/web-client run typecheck` e `run test` num container `node:22`.

## 1. Base de cálculo

- [x] 1.1 Medir as consultas por período com volume: ampliar o banco de demonstração para alguns
      milhares de inscrições, rodar `EXPLAIN` das consultas de cursos por período e de
      capacitação por servidor e decidir os índices (D8). Criar só os que a medição justificar,
      com migration e `down()`, e verificar `migrate` no MySQL do Docker.
      Medido num banco descartável com 2.000 turmas e 60.000 inscrições sintéticas (não
      commitado). `cursos_inscricoes(tenant_id, status, concluida_em)` reduziu a consulta de
      capacitação de ~44 ms para ~23 ms — criado. Índice por `data_inicio` em `cursos_turmas`
      não se justificou: a tabela de turmas continua pequena o bastante para a varredura
      completa ser mais barata. Achado à parte: sem `ANALYZE TABLE` depois da carga em massa,
      a consulta de cursos por período levava 31 s por estatística desatualizada do MySQL, não
      por falta de índice — com estatística em dia, o índice `(tenant_id, turma_id, status)` que
      já existia resolve em ~11 ms. Verificado com `php artisan module:migrate Cursos --force`
      no MySQL de desenvolvimento (a `migrate` completa está bloqueada por uma migration do
      Cemitérios quebrada, de outro módulo, alheia a esta mudança — reportado ao usuário) e com
      a suíte completa do Cursos em SQLite (341 testes).
- [x] 1.2 `IndicadoresRelatorio` (D2): base de inscrições, taxa de conclusão só de turmas
      encerradas, médias simples com duas casas e "—" sem valor, e horas certificadas (D4);
      testes unitários dos cenários "Curso sem avaliação", "Turma encerrada não muda" e
      "Certificado revogado".
- [x] 1.3 Extrair a apuração de frequência parcial e as linhas de inscritos do
      `InscricaoController` para um serviço reutilizável, sem mudar o resultado da lista nem do
      CSV atual; os testes existentes de inscritos e exportação continuam verdes.
      A apuração de frequência parcial já vivia em `FrequenciaService`; a novidade foi extrair
      `linhas()` e `nota()` para `ListaInscritosService`, que o `InscricaoController` e (a partir
      da tarefa 2.1) o `RelatorioTurmaService` passam a compartilhar.
- [x] 1.4 `CsvSeguro` em `app/Support` (separador `;`, UTF-8, neutralização de fórmulas) e troca
      da exportação de inscritos para ele (D6); testes do cenário "Nome que começa com
      fórmula" e de que o CSV de inscritos continua igual nas demais células. Se a change
      `add-cursos-inscricao-publica-e-email` já tiver criado o ajudante, só reutilizá-lo.
      Achado: `fputcsv` envolve em aspas qualquer campo com espaço, não só delimitador/aspas —
      documentado no teste para não surpreender quem for reaproveitar `CsvSeguro`.

## 2. Backend dos relatórios

- [ ] 2.1 `RelatorioTurmaService` e `GET turmas/{turma}/relatorio` com resumo e tabela, política
      `operar` da turma (D3, D7); testes dos cenários "Resumo de turma encerrada", "Turma ainda
      aberta" e "Instrutor de outra turma", e de que o total bate com a lista de inscritos.
- [ ] 2.2 `RelatorioCursosService` e `GET relatorios/cursos` com filtros de período, tipo e
      curso, detalhe por turma e totais somados dos detalhes (D1, D2); testes dos cenários
      "Cursos do período", "Filtro por tipo", "Período sem turmas" e "Turma aberta no período".
- [ ] 2.3 `RelatorioCapacitacaoService` e `GET relatorios/capacitacao` (lista paginada e
      ordenável por lista fixa) e `GET relatorios/capacitacao/{participante}` (detalhe com o
      código do certificado); só servidores, com a exclusão de externos quando houver `origem`
      (D4, D5); testes dos cenários "Horas de capacitação", "Certificado revogado não conta",
      "Filtro por período de conclusão" e "Servidor sem conclusão".
- [ ] 2.4 Filtro por unidade com subunidades por prefixo de `path` e a coluna de unidades
      vinculadas (D5); teste do cenário "Filtro por unidade", incluindo que `1.1` não casa com
      `1.10`.
- [ ] 2.5 Seletor de unidades: verificar se um Administrador do Cursos sem acesso ao OrgChart
      consegue listar as unidades; se não conseguir, expor `GET relatorios/unidades` no Cursos
      (id, nome e path); teste de permissão.
- [ ] 2.6 Autorização e isolamento (D7): `403` para instrutor e participante nos relatórios de
      cursos e de capacitação, `404` para turma ou servidor de outro órgão, e teste A/B em cada
      relatório com dados nos dois órgãos; testes dos cenários "Instrutor pede o relatório por
      servidor", "Isolamento entre órgãos" e "Turma de outro órgão".

## 3. Exportação

- [ ] 3.1 Rotas `/exportar` dos três relatórios com `streamDownload` em blocos, contagem prévia,
      recusa acima de 50.000 linhas e auditoria com relatório, filtros e contagem (D6); testes
      dos cenários "Exportação com auditoria" e "Exportação grande demais".
- [ ] 3.2 Teste de que a exportação respeita os mesmos filtros e o mesmo isolamento da consulta
      (o CSV nunca traz linhas que a tela não traria).

## 4. SDK e frontend

- [ ] 4.1 Tipos e métodos novos em `packages/sdk/src/modules/cursos` (relatório da turma, de
      cursos, de capacitação, detalhe do servidor, unidades e download de CSV como blob);
      verificar o typecheck do web-client.
- [ ] 4.2 Seção Resumo na `TurmaDetalhePage`: indicadores e tabela do relatório da turma, com o
      botão de exportar (D9); teste Vitest com turma encerrada e turma aberta.
- [ ] 4.3 Aba Relatórios na `GestaoCursosPage` (só com `cursos.manage`): visão de cursos por
      período com filtros e totais; teste Vitest dos filtros e do estado vazio.
- [ ] 4.4 Visão de capacitação por servidor: filtros (período, curso e unidade), ordenação,
      paginação e detalhe do servidor com os certificados; teste Vitest.
- [ ] 4.5 Indicar na tela a diferença entre a exportação de tela do `DataTable` (linhas
      carregadas) e o "Exportar CSV" da API (resultado completo), e mostrar o número de
      inscrições ao lado das médias.

## 5. Fechamento

- [ ] 5.1 Estender o `CursosDadosDemonstracaoSeeder` com dados suficientes para os relatórios
      (turmas encerradas e abertas, um certificado revogado e servidores em unidades
      diferentes); o `CursosDadosDemonstracaoSeederTest` continua verde.
- [ ] 5.2 Suíte completa verde: phpunit (Docker), PHPStan, typecheck, testes e build de
      `apps/web` e `apps/web-client`.
- [ ] 5.3 Teste manual no navegador com o Administrador e um instrutor: relatório da turma
      aberta e encerrada, cursos por período, capacitação por servidor com filtro de unidade,
      exportação dos três, e `403` para o instrutor nos dois relatórios gerais.
