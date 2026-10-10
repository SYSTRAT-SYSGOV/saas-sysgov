# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
