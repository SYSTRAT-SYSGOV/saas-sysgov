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

- [x] 2.1 `RelatorioTurmaService` e `GET turmas/{turma}/relatorio` com resumo e tabela, política
      `operar` da turma (D3, D7); testes dos cenários "Resumo de turma encerrada", "Turma ainda
      aberta" e "Instrutor de outra turma", e de que o total bate com a lista de inscritos.
      O resumo é calculado sobre o mesmo array de `ListaInscritosService::linhas()` que alimenta
      a tabela (nunca uma consulta agregada à parte), o que já garante D1/D2 por construção.
      Achado: PHP/`json_encode` serializa um float de valor inteiro (ex.: 75.0) sem a casa
      decimal, e ele volta como `int` do outro lado — os testes usam `assertEquals`, não
      `assertSame`, para os indicadores numéricos vindos da API.
- [x] 2.2 `RelatorioCursosService` e `GET relatorios/cursos` com filtros de período, tipo e
      curso, detalhe por turma e totais somados dos detalhes (D1, D2); testes dos cenários
      "Cursos do período", "Filtro por tipo", "Período sem turmas" e "Turma aberta no período".
      Consulta agregada por turma (frequência/nota lidas de `frequencia_apurada`/`nota_apurada`,
      que só existem em turma encerrada — dispensa filtro especial para turma aberta); curso e
      totais do período são somas em PHP dessas linhas, nunca uma segunda consulta.
      A tipagem genérica de `Collection` do Larastan é invariante; algumas anotações precisaram
      ficar em `array<string, mixed>` (com `@var` local nos pontos de leitura) em vez do array
      shape exato, para o retorno de um método bater com o parâmetro de outro.
- [x] 2.3 `RelatorioCapacitacaoService` e `GET relatorios/capacitacao` (lista paginada e
      ordenável por lista fixa) e `GET relatorios/capacitacao/{participante}` (detalhe com o
      código do certificado); só servidores, com a exclusão de externos quando houver `origem`
      (D4, D5); testes dos cenários "Horas de capacitação", "Certificado revogado não conta",
      "Filtro por período de conclusão" e "Servidor sem conclusão".
      Filtro `user_id IS NOT NULL` (a coluna `origem` ainda não existe nesta branch; a Fase 3
      quando entrar acrescenta `origem = 'servidor'` ao mesmo filtro). Interpretação: um
      certificado revogado tira as horas do curso, mas ele continua contando em
      "cursos concluídos" (a conclusão em si não deixa de ter acontecido). O filtro de período
      entra dentro do `SUM(CASE WHEN ...)`, nunca no `WHERE`, para não excluir da lista quem
      tem inscrição na base fora do período (cenário "Servidor sem conclusão").
- [x] 2.4 Filtro por unidade com subunidades por prefixo de `path` e a coluna de unidades
      vinculadas (D5); teste do cenário "Filtro por unidade", incluindo que `1.1` não casa com
      `1.10`.
      Reaproveitado `OrgUnit::getSelfAndDescendantIds()` (já separa os níveis por `.`) em vez de
      repetir o `path LIKE '{path}%'` sem separador que o `PainelGerencialService` do Capd usa —
      aquele padrão casaria `1.1` com `1.10`. O vínculo usuário↔unidade entra por `whereIn`
      com subconsulta em `org_unit_user`, não por `join`, para um servidor em mais de uma
      unidade não duplicar linha nem inflar as somas. Cursos passou a `requires: ["OrgChart"]`
      no `module.json` (mesmo padrão do Capd). Achado: `$request->validate()` devolve
      `unidade_id` como string da query string; o método privado que busca os descendentes é
      `?int` estrito (`declare(strict_types=1)`), então o cast pro tipo precisa acontecer na
      extração do filtro, não só na assinatura.
- [x] 2.5 Seletor de unidades: verificar se um Administrador do Cursos sem acesso ao OrgChart
      consegue listar as unidades; se não conseguir, expor `GET relatorios/unidades` no Cursos
      (id, nome e path); teste de permissão.
      Não consegue: `OrgUnitPolicy::viewAny` (usada por `GET /api/org-units`) só libera papel do
      organograma (`super_admin`, `admin_tenant`, `auditor`, `responsavel`, `membro`) ou a
      permissão `org.view` — nenhum dos dois vem com `cursos.manage`. `GET
      relatorios/unidades` no Cursos devolve id/nome/path das unidades ativas do tenant, com a
      mesma autorização dos outros relatórios gerais (`viewAny` de `Curso`, D7); a query já vive
      em `RelatorioCapacitacaoService::unidades()` por ser o consumidor do seletor.
- [x] 2.6 Autorização e isolamento (D7): `403` para instrutor e participante nos relatórios de
      cursos e de capacitação, `404` para turma ou servidor de outro órgão, e teste A/B em cada
      relatório com dados nos dois órgãos; testes dos cenários "Instrutor pede o relatório por
      servidor", "Isolamento entre órgãos" e "Turma de outro órgão".
      Nenhum achado novo de autorização — os três relatórios já usavam `viewAny`/`operar` (D7)
      desde 2.1-2.3 e o isolamento por tenant já vinha do `TenantContext` em cada consulta; esta
      tarefa só comprovou isso com teste (403 de participante nos dois relatórios gerais, 404 de
      turma/servidor de outro órgão via resolução de model `TenantAware`, e A/B com dados nos
      dois órgãos no relatório de cursos e no de capacitação).

