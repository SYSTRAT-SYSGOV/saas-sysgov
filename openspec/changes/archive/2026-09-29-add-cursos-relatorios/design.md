# Design

## Context

Ver `proposal.md` (Why) e `specs/cursos/spec.md` (requisitos). Estado atual, verificado no
código depois das Fases 1 e 2:

- **Exportação existente**: `InscricaoController::exportar` monta as linhas num método privado
  (`linhas($turma)`, com a frequência parcial de cada inscrição), grava a auditoria
  (`inscricoes.exportadas`) e responde com `streamDownload` em CSV UTF-8 com `;`. Não
  neutraliza células que começam com `=`, `+`, `-` ou `@`.
- **Dados de origem**: `cursos_inscricoes` guarda `frequencia_apurada`, `nota_apurada` e
  `concluida_em` (gravados no encerramento); `cursos_certificados` guarda `inscricao_id` (único),
  `emitido_em` e `revogado_em`; `cursos_cursos.carga_horaria_minutos` dá a carga. A Fase 2 tem
  `NotaService` (nota parcial ou apurada) e `LiberacaoService`.
- **Índices**: `cursos_inscricoes` tem `(tenant_id, turma_id, status)` e
  `(tenant_id, participante_id)`; `cursos_turmas` tem `(tenant_id, curso_id)` e
  `(tenant_id, status)`; `cursos_certificados` tem `(tenant_id, participante_id)`. **Não há
  índice por data** (`data_inicio` da turma, `concluida_em` da inscrição).
- **Estrutura organizacional**: `org_units` tem `path` materializado e é `TenantAware`;
  `org_unit_users` liga usuário e unidade (`role`). O `OrgScope` central (ABAC) não é usado pelo
  Cursos, e o SDK já lista unidades em `/org-units` (módulo OrgChart).
- **Exportação de tela**: o `DataTable` do web-client já exporta CSV, XLSX e PDF **no navegador**,
  das linhas carregadas.
- **Participante**: `cursos_participantes.user_id` liga o servidor ao usuário. A change
  `add-cursos-inscricao-publica-e-email` (ainda em proposta) acrescenta `origem`.

## Goals / Non-Goals

**Goals:**
- Um só cálculo para cada indicador, usado por todas as telas e exportações, para que os
  números nunca discordem entre si nem da lista de inscritos.
- Relatórios agregados no banco, sem carregar todas as inscrições na memória.
- Nenhum dado de outro órgão em nenhum relatório, provado por teste com dados dos dois lados.

**Non-Goals:**
- Escopo por unidade (ABAC) para gestores; gráficos; agendamento e envio por e-mail; relatórios
  de formações. Ver `proposal.md`.

## Decisions

### D1. Serviços de relatório somente leitura, com consulta agregada
`RelatorioTurmaService`, `RelatorioCursosService` e `RelatorioCapacitacaoService`, sem escrita e
sem eventos. Cada um monta consultas agregadas (`GROUP BY`) no banco.
- **Isolamento**: o escopo global do `TenantAware` só filtra a tabela-base da consulta; as
  tabelas ligadas por `join` **não** são filtradas. Toda junção leva `tenant_id` explícito
  (`turmas`, `cursos`, `certificados`, `org_unit_users`, `org_units`). Um teste por relatório
  cria dados nos órgãos A e B e confere que só o A aparece.
- *Alternativa descartada*: tabelas de resumo atualizadas por evento. Mais rápidas, mas duplicam
  a verdade e podem divergir do encerramento.

### D2. Cálculo único dos indicadores
`IndicadoresRelatorio` concentra as regras da spec: a base (`confirmada`, `concluida`,
`nao_concluida`), a taxa de conclusão (só turmas encerradas), as médias simples com duas casas e
o "—" quando não há valor. Os três serviços a chamam, e os totais do período são somas dos
detalhes (nunca recalculados por outro caminho). O relatório da turma reaproveita a mesma
apuração de frequência parcial que a lista de inscritos, extraída do `InscricaoController`
para um serviço, de modo que a lista, o CSV e o relatório usam o mesmo código.

### D3. Turma encerrada usa o gravado; turma aberta só entra em contagens agregadas
No relatório da turma, inscrições de turma encerrada mostram `frequencia_apurada` e
`nota_apurada`; as de turma aberta mostram os valores parciais (`NotaService::exibida` e a
frequência parcial). No relatório de cursos por período, turmas abertas contam nas turmas e
inscrições, mas não entram nas médias nem na taxa, porque o custo de calcular a nota parcial de
cada inscrição aberta em consulta agregada não se justifica (spec).

### D4. Horas certificadas e horas por servidor
Uma inscrição conta horas quando `status = concluida`, tem certificado do tipo `curso` com
`revogado_em` nulo, e o curso tem carga horária. A soma é em **minutos** na API (inteiro) e
formatada em horas e minutos na tela, como o restante do módulo. A data de referência para o
filtro de período do relatório por servidor é `concluida_em`; a do relatório de cursos é a
`data_inicio` da turma.
- Cada inscrição concluída conta uma vez, mesmo que o servidor repita o mesmo curso em turmas
  diferentes. Ver pergunta aberta.

### D5. Servidores, unidades e paginação
- **Quem entra**: participantes com `user_id` não nulo e, quando existir a coluna `origem`,
  `origem = 'servidor'`. Entra o servidor com ao menos uma inscrição da base no filtro (as horas
  podem ser zero).
