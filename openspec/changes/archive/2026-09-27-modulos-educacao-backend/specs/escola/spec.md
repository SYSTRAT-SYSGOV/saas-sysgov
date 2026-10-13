# Spec Delta

## Purpose

Mantém o cadastro escolar único de cada tenant — unidade, turnos, turmas, alunos, matérias, trimestres e
categorias de ocorrência — compartilhado pelos módulos Pedagógico, Formatura e Passeio, para que cada aluno e
cada turma sejam cadastrados uma única vez.

## ADDED Requirements

### Requirement: Isolamento por tenant do cadastro escolar
Todo registro do módulo (unidade, turnos, turmas, alunos, contatos, matérias, vínculos, trimestres e
categorias) SHALL pertencer a exatamente um tenant, determinado no servidor pelo contexto da requisição e nunca
pelo corpo da requisição. Um registro de outro tenant SHALL ser tratado como inexistente.

#### Scenario: Consulta de aluno de outro município
- **WHEN** um usuário do tenant A requisita pelo identificador um aluno cadastrado no tenant B
- **THEN** o sistema responde 404 e não revela nenhum dado do aluno

#### Scenario: tenant_id enviado no corpo é ignorado
- **WHEN** a requisição de criação de turma informa `tenant_id` de outro tenant no corpo
- **THEN** a turma é criada no tenant do contexto da requisição

### Requirement: Permissões e perfis do módulo Escola
O módulo SHALL declarar as permissões `escola.view`, `escola.alunos.manage` e `escola.estrutura.manage`
(turmas, matérias, trimestres, categorias, turnos e unidade). SHALL provisionar para o tenant, quando o módulo
for habilitado, os perfis **Direção** (todas as permissões) e **Secretaria/Pedagogia** (`escola.view` e
`escola.alunos.manage`). Toda rota SHALL exigir autenticação, tenant resolvido e o módulo habilitado para o tenant.

#### Scenario: Secretaria não altera a estrutura
- **WHEN** um usuário com o perfil Secretaria/Pedagogia tenta criar uma matéria
- **THEN** o sistema responde 403 e nada é gravado

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de tenant sem o módulo Escola habilitado acessa qualquer rota do módulo
- **THEN** o sistema responde 403 com o código `MODULE_ACCESS_DENIED`

### Requirement: Configuração da unidade
O sistema SHALL manter, por tenant, o nome e o logo da unidade escolar usados nos relatórios. O logo SHALL ser
aceito apenas como imagem (PNG, JPEG ou WEBP, verificada pelo conteúdo real do arquivo, até 2 MB) e armazenado
com nome aleatório em disco seguro.

#### Scenario: Arquivo que não é imagem
- **WHEN** o usuário envia como logo um arquivo PDF renomeado para `.png`
- **THEN** o sistema rejeita com erro de validação

### Requirement: Turnos e turmas
O sistema SHALL manter os turnos do tenant (por padrão Manhã, Tarde e Noite) e turmas com nome, turno e ano
letivo. O nome da turma SHALL ser único por tenant, turno e ano letivo. Excluir uma turma SHALL ser lógico
(soft delete) e SHALL manter os alunos, que passam a ficar sem turma.

#### Scenario: Turma duplicada
- **WHEN** o usuário cria a turma "6º A" no turno Manhã de 2026 e ela já existe nesse turno e ano
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Exclusão de turma com alunos
- **WHEN** o usuário exclui uma turma que tem 30 alunos
- **THEN** a turma deixa de ser listada e os 30 alunos continuam cadastrados, sem turma

### Requirement: Duplicação de turma
O sistema SHALL permitir duplicar uma turma, criando uma nova turma com o nome "<nome> (Cópia)", o mesmo turno
e ano e os mesmos vínculos de matérias e professores, sem copiar alunos.

#### Scenario: Duplicar turma com matérias
- **WHEN** o usuário duplica a turma "8º A", que tem 7 matérias vinculadas
- **THEN** é criada a turma "8º A (Cópia)" com as mesmas 7 matérias e nenhum aluno

### Requirement: Alunos e contatos
O sistema SHALL manter alunos com nome (armazenado em maiúsculas), CGM opcional e único por tenant quando
informado, número de chamada, turma, data de nascimento, mãe, pai, foto e situação (`ativo`, `transferido`,
`remanejado`), além de uma lista de contatos (telefone e responsável). A listagem SHALL permitir busca por nome,
mãe, pai ou turma e filtro por turma, ordenada por número de chamada e nome, com paginação.

#### Scenario: CGM repetido
- **WHEN** o usuário cadastra um aluno com CGM já usado por outro aluno do mesmo tenant
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Busca pelo nome da mãe
- **WHEN** o usuário busca "maria" e existe aluno cuja mãe se chama "Maria Souza"
- **THEN** o aluno aparece no resultado

### Requirement: Remanejamento de aluno
Ao mudar a situação de um aluno para `remanejado`, o sistema SHALL exigir uma turma de destino diferente da
atual, registrar a turma de origem e atribuir ao aluno o próximo número de chamada livre da turma de destino.