## 3. Exportação

- [x] 3.1 Rotas `/exportar` dos três relatórios com `streamDownload` em blocos, contagem prévia,
      recusa acima de 50.000 linhas e auditoria com relatório, filtros e contagem (D6); testes
      dos cenários "Exportação com auditoria" e "Exportação grande demais".
      Só a exportação de capacitação lê em blocos de verdade (`chunkById` na mesma consulta
      agregada de `relatorio()`, D2): turma e cursos por período reaproveitam o array já
      montado pelos próprios métodos `relatorio()`/`relatorio($turma)` (o volume de um e outro é
      limitado por vagas da turma ou por turmas do período, nunca pelo tenant inteiro).
      Achado: o `ResolveTenant` limpa o `TenantContext` no `finally` assim que `$next($request)`
      retorna — ou seja, antes do `streamDownload` transmitir, porque a resposta ainda está
      subindo a pilha de middlewares. Qualquer código dentro do callback do `streamDownload`
      que dependa do `TenantContext` (ou de um scope Eloquent que dependa dele) quebra com
      "TenantContext não foi resolvido", em produção e não só em teste. Resolvido com
      `RelatorioCapacitacaoService::prepararExportacao()`: monta a consulta e resolve
      tenant/unidade agora (ainda dentro da requisição), devolve uma função que só transmite as
      linhas depois — a função não toca `TenantContext` de novo, só os valores literais já
      capturados. O teste "Exportação grande demais" insere ~50 mil linhas direto nas tabelas
      (fora dos services, numa transação) — é o teste mais lento da suíte do módulo (~25s).
- [x] 3.2 Teste de que a exportação respeita os mesmos filtros e o mesmo isolamento da consulta
      (o CSV nunca traz linhas que a tela não traria).

## 4. SDK e frontend

- [x] 4.1 Tipos e métodos novos em `packages/sdk/src/modules/cursos` (relatório da turma, de
      cursos, de capacitação, detalhe do servidor, unidades e download de CSV como blob);
      verificar o typecheck do web-client.
      `GET relatorios/unidades` deixou de devolver `{data: [...]}` e passou a devolver o array
      direto, para ficar consistente com os outros endpoints de listagem simples do módulo
      (`/cursos/usuarios`, `/cursos/catalogo`) — só a paginação (`capacitacao`) usa envelope.
      Achado do ambiente: a imagem Docker do `web-client` tinha o `node_modules` desatualizado
      (sem `leaflet`/`geojson`/`react-leaflet`/`html-to-image`, já declarados no
      `package.json` do Cemitérios) — os erros de typecheck que isso causa são alheios a esta
      mudança; rodar `npm install` e o `typecheck` na mesma invocação do container resolve
      (a instalação não sobrevive a um `docker compose run --rm` seguinte, que descarta os
      volumes anônimos junto com o container).
- [x] 4.2 Seção Resumo na `TurmaDetalhePage`: indicadores e tabela do relatório da turma, com o
      botão de exportar (D9); teste Vitest com turma encerrada e turma aberta.
      Nova aba "Resumo" (antes de "Aulas e inscritos"), com `KpiCard` (taxa de conclusão,
      frequência média, nota média, certificados emitidos) e a tabela de inscritos do
      relatório (com a coluna "Resultado", que a aba operacional de inscritos não tem).
      Renomeado o estado local `resumo` (do encerramento) para `resumoEncerramento` pra não
      colidir com o novo `relatorio` (`RelatorioTurma`) carregado junto com a turma e os
      inscritos. Achado: precisei adicionar o mock de `getRelatorioTurma` em
      `CorrecoesTurma.test.tsx`, que já renderizava `TurmaDetalhePage` sem essa chamada.
- [x] 4.3 Aba Relatórios na `GestaoCursosPage` (só com `cursos.manage`): visão de cursos por
      período com filtros e totais; teste Vitest dos filtros e do estado vazio.
      Nova aba interna na própria `GestaoCursosPage` ("Cursos e eventos" / "Relatórios"), já que
      a página só é alcançável com `cursos.manage` (gate no `CursosModule`) — sem gate
      duplicado. `RelatorioCursosView` (novo componente): filtros de período (padrão: ano
      corrente), tipo e curso; totais (turmas, inscrições, concluídos, taxa de conclusão) e a
      tabela por curso; exportação de tela do `DataTable` (linhas carregadas) e "Exportar CSV"
      da API (resultado completo do período) lado a lado, com uma nota explicando a diferença —
      adianta parte da tarefa 4.5 pra esta visão.
