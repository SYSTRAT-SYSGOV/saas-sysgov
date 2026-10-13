## ADDED Requirements

### Requirement: Dependência do cadastro escolar e isolamento
O módulo Portfólio SHALL depender do módulo Escola e usar exclusivamente os alunos, turmas, matérias, trimestres e
vínculos de professor do cadastro escolar da escola ativa do tenant, sem cadastro próprio de alunos ou
disciplinas. Registros de outro tenant ou de outra escola SHALL ser tratados como inexistentes.

#### Scenario: Aluno de outro tenant
- **WHEN** a requisição registra um trabalho para um aluno de outro tenant
- **THEN** o sistema responde 404 sem revelar que o aluno existe

#### Scenario: Trabalho de outra escola do mesmo tenant
- **WHEN** o usuário, com a escola A ativa, consulta um trabalho registrado na escola B
- **THEN** o sistema responde 404

### Requirement: Permissões e perfis do módulo Portfólio
O módulo SHALL declarar `portfolio.view`, `portfolio.professor` e `portfolio.manage`, e provisionar os perfis
**Professor (Portfólio)** (`view` + `professor`) e **Gestão do Portfólio** (`view` + `manage`). Os dois perfis
SHALL incluir também `escola.view`. Toda autorização SHALL ser feita no servidor, por registro.

#### Scenario: Usuário só com visualização tenta registrar
- **WHEN** um usuário com apenas `portfolio.view` tenta registrar um trabalho
- **THEN** o sistema responde 403

### Requirement: Escopo do professor
Um usuário com `portfolio.professor` e sem `portfolio.manage` SHALL ver apenas as turmas em que é professor
vinculado de ao menos uma matéria, os alunos dessas turmas e os trabalhos desses alunos, e SHALL registrar,
editar ou excluir trabalhos apenas nas matérias em que é o professor vinculado daquela turma. Um usuário com
`portfolio.manage` SHALL atuar em todas as turmas e matérias da escola ativa.

#### Scenario: Professor lança na própria matéria
- **WHEN** o professor de Matemática da turma 6A registra um trabalho de Matemática para um aluno da 6A
- **THEN** o trabalho é criado

#### Scenario: Professor lança em matéria de outro professor
- **WHEN** o professor de Matemática da turma 6A registra um trabalho de Português para um aluno da 6A, sem ser o professor de Português dela
- **THEN** o sistema responde 403

#### Scenario: Professor consulta aluno de turma alheia
- **WHEN** o professor consulta a linha do tempo de um aluno de uma turma em que não leciona
- **THEN** o sistema responde 404

#### Scenario: Gestor vê toda a escola
- **WHEN** um usuário com `portfolio.manage` lista as turmas do ano letivo
- **THEN** recebe todas as turmas do ano da escola ativa

### Requirement: Registro de trabalhos
O sistema SHALL registrar trabalhos de um aluno com título (obrigatório, até 160 caracteres), matéria
(obrigatória, entre as matérias vinculadas à turma do aluno), data (obrigatória, dentro do ano letivo da turma),
avaliação (obrigatória, de 0 a 10 com no máximo uma casa decimal), descrição e observações do professor
(opcionais). Cada trabalho SHALL guardar a turma do aluno no momento do registro, o ano letivo e o trimestre
correspondente à data segundo os trimestres cadastrados da escola (vazio quando a data não cai em nenhum
trimestre), além do usuário que o registrou. Toda criação, alteração e exclusão SHALL ser auditada.

#### Scenario: Avaliação com uma casa decimal
- **WHEN** o professor registra um trabalho com avaliação 8,5
- **THEN** o trabalho é salvo e devolvido com avaliação 8,5

#### Scenario: Avaliação fora da escala
- **WHEN** o professor informa avaliação 10,5 ou 7,25
- **THEN** o sistema rejeita com erro de validação no campo avaliação

#### Scenario: Matéria que não é da turma
- **WHEN** o gestor registra um trabalho numa matéria não vinculada à turma do aluno
- **THEN** o sistema rejeita com erro de validação no campo matéria

#### Scenario: Trimestre deduzido pela data
- **WHEN** o 2º trimestre vai de 01/05 a 31/08 e o trabalho tem data 15/06
- **THEN** o trabalho é registrado no 2º trimestre daquele ano letivo

#### Scenario: Data fora do ano letivo
- **WHEN** a turma é do ano letivo 2026 e o trabalho tem data em 2025
- **THEN** o sistema rejeita com erro de validação no campo data

