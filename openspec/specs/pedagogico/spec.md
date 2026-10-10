# Spec: pedagogico

> Criada a partir da mudança `modulos-educacao-backend` (Fase 1 — backend dos módulos de educação), arquivada em 2026-09-27.
> Atualizada pela mudança `modulos-educacao-frontend` (Fase 2 — telas na API), arquivada em 2026-10-02.
> Fonte: apps/api/Modules/Pedagogico, docs/modules/pedagogico.md

## Purpose

Registra a vida pedagógica dos alunos do cadastro escolar — notas trimestrais, ocorrências, fichas de
pré-conselho, cronograma do pré-conselho, atas do conselho de classe e frequência diária — com acesso do
professor restrito às suas turmas e matérias.

## Requirements

### Requirement: Dependência do cadastro escolar e isolamento
O módulo SHALL depender do módulo Escola e SHALL referenciar apenas alunos, turmas, matérias, trimestres e
categorias do mesmo tenant. Qualquer referência a registro de outro tenant SHALL ser tratada como inexistente.

#### Scenario: Nota para aluno de outro tenant
- **WHEN** a requisição de lançamento de nota informa um aluno de outro tenant
- **THEN** o sistema rejeita com erro de validação e nada é gravado

### Requirement: Permissões e perfis do módulo Pedagógico
O módulo SHALL declarar `pedagogico.view`, `pedagogico.notas.manage`, `pedagogico.ocorrencias.manage`,
`pedagogico.conselho.manage` (pré-conselho, cronograma e atas), `pedagogico.frequencia.manage` e
`pedagogico.professor`. SHALL provisionar os perfis **Direção** (todas, exceto `pedagogico.professor`),
**Pedagogia** (`view`, `ocorrencias.manage`, `conselho.manage`, `frequencia.manage`) e **Professor**
(`view` e `pedagogico.professor`). Todos os perfis SHALL incluir também `escola.view` (leitura do cadastro escolar).

#### Scenario: Pedagogia não lança notas
- **WHEN** um usuário com o perfil Pedagogia tenta lançar nota
- **THEN** o sistema responde 403

#### Scenario: Professor lê o cadastro escolar
- **WHEN** um usuário com o perfil Professor consulta as matérias do cadastro escolar
- **THEN** a lista é exibida, e a tentativa de criar uma matéria responde 403

### Requirement: Escopo do professor
Um usuário que atue apenas com `pedagogico.professor` SHALL poder lançar notas, preencher fichas de pré-conselho
e registrar frequência somente nas combinações turma × matéria em que for o professor vinculado no cadastro
escolar, e SHALL ver apenas os alunos dessas turmas.

#### Scenario: Professor em turma que não é dele
- **WHEN** o professor de Matemática do 6º A tenta lançar nota de Matemática no 7º B, onde não está vinculado
- **THEN** o sistema responde 403

#### Scenario: Lista de turmas do professor
- **WHEN** o professor consulta suas turmas
- **THEN** recebe apenas as turmas e matérias em que está vinculado

### Requirement: Notas trimestrais
O sistema SHALL registrar uma nota por aluno, matéria e trimestre (1, 2 ou 3), de 0 a 10 com uma casa decimal,
com nota de recuperação opcional na mesma escala. Relançar a nota da mesma combinação SHALL substituir a
anterior. O sistema SHALL permitir o lançamento em lote de uma turma × matéria × trimestre e a importação por CSV
com os cabeçalhos `TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA`, informando as linhas rejeitadas com o motivo.

#### Scenario: Nota fora da escala
- **WHEN** o usuário lança a nota 10,5
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Relançamento substitui
- **WHEN** a nota do 1º trimestre de Matemática de um aluno é lançada como 6,0 e depois como 7,5
- **THEN** existe uma única nota para essa combinação, com valor 7,5

#### Scenario: Aluno inexistente no CSV
- **WHEN** uma linha do CSV informa um número de chamada que não existe na turma
- **THEN** a linha é rejeitada com o motivo e as demais são importadas

