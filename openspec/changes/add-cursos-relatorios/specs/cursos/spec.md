# Spec Delta

## ADDED Requirements

### Requirement: Relatório da turma
O Administrador e os instrutores designados na turma SHALL poder consultar o relatório da turma,
com o resumo e a tabela de inscritos. O resumo SHALL trazer: o número de inscrições por situação
(`pendente`, `confirmada`, `lista_espera`, `concluida`, `nao_concluida` e `cancelada`), as vagas
ocupadas e o total de vagas, a frequência média, a nota média (quando o curso tem avaliação
publicada), a taxa de conclusão e os certificados emitidos. A tabela SHALL trazer, para cada
inscrição, o nome, o e-mail, a situação, a frequência, a nota e o resultado (`concluída`, `não
concluída` ou `em andamento`).

#### Scenario: Resumo de turma encerrada
- **WHEN** o Administrador abre o relatório de uma turma encerrada com 10 inscrições confirmadas, das quais 8 concluíram
- **THEN** o resumo mostra 8 concluídas, 2 não concluídas e taxa de conclusão de 80%

#### Scenario: Turma ainda aberta
- **WHEN** o instrutor abre o relatório de uma turma que ainda não foi encerrada
- **THEN** a taxa de conclusão aparece como não apurada e a frequência e a nota são as parciais até o momento

#### Scenario: Instrutor de outra turma
- **WHEN** um instrutor tenta abrir o relatório de uma turma em que não está designado
- **THEN** o sistema recusa o acesso

### Requirement: Regras de cálculo dos indicadores
Os indicadores SHALL seguir regras únicas para todos os relatórios. A base de cálculo SHALL
considerar somente inscrições `confirmada`, `concluida` e `nao_concluida`; inscrições `pendente`,
`lista_espera` e `cancelada` SHALL aparecer apenas na contagem por situação. A **taxa de
conclusão** SHALL ser `concluida ÷ (concluida + nao_concluida)` calculada somente sobre turmas
encerradas. A **frequência** e a **nota** de turmas encerradas SHALL ser as gravadas no
encerramento e SHALL NOT mudar depois. No relatório da turma, nas turmas abertas SHALL ser as
parciais; nos relatórios agregados (cursos por período), as turmas abertas SHALL entrar só nas
contagens, sem frequência nem nota. A **frequência média** e a **nota média** SHALL ser médias simples entre as inscrições da base que têm o valor,
com duas casas decimais. A **nota** SHALL ficar ausente (e não zero) quando o curso não tem
avaliação publicada e liberada. As **horas certificadas** de um curso SHALL ser a carga horária
multiplicada pelo número de inscrições `concluida` cujo certificado foi emitido e não foi
revogado.

#### Scenario: Curso sem avaliação
- **WHEN** um curso sem nota mínima e sem avaliações aparece num relatório
- **THEN** a nota média aparece como "—" e não como 0,00

#### Scenario: Turma encerrada não muda
- **WHEN** a frequência mínima do curso é alterada depois do encerramento de uma turma
- **THEN** o relatório continua mostrando a frequência e o resultado gravados no encerramento

#### Scenario: Certificado revogado
- **WHEN** o certificado de uma inscrição `concluida` é revogado
- **THEN** as horas certificadas do curso deixam de contar essa inscrição

### Requirement: Relatório de cursos por período
O Administrador SHALL poder consultar o relatório de cursos de um período, filtrado por data de
início da turma, por tipo (`curso` ou `evento`) e por curso. Para cada curso SHALL listar o
número de turmas, as inscrições da base, os concluídos, os não concluídos, a taxa de conclusão,
a frequência média, a nota média, as horas certificadas e os certificados emitidos, com o
detalhe por turma e os totais do período. A taxa de conclusão, a frequência média e a nota média
do curso SHALL considerar só as turmas encerradas do período.

#### Scenario: Turma aberta no período
- **WHEN** um curso tem uma turma encerrada e outra ainda aberta no período
- **THEN** as duas turmas entram na contagem de turmas e de inscrições, mas a taxa de conclusão e as médias usam só a turma encerrada

#### Scenario: Cursos do período
- **WHEN** o Administrador consulta o período de 01/01 a 31/12 e há dois cursos com turmas nesse intervalo
- **THEN** o relatório lista os dois cursos com o detalhe das turmas e uma linha de totais