### Requirement: Situação do aluno
O sistema SHALL recusar novos trabalhos para aluno transferido, mantendo visíveis os trabalhos já registrados. O
trabalho de um aluno remanejado SHALL continuar ligado ao aluno e manter a turma em que foi registrado.

#### Scenario: Aluno transferido
- **WHEN** o professor registra um trabalho para um aluno com situação transferido
- **THEN** o sistema rejeita informando que o aluno foi transferido

#### Scenario: Aluno remanejado mantém o histórico
- **WHEN** um aluno com trabalhos registrados na turma 6A é remanejado para a 6B
- **THEN** a linha do tempo do aluno mostra os trabalhos anteriores com a turma 6A

### Requirement: Evidências em imagem
O sistema SHALL aceitar até 6 imagens por trabalho. A tela SHALL permitir escolher fotos JPG, PNG ou WebP de até
5 MB cada e enviá-las já reduzidas (JPEG, no máximo 1600 px no maior lado, com a orientação da câmera aplicada); o
servidor SHALL aceitar apenas JPG ou PNG de até 5 MB, guardar a imagem em JPEG de no máximo 1600 px fora da área
pública e servi-la somente a usuários que podem ver o trabalho. Excluir uma imagem ou o trabalho SHALL remover os
arquivos correspondentes.

#### Scenario: Sétima imagem
- **WHEN** o trabalho já tem 6 imagens e o usuário envia outra
- **THEN** o sistema rejeita com erro de validação informando o limite

#### Scenario: Arquivo que não é imagem
- **WHEN** o usuário envia um PDF como evidência
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Foto grande do celular
- **WHEN** o usuário escolhe uma foto WebP de 4 MB e 4000 × 3000 px
- **THEN** a imagem é enviada e guardada como JPEG de 1600 × 1200 px

#### Scenario: Imagem acessada sem permissão
- **WHEN** um professor solicita a imagem de um trabalho de aluno de turma em que não leciona
- **THEN** o sistema responde 404

#### Scenario: Exclusão do trabalho remove imagens
- **WHEN** o usuário exclui um trabalho com 3 imagens
- **THEN** os 3 arquivos deixam de existir no armazenamento

### Requirement: Linha do tempo do aluno
O sistema SHALL listar os trabalhos de um aluno do mais recente para o mais antigo (por data e, no empate, pela
ordem de registro), com matéria, turma, avaliação, descrição, observações, autor e imagens, filtrando por ano
letivo e, opcionalmente, por trimestre. Para o professor restrito, a lista SHALL conter apenas os trabalhos das
matérias que ele leciona na turma.

#### Scenario: Filtro por trimestre
- **WHEN** o aluno tem trabalhos no 1º e no 2º trimestres e a consulta filtra o 2º
- **THEN** só os trabalhos do 2º trimestre são devolvidos

### Requirement: Desempenho do aluno
O sistema SHALL calcular, para o aluno e o período filtrado: total de trabalhos, média geral, e por matéria a
quantidade de trabalhos e a média das avaliações; e, quando o filtro é o ano todo, a média por trimestre. As
médias SHALL ser arredondadas em uma casa decimal. A lista de alunos de uma turma SHALL trazer, por aluno, a
quantidade de trabalhos e a média no período.

#### Scenario: Média por matéria
- **WHEN** o aluno tem em História as avaliações 8, 9 e 7
- **THEN** o desempenho informa História com 3 trabalhos e média 8,0

#### Scenario: Aluno sem trabalhos
- **WHEN** o aluno não tem trabalhos no período
- **THEN** o desempenho informa total 0 e média geral vazia, sem erro

### Requirement: Relatório PDF do portfólio
O sistema SHALL gerar, sob demanda, o PDF do portfólio de um aluno para o período filtrado, com a identificação da
escola, do aluno, da turma e do período, a tabela de resumo por matéria, cada trabalho com seus dados e as
imagens, e o rodapé com a data de geração e o usuário que gerou. O PDF SHALL respeitar o mesmo escopo da linha do
tempo, e cada geração SHALL ser auditada.

#### Scenario: Gestor gera o PDF
- **WHEN** o gestor solicita o relatório do aluno para o ano letivo 2026
- **THEN** o sistema devolve um arquivo `application/pdf` com o resumo e os trabalhos de 2026

#### Scenario: Professor gera o PDF
- **WHEN** o professor de Matemática solicita o relatório de um aluno da sua turma
- **THEN** o PDF contém apenas os trabalhos de Matemática
