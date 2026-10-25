# language: pt
Funcionalidade: Matrículas e Enturmações no Submódulo Secretaria do SYS-Educa
  Como secretário escolar ou gestor da Secretaria Municipal de Educação
  Quero matricular os estudantes vinculados ao cadastro único do MDM (Pessoas) e alocá-los em turmas
  Para garantir o controle de vagas, a prevenção de choque de horários e a rastreabilidade da vida escolar

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a escola "Escola Municipal Monteiro Lobato" possui o ano letivo de 2026 ativo
    E que o estudante "João Silva" está cadastrado no módulo Pessoas como pessoa física
    E que a mãe "Maria Silva" está cadastrada no módulo Pessoas como responsável legal

  @matricula @criacao @codigo_atomico
  Cenário: Realizar matrícula inicial de estudante vinculando a pessoa no MDM
    Dado que a série "5º Ano" está autorizada na escola
    Quando eu realizo a matrícula de "João Silva" com:
      | escola     | Escola Municipal Monteiro Lobato |
      | serie      | 5º Ano                           |
      | ano_letivo | 2026                             |
      | tipo       | inicial                          |
    Então a matrícula é registrada com status "ativa"
    E recebe um código de matrícula único no padrão anual sequencial
    E o vínculo com o registro de "João Silva" em Pessoas é preservado

  @matricula @duplicidade @bloqueio
  Cenário: Bloquear matrícula duplicada do mesmo estudante na mesma série e ano letivo
    Dado que "João Silva" já possui matrícula ativa no "5º Ano" para o ano de 2026
    Quando eu tento cadastrar uma nova matrícula para "João Silva" na mesma série e ano letivo
    Então a operação é recusada com erro 409 informando que o estudante já possui matrícula ativa

  @enturmacao @vagas @trava_capacidade
  Cenário: Enturmar estudante em turma com controle estrito de vagas
    Dado que a turma "5º Ano A" possui lotação máxima de 30 e 1 vaga restante
    Quando eu realizo a enturmação de "João Silva" na turma "5º Ano A"
    Então a enturmação é concluída com sucesso
    E a lotação efetiva da turma passa para 30 alunos
    E as vagas disponíveis passam para 0
    E uma tentativa subsequente de enturmar outro aluno na mesma turma é recusada com erro 422 por falta de vagas

  @enturmacao @choque_horario
  Cenário: Bloquear enturmação com sobreposição de turno e horários de escolarização
    Dado que "João Silva" já está enturmado na turma regular matutina "5º Ano A"
    Quando eu tento enturmar "João Silva" em outra turma regular no mesmo turno matutino
    Então a enturmação é recusada com erro 422 por choque de horários
    Mas se eu enturmá-lo em uma turma de contraturno vespertino de Atendimento Educacional Especializado (AEE) a operação é permitida

  @remanejamento @transferencia
  Cenário: Remanejar estudante entre turmas liberando vaga na turma de origem
    Dado que "João Silva" está enturmado no "5º Ano A" (matutino)
    E que a turma "5º Ano B" (vespertino) possui 5 vagas disponíveis
    Quando eu executo o remanejamento de "João Silva" para o "5º Ano B"
    Então a enturmação no "5º Ano A" é encerrada registrando a data de saída
    E a vaga no "5º Ano A" é imediatamente liberada
    E uma nova enturmação ativa é aberta no "5º Ano B"
    E a matrícula do aluno permanece ativa sem interrupção
