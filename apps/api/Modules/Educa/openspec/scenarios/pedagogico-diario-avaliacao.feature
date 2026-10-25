# language: pt
Funcionalidade: Diário de Classe, Frequência e Avaliação sem eval no Submódulo Pedagógico do SYS-Educa
  Como docente ou coordenador pedagógico da unidade escolar
  Quero registrar as aulas dadas, apurar a frequência dos estudantes enturmados e lançar notas de avaliação
  Para garantir o cumprimento do calendário letivo, o acompanhamento da assiduidade e o cálculo seguro de médias

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a turma "5º Ano A" possui o ano letivo de 2026 ativo
    E que os estudantes "João Silva" e "Pedro Souza" possuem enturmações ativas na turma
    E que o calendário escolar possui dias letivos oficiais e feriados mapeados

  @diario @conteudo @dia_letivo
  Cenário: Registrar aula ministrada no diário de classe em dia letivo válido
    Dado que a data "2026-03-02" é um dia letivo oficial no calendário escolar
    Quando o docente registra a aula ministrada no componente "Língua Portuguesa" com:
      | data       | 2026-03-02                                             |
      | aulas      | 2                                                      |
      | conteudo   | Leitura e interpretação de texto narrativo             |
      | habilidades| EF15LP01, EF15LP02                                     |
    Então o diário de classe é salvo com status "publicado"
    E fica vinculado à turma "5º Ano A" e ao componente "Língua Portuguesa"

  @diario @bloqueio @dia_nao_letivo
  Cenário: Bloquear registro de aula em data não letiva do calendário
    Dado que a data "2026-04-21" é um feriado nacional (Tiradentes) marcado como dia não letivo
    Quando o docente tenta registrar uma aula na data "2026-04-21"
    Então a operação é recusada com erro 422 informando que a data não é um dia letivo

  @frequencia @chamada @enturmacao
  Cenário: Realizar chamada e apuração de frequência dos alunos enturmados
    Dado que o docente abriu o registro de aula da turma "5º Ano A" na data "2026-03-02"
    Quando o docente lança a frequência dos alunos:
      | aluno       | status   |
      | João Silva  | presente |
      | Pedro Souza | falta    |
    Então o registro de presença de "João Silva" é computado
    E a falta de "Pedro Souza" é registrada no diário

  @frequencia @justificativa @abono
  Cenário: Abonar falta mediante apresentação de justificativa médica
    Dado que o aluno "Pedro Souza" possui falta registrada no dia "2026-03-02"
    Quando a coordenação lança a justificativa médica com motivo "Consulta médica odontológica"
    Então a situação da falta passa para "falta_justificada"
    E a justificativa fica associada ao histórico escolar do estudante

  @avaliacao @motor @sem_eval
  Cenário: Calcular média aritmética de etapas através do motor declarativo seguro
    Dado que a regra de avaliação do Ensino Fundamental adota média aritmética com notas de 0 a 10
    E que o aluno "João Silva" obteve as seguintes notas nas 4 etapas:
      | etapa    | nota |
      | 1º Bim   | 7.0  |
      | 2º Bim   | 8.0  |
      | 3º Bim   | 6.5  |
      | 4º Bim   | 7.5  |
    Quando o motor de avaliação processa a fórmula de média anual "(E1 + E2 + E3 + E4) / 4"
    Então a média calculada sem eval é exatamente 7.25
    E o aluno é classificado como "aprovado"

  @avaliacao @arredondamento @tabela
  Cenário: Aplicar regra municipal de arredondamento sobre média fracionária
    Dado que a regra de arredondamento da rede determina salto de notas decimais
    Quando a média calculada de um estudante resulta em 5.76
    E a regra de arredondamento municipal define o intervalo [5.75, 5.99] convergindo para 5.8
    Então a nota final do boletim é arredondada para 5.80
    E a nota original 5.76 é preservada para fins de auditoria
