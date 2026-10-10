# Spec Delta

## MODIFIED Requirements

### Requirement: Permissões e perfis do módulo Passeio
O módulo SHALL declarar `passeio.view`, `passeio.passeios.manage` e `passeio.frota.manage`, e provisionar os
perfis **Coordenação de Passeios** (todas) e **Apoio** (`view`). Os dois perfis SHALL incluir também `escola.view`
(leitura do cadastro escolar).

#### Scenario: Apoio não altera passeio
- **WHEN** um usuário com o perfil Apoio tenta alterar a data de um passeio
- **THEN** o sistema responde 403

## ADDED Requirements

### Requirement: Telas do Passeio persistem no servidor
As telas do módulo Passeio SHALL ler e gravar exclusivamente pela API (passeios, inscrições e autorizações,
veículos, mapa de assentos e indicadores), sem consultar servidores externos nem guardar dados de negócio no
navegador, e SHALL usar os componentes de `@sysgov/ui`. As telas de turmas e alunos SHALL ser somente consulta ao
cadastro escolar, com atalho para o Cadastro Escolar. Os botões de escrita SHALL ficar ocultos para quem só tem
`passeio.view`. O termo de autorização, o manifesto de embarque e o demonstrativo de arrecadação SHALL ser impressos
com os dados do servidor, sem dados fictícios.

#### Scenario: Sem servidor externo
- **WHEN** o usuário abre qualquer tela do Passeio
- **THEN** nenhuma requisição é feita a domínios fora da própria API do SYSGOV

#### Scenario: Assento marcado aparece para outro usuário
- **WHEN** a Coordenação coloca um aluno no assento 12 do ônibus 1 e o Apoio abre o mapa em outro computador
- **THEN** o Apoio vê o aluno no assento 12

#### Scenario: Apoio não vê os botões de escrita
- **WHEN** um usuário com o perfil Apoio abre a aba Inscrições e Termos
- **THEN** a lista aparece sem os controles de alterar vai, termo e pagamento

### Requirement: Inscrição respeita a situação do aluno
A inscrição em passeio SHALL recusar aluno transferido e a inscrição da turma inteira SHALL ignorá-lo. Aluno
remanejado SHALL ser inscrito pela turma de destino. A lista de inscrições SHALL trazer a situação e o telefone
principal do aluno, lidos do cadastro escolar.

#### Scenario: Aluno transferido
- **WHEN** a Coordenação tenta inscrever um aluno transferido
- **THEN** o sistema responde 422 informando que aluno transferido não participa do passeio

#### Scenario: Turma com transferido
- **WHEN** a Coordenação inscreve uma turma com 20 alunos, 1 deles transferido
- **THEN** 19 alunos são inscritos e o transferido fica de fora

### Requirement: Inscrição em lote por turma
O módulo SHALL permitir marcar ou desmarcar "vai" para a turma inteira num passeio, numa só operação auditada:
marcar inscreve os alunos da turma que faltam (sem transferidos) e marca os demais; desmarcar tira o "vai" de todos
da turma e libera os assentos deles.

#### Scenario: Desmarcar a turma libera os assentos
- **WHEN** a Coordenação desmarca a turma 5º Ano A de um passeio em que dois alunos dela tinham assento
- **THEN** todos da turma ficam com "vai" desmarcado, os dois assentos ficam livres e as outras turmas não mudam

#### Scenario: Apoio não altera em lote
- **WHEN** um usuário com o perfil Apoio tenta marcar uma turma inteira
- **THEN** o sistema responde 403