#### Scenario: Filtro por tipo
- **WHEN** o Administrador filtra pelo tipo `evento`
- **THEN** o relatório traz somente cursos do tipo evento

#### Scenario: Período sem turmas
- **WHEN** nenhuma turma começa no período informado
- **THEN** o relatório vem vazio, com totais zerados, e não é um erro

### Requirement: Relatório de capacitação por servidor
O Administrador SHALL poder consultar, para todos os servidores do órgão, a capacitação de cada
um: os cursos concluídos, as **horas de capacitação** (soma da carga horária dos cursos
`concluida` com certificado emitido e não revogado), o número de cursos em andamento e a data da
última conclusão. O relatório SHALL poder ser filtrado por período de conclusão, por curso e por
unidade organizacional (a escolhida e as suas subunidades), ser ordenado por nome ou por horas e
ser paginado. Cada servidor SHALL ter um detalhe com os cursos concluídos, a data, a carga
horária e o código do certificado. O relatório SHALL listar só servidores, com nome, e-mail e
unidades vinculadas, e SHALL NOT incluir participantes externos.

#### Scenario: Horas de capacitação
- **WHEN** um servidor concluiu um curso de 8 horas e outro de 16 horas, ambos com certificado válido
- **THEN** o relatório mostra 2 cursos concluídos e 24 horas de capacitação

#### Scenario: Certificado revogado não conta
- **WHEN** um dos certificados desse servidor é revogado
- **THEN** as horas dele passam a contar só o curso que continua válido

#### Scenario: Filtro por unidade
- **WHEN** o Administrador filtra por uma secretaria que tem subunidades
- **THEN** o relatório traz os servidores vinculados à secretaria e às suas subunidades

#### Scenario: Filtro por período de conclusão
- **WHEN** o Administrador filtra as conclusões de 2026
- **THEN** só contam os cursos concluídos em 2026 nas horas e na contagem de cada servidor

#### Scenario: Servidor sem conclusão
- **WHEN** um servidor tem inscrição confirmada mas nenhum curso concluído no período
- **THEN** ele aparece com zero horas e zero cursos concluídos

### Requirement: Exportação dos relatórios em CSV
O Administrador SHALL poder exportar em CSV (UTF-8, separador `;`) o relatório de cursos por
período e o de capacitação por servidor, e o Administrador e os instrutores da turma SHALL poder
exportar o relatório da turma, sempre com os filtros aplicados na tela. Toda célula de texto que
comece com `=`, `+`, `-`, `@`, tabulação ou retorno de carro SHALL ser neutralizada para não ser
interpretada como fórmula. Cada exportação SHALL ser registrada na auditoria com o relatório, os
filtros e o número de linhas. Uma exportação com mais de 50.000 linhas SHALL ser recusada com a
orientação de restringir os filtros.

#### Scenario: Exportação com auditoria
- **WHEN** o Administrador exporta o relatório de capacitação por servidor filtrado por 2026
- **THEN** recebe um CSV com uma linha por servidor e a exportação fica registrada na auditoria com os filtros e a contagem

#### Scenario: Nome que começa com fórmula
- **WHEN** o nome de um participante começa com `=` e o relatório é exportado
- **THEN** a célula do CSV é neutralizada e não é interpretada como fórmula

#### Scenario: Exportação grande demais
- **WHEN** o Administrador exporta um relatório que resultaria em mais de 50.000 linhas
- **THEN** o sistema recusa a exportação e orienta a restringir os filtros

### Requirement: Acesso e isolamento dos relatórios
Os relatórios de cursos por período e de capacitação por servidor SHALL ser acessíveis somente a
quem tem `cursos.manage`; instrutores e participantes SHALL receber `403`. Todo relatório e
exportação SHALL considerar apenas dados do órgão do usuário autenticado; uma turma ou um
servidor de outro órgão SHALL resultar em `404`, sem revelar a existência do registro. Um
participante SHALL NOT ver nenhum relatório.

#### Scenario: Instrutor pede o relatório por servidor
- **WHEN** um instrutor tenta abrir o relatório de capacitação por servidor
- **THEN** o sistema nega o acesso

#### Scenario: Isolamento entre órgãos
- **WHEN** o Administrador do órgão A abre os relatórios de cursos e de capacitação por servidor
- **THEN** os números e as pessoas listadas são apenas do órgão A

#### Scenario: Turma de outro órgão
- **WHEN** o Administrador do órgão A pede o relatório de uma turma do órgão B
- **THEN** o sistema responde `404`