### Requirement: Ocorrências
O sistema SHALL registrar ocorrências de um aluno com categoria (do cadastro escolar), data, descrição,
severidade (`baixa`, `media`, `alta`, `critica`), responsável (texto livre opcional, até 200 caracteres, exibido na
ficha do aluno) e anexo opcional (PDF ou imagem, verificado pelo conteúdo, até 5 MB), guardando também o usuário
que registrou. O sistema SHALL informar, por aluno, o total de ocorrências.

#### Scenario: Categoria excluída preservada
- **WHEN** uma categoria de ocorrência é excluída depois de usada
- **THEN** as ocorrências já registradas continuam exibindo o nome dessa categoria

#### Scenario: Responsável informado
- **WHEN** a ocorrência é registrada com o responsável "Pedagogia — Manhã"
- **THEN** a ficha do aluno exibe esse responsável e a auditoria guarda o usuário que registrou

### Requirement: Fichas de pré-conselho
O sistema SHALL registrar uma ficha de pré-conselho por turma × matéria × período (trimestre) × ano letivo, com
desempenho geral, justificativa, conteúdos trabalhados, objetivos atingidos, metodologias, instrumentos
avaliativos, engajamento, dificuldades, estratégias, situação socioemocional e observações, e a lista de alunos
avaliados identificados pelo identificador do aluno, cada um com nível de atenção (`baixo`, `medio`, `alto`),
dificuldade identificada, encaminhamentos e destaque. Alunos com situação `transferido` ou `remanejado` SHALL
ser aceitos na lista sem textos de dificuldade e encaminhamento.

#### Scenario: Ficha duplicada
- **WHEN** já existe a ficha do 6º A, Matemática, 1º trimestre de 2026 e outra é enviada para a mesma combinação
- **THEN** o sistema atualiza a ficha existente em vez de criar uma segunda

#### Scenario: Textos não trocam de aluno
- **WHEN** a ficha é salva com um aluno transferido entre dois alunos ativos
- **THEN** a dificuldade e o encaminhamento de cada aluno ativo ficam gravados no próprio aluno

### Requirement: Progresso do pré-conselho por turma
O sistema SHALL informar, por turma e período, quantas matérias vinculadas à turma já têm ficha entregue e o
total de matérias vinculadas.

#### Scenario: Progresso parcial
- **WHEN** a turma tem 7 matérias vinculadas e 2 fichas entregues no 1º trimestre
- **THEN** o progresso informado para o 1º trimestre é 2 de 7

### Requirement: Cronograma do pré-conselho
O sistema SHALL manter períodos de preenchimento (ano letivo, período, início e fim), exigindo que início e fim
pertençam ao ano letivo e que o fim não seja anterior ao início, e SHALL informar a situação de cada período
(`agendado`, `ativo`, `encerrado`, `arquivo`). O sistema SHALL expor o período vigente: o ativo hoje; se não
houver, o mais próximo da data atual no ano corrente; se não houver, o mais próximo em qualquer ano. O cronograma
SHALL ser informativo e SHALL NOT bloquear o preenchimento das fichas.

#### Scenario: Data fora do ano letivo
- **WHEN** o usuário cadastra o período de 2026 com início em 20/12/2025
- **THEN** o sistema rejeita informando que a data de início não condiz com o ano letivo

#### Scenario: Período vigente sem período ativo
- **WHEN** hoje é 27/09/2026 e os períodos de 2026 terminam em 23/04 e 08/05
- **THEN** o período vigente informado é o que termina em 08/05/2026

### Requirement: Atas do conselho de classe
O sistema SHALL registrar atas por turma, período e ano letivo, com data da reunião, direção, pedagogia,
secretaria, texto de introdução, texto de conclusão, deliberações, assinaturas (por papel, imagem PNG de até 300 KB
cada, no máximo 30) e contagens de aprovados, em recuperação e retidos, nos estados `rascunho`, `finalizada` e
`arquivada`. Uma ata `finalizada` SHALL NOT ser editada (textos e assinaturas inclusive); SHALL apenas ser arquivada.

#### Scenario: Editar ata finalizada
- **WHEN** o usuário tenta alterar as deliberações de uma ata finalizada
- **THEN** o sistema rejeita informando que a ata está finalizada

#### Scenario: Rascunho com assinaturas salvo no servidor
- **WHEN** o usuário salva o rascunho da ata com os textos editados e duas assinaturas
- **THEN** ao abrir a mesma ata em outro computador, os textos e as duas assinaturas aparecem