- **Unidade**: filtro pela unidade escolhida e suas subunidades por prefixo de `path`
  (`path LIKE '{path}%'`, com o separador do path para não casar `1.1` com `1.10`). A coluna
  "Unidades" lista os nomes das unidades vinculadas em `org_unit_users`.
- **Paginação e ordenação no servidor**: `per_page` até 100, ordenação só por colunas de uma
  lista fixa (nome, horas, última conclusão) para não expor `ORDER BY` livre.
- **Seletor de unidades no frontend**: usa `/org-units` do SDK. Como o Administrador do Cursos
  pode não ter acesso ao módulo OrgChart, a tarefa 2.5 verifica isso e, se falhar, expõe as
  unidades por um endpoint do Cursos que só devolve id, nome e path.

### D6. CSV seguro e compartilhado
Ajudante `CsvSeguro` em `app/Support`: escreve com `;`, UTF-8, e prefixa com apóstrofo toda
célula de texto que comece com `=`, `+`, `-`, `@`, tabulação ou retorno de carro. As exportações
transmitem com `streamDownload` e leem em blocos (`chunkById`), contam as linhas antes (limite
de 50.000, recusa com `422` e orientação) e gravam a auditoria com relatório, filtros e contagem.
A exportação de inscritos passa a usar o mesmo ajudante, o que também fecha o problema de
fórmulas nela.
- **Coordenação**: `add-cursos-inscricao-publica-e-email` (D13) prevê o mesmo ajudante. Quem
  chegar primeiro o cria; o outro só o reutiliza.

### D7. Rotas e autorização
- `GET /api/cursos/turmas/{turma}/relatorio` e `.../relatorio/exportar`: `authorize('operar',
  $turma)`, a mesma política do CSV de inscritos (Administrador ou instrutor designado).
- `GET /api/cursos/relatorios/cursos`, `/relatorios/capacitacao`,
  `/relatorios/capacitacao/{participante}` e as rotas `/exportar` correspondentes: Gate
  `cursos.manage`.
- Os `{parâmetros}` resolvem models `TenantAware` (sem `bindings` antes do `tenant`), então
  turma ou participante de outro órgão vira `404`.
- **Saída**: Resources com lista explícita de campos. O relatório por servidor devolve nome,
  e-mail, unidades, contagens e minutos; nada além.

### D8. Índices só se a medição pedir
Com o banco de demonstração ampliado (milhares de inscrições), medir `EXPLAIN` das consultas por
período. Candidatos: `cursos_turmas (tenant_id, data_inicio)` e `cursos_inscricoes (tenant_id,
status, concluida_em)`. Criar só o que a medição justificar, com `down()`.

### D9. Frontend
- Aba **Relatórios** na `GestaoCursosPage` (visível com `cursos.manage`), com duas visões:
  cursos por período e capacitação por servidor, com filtros e `Exportar CSV` chamando a API.
- Seção **Resumo** na `TurmaDetalhePage` com os indicadores e a tabela do relatório da turma.
- Indicadores com o `KpiCard` de `@sysgov/ui`; tabelas com o `DataTable`, números em
  `font-mono tabular-nums`. Sem gráficos. O botão de exportação de tela do `DataTable` (CSV,
  XLSX, PDF) continua exportando só as linhas carregadas, e o "Exportar CSV" da API exporta o
  resultado completo; a tela indica a diferença.

## Risks / Trade-offs

- **[Vazamento entre órgãos por `join`]** Tabela ligada sem filtro de tenant → todo `join` leva
  `tenant_id` e há teste A/B por relatório (D1).
- **[Números que discordam]** O relatório diz uma coisa e a lista de inscritos outra → cálculo
  único (D2) e teste que compara o total do relatório da turma com a lista.
- **[Consulta lenta por período]** Sem índice por data → medir antes de criar índice (D8) e
  limitar `per_page` e a exportação.
- **[Dados pessoais em massa]** O relatório por servidor lista nome, e-mail e histórico → acesso
  só de `cursos.manage`, exportação auditada e CSV neutralizado.
- **[Injeção de fórmula em planilha]** Nomes e e-mails são texto livre → `CsvSeguro` (D6).
- **[Média simples esconde tamanho]** Uma turma de 2 pessoas pesa como uma de 200 nos totais →
  os totais somam contagens e recalculam a média sobre todas as inscrições da base, não sobre as
  médias das turmas; a tela mostra o número de inscrições ao lado.

## Migration Plan

Sem migrations obrigatórias e sem mudança de dados. Índices só se a medição da tarefa 1.1 os
justificar (com `down()`). A troca do CSV de inscritos para o `CsvSeguro` muda apenas a
neutralização de fórmulas. Rollback: remover as rotas e a aba; nada mais depende delas.

## Open Questions

- **Mesmo curso repetido**: se um servidor conclui o mesmo curso em duas turmas, as horas contam
  duas vezes (assumido) ou uma. Depende da norma de capacitação do órgão.
- **Referência do período**: `data_inicio` da turma no relatório de cursos (assumido) ou
  `data_fim`.
- **Gestores por unidade**: acesso das secretarias ao relatório por servidor, com o `OrgScope`.
  Fora desta mudança por decisão de escopo; candidata a uma mudança própria.
- **Retenção e LGPD**: por quanto tempo o histórico de capacitação de um servidor desligado deve
  aparecer no relatório.
