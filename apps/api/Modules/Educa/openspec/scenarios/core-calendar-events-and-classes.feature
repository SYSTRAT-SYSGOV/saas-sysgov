# language: pt
Funcionalidade: Eventos do Calendário Escolar e Marcações por Turma no SYS-Educa
  Como equipe pedagógica da escola ou da Secretaria Municipal de Educação
  Quero agendar eventos, anotações e vincular dias letivos de reposição/extras a turmas específicas
  Para manter o planejamento escolar transparente e permitir reposição pontual de aulas por turma

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a escola "Escola Municipal Monteiro Lobato" possui o calendário publicado para o ano letivo de 2026
    E que o usuário autenticado possui a permissão "educa.core.calendarios.*"

  @calendario @evento @anotacao
  Cenário: Registrar evento pedagógico em um dia do calendário escolar
    Dado que o dia "2026-05-15" é um dia letivo regular no calendário da escola
    Quando eu cadastro o evento pedagógico:
      | titulo         | Feira de Ciências e Tecnologia |
      | descricao      | Apresentação dos projetos interdisciplinares do 6º ao 9º ano |
      | data           | 2026-05-15                     |
      | tipo_evento    | pedagogico                     |
      | horario_inicio | 08:00                          |
      | horario_fim    | 12:00                          |
    Então o evento é registrado com sucesso para o calendário
    E fica visível na consulta de eventos do mês de maio de 2026

  @calendario @turma @dia_extra @reposicao
  Cenário: Vincular dia de reposição/extra-letivo exclusivamente a turmas específicas
    Dado que o sábado "2026-06-20" foi cadastrado como "Sábado Letivo de Reposição" com motivo "extra_school_day"
    E que a escola possui as turmas "9º Ano A", "9º Ano B" e "1º Ano A"
    Quando eu associo o dia "2026-06-20" às turmas:
      | turma    |
      | 9º Ano A |
      | 9º Ano B |
    Então o sábado "2026-06-20" torna-se dia letivo para o "9º Ano A" e "9º Ano B"
    Mas permanece como dia não-letivo para a turma "1º Ano A"
    E a consulta do calendário da turma "9º Ano A" exibe a marcação de reposição