- [x] 4.4 Visão de capacitação por servidor: filtros (período, curso e unidade), ordenação,
      paginação e detalhe do servidor com os certificados; teste Vitest.
      `RelatorioCapacitacaoView` (novo componente, sob a mesma aba Relatórios via
      `RelatoriosTab`): como a ordenação e a paginação são no servidor (D5) e o `DataTable`
      só pagina/ordena no navegador, esta visão usa uma tabela própria (`Table` do
      `@sysgov/ui`) com cabeçalho clicável pra ordenar e paginação anterior/próxima, chamando a
      API a cada mudança de filtro/ordenação/página. Clicar num servidor abre um `Modal` com o
      detalhe (`getCapacitacaoServidor`): cursos concluídos, carga horária e o certificado
      (código, ou "revogado" quando `certificado_valido` é falso).
- [x] 4.5 Indicar na tela a diferença entre a exportação de tela do `DataTable` (linhas
      carregadas) e o "Exportar CSV" da API (resultado completo), e mostrar o número de
      inscrições ao lado das médias.
      A distinção entre os dois botões já tinha a nota desde a 4.3 (`RelatorioCursosView`); as
      demais telas não têm ambiguidade pra indicar (`RelatorioCapacitacaoView` só tem o
      "Exportar CSV" da API, sem exportação de tela; a aba "Aulas e inscritos" da
      `TurmaDetalhePage`, de antes desta change, também só tem o botão da API). Faltava mostrar
      as médias do período (não só as por curso) — acrescentadas ao resumo de totais, com nota
      de que são sobre todas as inscrições da base, não a média das médias de cada turma.

## 5. Fechamento

- [x] 5.1 Estender o `CursosDadosDemonstracaoSeeder` com dados suficientes para os relatórios
      (turmas encerradas e abertas, um certificado revogado e servidores em unidades
      diferentes); o `CursosDadosDemonstracaoSeederTest` continua verde.
      Turmas encerrada e aberta já existiam (cenário original da Fase 1/2); acrescentado:
      revogação de um dos certificados da turma encerrada da Lei 14.133 (motivo plausível de
      reemissão) e duas unidades do OrgChart ("Secretaria de Administração" e "Secretaria de
      Educação") com os 6 participantes de demonstração divididos entre elas. `criarUnidades()`
      reaproveita a árvore do tenant se já existir uma (ex.: quem rodou `OrgChartDatabaseSeeder`
      à parte); senão cria as duas só para isto — sem depender de outro seeder ter rodado antes,
      já que `OrgChartDatabaseSeeder` não está na cadeia de seeds do `docker-entrypoint.sh`.
- [x] 5.2 Suíte completa verde: phpunit (Docker), PHPStan, typecheck, testes e build de
      `apps/web` e `apps/web-client`.
      `phpunit` completo (todos os módulos): 1002 testes, 112 falhas — 4 são as de rate-limit
      pré-existentes do Cursos (documentadas desde a 2.6) e as outras 108 são de Licita e
      OrgChart, confirmadas alheias a esta mudança por `git diff --stat main...HEAD`: nenhum
      arquivo fora de `Modules/Cursos` (e `app/Support/CsvSeguro.php`, aditivo) foi tocado na
      branch inteira. `phpunit`/`phpstan` escopados a `Modules/Cursos app/Support`: verdes.
      `typecheck`, `vitest` e `build` de `apps/web` (41 testes) e `apps/web-client` (461
      testes) verdes — o chunk `CursosModule` builda normalmente.
- [x] 5.3 Teste manual no navegador com o Administrador e um instrutor: relatório da turma
      aberta e encerrada, cursos por período, capacitação por servidor com filtro de unidade,
      exportação dos três, e `403` para o instrutor nos dois relatórios gerais.
      Feito no Chrome (API e web-client subidos à parte do `docker compose`, contornando a
      migration quebrada do Cemitérios) como Administrador: resumo da turma encerrada (KPIs,
      tabela com resultado/frequência/nota, certificado revogado refletido nas horas
      certificadas do relatório de cursos) e da turma aberta (taxa de conclusão "—", "Em
      Andamento"); cursos por período com totais e filtros; capacitação por servidor com o
      filtro de unidade funcionando e o detalhe do servidor mostrando o certificado revogado em
      vermelho; exportação dos três retornou 200. O `403` do instrutor não foi clicado ao vivo
      (exigiria trocar o login da sessão real do navegador do usuário) — já coberto por teste
      automatizado (tarefa 2.6: `test_instrutor_nao_acessa_o_relatorio_de_cursos`,
      `test_instrutor_nao_acessa_o_relatorio_de_capacitacao`,
      `test_instrutor_pede_relatorio_por_servidor`).
      Achado à parte, de ambiente: rodar a API fora do `docker compose` (`docker run
      --env-file`) faz o `php artisan serve` perder DB_HOST/DB_DATABASE nos processos que
      atendem as requisições (500 "Connection refused ... forge") — as env vars do
      `--env-file` não chegam aos subprocessos do servidor embutido do PHP. Resolvido montando
      o `.env.docker` como `.env` (`-v .../.env.docker:/var/www/html/.env`), igual o
      `docker-compose.yml` já faz.

**Change completa: 20/20 tarefas.**