#### Scenario: Remanejar para a mesma turma
- **WHEN** o usuário marca o aluno como remanejado mantendo a mesma turma
- **THEN** o sistema rejeita com a mensagem de que a turma de destino deve ser diferente da atual

#### Scenario: Número de chamada no destino
- **WHEN** o aluno é remanejado para uma turma cujo maior número de chamada é 32
- **THEN** o aluno recebe o número 33 e a turma de origem fica registrada

### Requirement: Exclusão de alunos
O sistema SHALL permitir excluir um aluno, vários alunos selecionados de uma vez, ou todos os alunos de uma
turma. A exclusão SHALL ser lógica. A limpeza de turma SHALL exigir a confirmação textual `EXCLUIR` enviada na
requisição.

#### Scenario: Limpar turma sem confirmação
- **WHEN** a requisição de limpeza da turma não contém a confirmação `EXCLUIR`
- **THEN** o sistema rejeita e nenhum aluno é excluído

### Requirement: Importação de alunos por CSV
O sistema SHALL importar alunos de um arquivo CSV (separador `;` ou `,`, UTF-8 com ou sem BOM) com os cabeçalhos
`NOME` e `TURMA` obrigatórios e `CGM`, `NUMERO`, `MAE`, `PAI`, `NASCIMENTO` (dd/mm/aaaa ou aaaa-mm-dd) e
`CONTATO` opcionais, em qualquer ordem. Um aluno com o mesmo CGM, ou com o mesmo nome na mesma turma, SHALL ser
atualizado em vez de duplicado. A resposta SHALL informar quantos alunos foram criados, atualizados e a lista de
linhas rejeitadas com o motivo.

#### Scenario: Turma inexistente no CSV
- **WHEN** uma linha do CSV informa a turma "5º Z", que não existe no tenant
- **THEN** a linha é rejeitada com o motivo, e as demais linhas válidas são importadas

#### Scenario: Reimportação do mesmo arquivo
- **WHEN** o mesmo CSV é importado duas vezes
- **THEN** a segunda importação não cria alunos novos e informa todos como atualizados

### Requirement: Matérias e vínculo com turmas e professores
O sistema SHALL manter matérias com nome único por tenant (comparação sem diferenciar maiúsculas e acentos) e
permitir vincular a cada turma um conjunto de matérias, cada uma com um professor opcional (usuário do tenant).
Excluir uma matéria SHALL remover seus vínculos com as turmas. O sistema SHALL listar, para cada matéria, as
turmas vinculadas.

#### Scenario: Matéria com acento diferente
- **WHEN** existe a matéria "Matemática" e o usuário cadastra "matematica"
- **THEN** o sistema rejeita como duplicada

#### Scenario: Professor de outro tenant
- **WHEN** o vínculo informa como professor um usuário que não pertence ao tenant
- **THEN** o sistema rejeita com erro de validação

### Requirement: Importação e exportação de matérias
O sistema SHALL exportar as matérias em CSV (`ID;Nome`, UTF-8 com BOM) e importar matérias a partir de um CSV que
tenha a coluna `Nome` ou, na ausência dela, os nomes na primeira coluna, ignorando as já existentes. A resposta
SHALL informar quantas foram importadas e quantas ignoradas.

#### Scenario: Importar o arquivo exportado
- **WHEN** o usuário importa o próprio CSV gerado pela exportação
- **THEN** nenhuma matéria é criada com o número do ID como nome e todas são informadas como ignoradas

### Requirement: Trimestres letivos
O sistema SHALL manter trimestres com ano letivo (2020 a 2100), número (1, 2 ou 3), data de início e data de
fim, com o par ano + número único por tenant e fim não anterior ao início. O sistema SHALL informar a situação
de cada trimestre calculada pela data atual: `agendado`, `em_andamento`, `encerrado` ou `arquivo` (ano letivo
diferente do atual).

#### Scenario: Trimestre repetido
- **WHEN** o usuário cadastra o 2º trimestre de 2026 e ele já existe
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Situação em andamento
- **WHEN** a data atual está entre o início e o fim de um trimestre do ano atual
- **THEN** a situação informada é `em_andamento`

### Requirement: Categorias de ocorrência
O sistema SHALL manter categorias de ocorrência com nome único por tenant e cor em hexadecimal (`#rrggbb`),
provisionando para cada tenant novo as categorias padrão (Elogio / Destaque, Falta, Falta de Material,
Indisciplina, Outros, Pedagógico / Notas, Saúde / Acidente e Uniforme). Excluir uma categoria SHALL ser lógico e
SHALL preservar as ocorrências já registradas com ela.

#### Scenario: Cor inválida
- **WHEN** o usuário salva uma categoria com a cor "laranja"
- **THEN** o sistema rejeita com erro de validação

### Requirement: Auditoria do cadastro escolar
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria com tenant, usuário, módulo,
ação, recurso (`tipo:id`), dados antes e depois, IP, agente e data/hora, e SHALL publicar um evento de domínio
na outbox na mesma transação.

#### Scenario: Alteração de aluno auditada
- **WHEN** o usuário altera a turma de um aluno
- **THEN** existe um registro de auditoria com a turma anterior e a nova, e um evento `escola.aluno.atualizado`
  pendente na outbox
