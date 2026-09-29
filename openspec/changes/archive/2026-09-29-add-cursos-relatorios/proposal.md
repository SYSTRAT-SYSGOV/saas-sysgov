# Proposal

## Why

Depois das Fases 1 e 2 o módulo Cursos registra tudo o que um órgão precisa para prestar contas
da capacitação: inscrições, frequência, notas e certificados. Mas **não devolve nenhum número
consolidado**. Hoje o Administrador só consegue uma lista de inscritos por turma (CSV com
frequência) e a lista de certificados. Não há como saber quantos servidores foram capacitados
no ano, qual a taxa de conclusão de um curso, quantas horas de capacitação cada servidor
comprovou ou quais turmas evadem mais. Essas perguntas chegam do controle interno, das
secretarias e do estágio probatório, e hoje são respondidas montando planilhas à mão.

Esta mudança é a parte de **relatórios** que a Fase 3 original previa. Foi separada da change
`add-cursos-inscricao-publica-e-email` porque não depende dela e pode ser revisada e entregue
sozinha.

## What Changes

- **Relatório da turma**: resumo (inscritos por situação, vagas ocupadas, concluídos, taxa de
  conclusão, frequência média, nota média e certificados emitidos) e a tabela de inscritos com
  frequência, nota e resultado. O Administrador e os instrutores da turma podem ver.
- **Relatório de cursos por período**: para cada curso, as turmas do período com inscritos,
  concluídos, não concluídos, taxa de conclusão, frequência e nota médias, horas certificadas e
  certificados emitidos, com totais do período. Filtros por período, tipo (curso ou evento) e
  curso. Só o Administrador.
- **Relatório de capacitação por servidor**: para cada servidor, os cursos concluídos, as horas
  de capacitação comprovadas (só cursos concluídos com certificado não revogado), quantos cursos
  estão em andamento e a data da última conclusão, com o detalhe dos cursos e o código de cada
  certificado. Filtros por período de conclusão, curso e unidade organizacional. Só quem
  administra o módulo, para todas as unidades.
- **Exportação em CSV** dos três relatórios, no servidor, com neutralização de fórmulas,
  registro na auditoria e limite de tamanho.
- **Telas**: aba **Relatórios** na gestão de cursos (cursos por período e capacitação por
  servidor) e seção **Resumo** no detalhe da turma, com indicadores e tabelas do `@sysgov/ui`.
  A exportação de tela em CSV, XLSX e PDF que o `DataTable` já oferece continua valendo para o
  que está carregado.

Fora desta mudança:
- **Acesso de gestores por unidade** ao relatório por servidor (escopo ABAC do `OrgScope`).
  Decidido nesta proposta: só o Administrador do módulo. Pode virar mudança própria.
- Horas em andamento (por presença) no total de capacitação. O total só conta curso concluído.
- Gráficos além dos indicadores, agendamento e envio de relatórios por e-mail, e relatórios de
  formações (trilhas).
- Participantes externos nos relatórios. O relatório por servidor lista só servidores; se a Fase 3
  for entregue, os externos ficam de fora dele e aparecem apenas nos totais de turma e de curso.

## Capabilities

### New Capabilities

(nenhuma. Os relatórios fazem parte da capacidade `cursos`.)

### Modified Capabilities

- `cursos`: novos requisitos de relatório da turma, relatório de cursos por período, relatório
  de capacitação por servidor, exportação dos relatórios e acesso a eles.

## Impact

- **Backend**: serviços de relatório somente leitura, três controllers e rotas em
  `api/cursos/relatorios` e `api/cursos/turmas/{turma}/relatorio`, sem migrations de dados. Pode
  acrescentar índices em `cursos_turmas` e `cursos_inscricoes` se a medição com volume mostrar
  necessidade (tarefa 1.1). Um ajudante de CSV seguro compartilhado, que também serve à
  exportação de inscritos.
- **Permissões**: nenhuma permissão nova; o relatório por servidor e o de cursos usam
  `cursos.manage`, e o da turma usa o vínculo de instrutor da Fase 1.
- **Dados pessoais**: o relatório por servidor lista nome, e-mail, unidade e histórico de cada
  pessoa. Toda consulta e exportação é isolada por órgão e a exportação é auditada.
- **Frontend**: nova aba e seção em `apps/web-client/src/modules/cursos`, com contrato novo em
  `packages/sdk/src/modules/cursos`.
- **Dependências novas**: nenhuma.
- **Coordenação com `add-cursos-inscricao-publica-e-email`**: as duas mudanças tocam o CSV de
  inscritos e a marca `origem` de participante. Quem entrar primeiro cria o ajudante de CSV
  seguro e a outra o reutiliza; a `origem` só é usada se já existir.
