# Spec Delta

## ADDED Requirements

### Requirement: Tela do Cadastro Escolar
O painel do cliente SHALL oferecer, na rota do módulo Escola, a tela de administração do cadastro escolar (alunos,
turmas, matérias, categorias, trimestres e configuração da unidade), lendo e gravando exclusivamente pela API do
módulo. A mesma tela SHALL continuar acessível pela aba "Administração" do módulo Pedagógico.

#### Scenario: Menu Cadastro Escolar
- **WHEN** um usuário com `escola.view` abre o item de menu "Cadastro Escolar"
- **THEN** a tela de administração é exibida com os dados do tenant vindos da API, e não uma tela provisória

#### Scenario: Dado cadastrado aparece para outro usuário
- **WHEN** um usuário cadastra um aluno pela tela e outro usuário do mesmo tenant abre a lista em outro computador
- **THEN** o aluno aparece para o segundo usuário

### Requirement: Leitura do cadastro pelos módulos dependentes
Os perfis provisionados pelos módulos Pedagógico, Formatura e Passeio SHALL incluir `escola.view`, para que suas
telas possam listar turmas, alunos, matérias e categorias do cadastro escolar sem conceder escrita nele.

#### Scenario: Tesouraria lista alunos sem poder alterá-los
- **WHEN** um usuário só com o perfil Tesouraria (Formatura) consulta a lista de alunos do cadastro escolar
- **THEN** a lista é exibida e a tentativa de editar um aluno responde 403

### Requirement: Equipe gestora da unidade
O sistema SHALL manter, por tenant, a equipe gestora cadastrada por nome: um diretor, diretores auxiliares,
secretaria e pedagogas. A leitura SHALL exigir `escola.view` e a escrita `escola.estrutura.manage`; toda alteração
SHALL ser auditada. Um segundo diretor SHALL ser rejeitado com erro de validação.

#### Scenario: Cadastrar diretores auxiliares
- **WHEN** a direção cadastra o diretor e dois diretores auxiliares
- **THEN** a equipe lista um diretor e os dois auxiliares, e um segundo diretor é rejeitado

#### Scenario: Equipe de outro tenant
- **WHEN** um usuário do tenant A lista a equipe
- **THEN** não vê nenhum nome cadastrado pelo tenant B