#### Scenario: Assinatura que não é imagem
- **WHEN** uma assinatura enviada não é uma imagem PNG em base64
- **THEN** o sistema rejeita com erro de validação

### Requirement: Frequência diária
O sistema SHALL registrar, por turma e data, a presença (`presente`, `falta`, `falta_justificada`) de cada aluno
da turma, com observação opcional e a quantidade de aulas que o dia representa (1 a 10, padrão 1), substituindo o
registro anterior da mesma data. SHALL NOT aceitar datas futuras. SHALL permitir consultar a chamada de uma data ou
de um período de até um ano, e SHALL informar, por aluno e período, o total de faltas (soma das aulas dos dias com
falta) e a quantidade de faltas justificadas, que não entram no total. O professor SHALL ver somente os totais das
próprias turmas.

#### Scenario: Frequência em data futura
- **WHEN** o usuário registra a chamada de amanhã
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Faltas somam as aulas do dia
- **WHEN** um aluno falta num dia de 5 aulas e tem falta justificada num dia de 4 aulas
- **THEN** o total de faltas do período é 5 e a falta justificada é informada à parte

### Requirement: Auditoria do módulo Pedagógico
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria e evento de domínio na outbox na
mesma transação, e exclusões SHALL ser lógicas.

#### Scenario: Nota alterada auditada
- **WHEN** uma nota é alterada de 6,0 para 7,5
- **THEN** existe registro de auditoria com os dois valores e um evento `pedagogico.nota.lancada` na outbox

### Requirement: Média anual por aluno
O sistema SHALL informar, para um ano letivo, a média de cada aluno visível ao usuário, considerando todas as
matérias e trimestres lançados, com cada nota valendo o maior entre a nota e a recuperação, truncada em uma casa
decimal. O professor SHALL ver somente as médias dos alunos das próprias turmas.

#### Scenario: Recuperação maior substitui a nota
- **WHEN** o aluno tem 5,0 (recuperação 7,0), 6,0 e 6,0 no ano
- **THEN** a média informada é 6,3

### Requirement: Telas do módulo persistem no servidor
Todas as abas do módulo Pedagógico no painel do cliente (painel, frequência, pré-conselho, conselho e atas, notas,
ocorrências, alunos, corpo docente e administração) SHALL ler e gravar exclusivamente pela API, sem usar
`localStorage` para dados de negócio. Erros da API SHALL ser exibidos ao usuário com a mensagem retornada.

#### Scenario: Nota lançada vista por outro usuário
- **WHEN** um professor lança notas pela tela e a Direção abre as notas da mesma turma em outro computador
- **THEN** as notas lançadas aparecem para a Direção

#### Scenario: Erro de permissão exibido
- **WHEN** um usuário sem permissão tenta salvar uma ocorrência pela tela
- **THEN** a tela mostra a mensagem de erro e nada é gravado

### Requirement: Corpo docente a partir dos usuários do órgão
A aba "Corpo Docente" SHALL listar como professores os usuários ativos do tenant, com as turmas e matérias em que
estão vinculados, e SHALL permitir editar esses vínculos. O cadastro de novos usuários SHALL ser feito em "Usuários
e Acessos"; a aba SHALL oferecer atalho para essa tela.

#### Scenario: Vincular professor a uma turma
- **WHEN** a Direção vincula um usuário como professor de Matemática do 6º A pela aba Corpo Docente
- **THEN** o usuário passa a ver o 6º A em "minhas turmas" e pode lançar notas de Matemática nessa turma

### Requirement: Equipe da ata vinda do cadastro
A ata do conselho SHALL citar na abertura o diretor e os diretores auxiliares cadastrados, SHALL oferecer para o
campo Pedagoga apenas as pedagogas cadastradas (na aba Corpo Docente) e SHALL preencher diretor e secretaria a
partir da equipe gestora, sem nomes fictícios.

#### Scenario: Escolher a pedagoga da ata
- **WHEN** há duas pedagogas cadastradas e o usuário escolhe uma delas na ata
- **THEN** o nome escolhido aparece no texto da ata e na assinatura da pedagoga
