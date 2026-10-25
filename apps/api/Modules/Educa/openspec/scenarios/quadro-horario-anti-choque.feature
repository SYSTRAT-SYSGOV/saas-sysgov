# language: pt
Funcionalidade: Gestão de Quadro de Horários e Prevenção Anti-Choque
  Como gestor escolar ou coordenador pedagógico
  Quero configurar matrizes de tempos e alocar componentes curriculares aos professores
  Para garantir uma grade semanal organizada e sem choque de horários na rede municipal

  Contexto:
    Dado que existe uma escola cadastrada e um ano letivo vigente
    E que a turma "6º Ano A" possui matriz curricular com "Matemática" e "História"
    E que o professor "Carlos Silva" possui contrato ativo e habilitação em "Matemática"

  Cenário: Configuração bem-sucedida de matriz de tempos matutina
    Quando a secretaria cadastra 5 tempos de aula para o turno matutino
    E define o 1º tempo das "07:30" às "08:20" e o 2º tempo das "08:20" às "09:10"
    Então o sistema armazena a matriz de horários associada ao quadro da turma
    E disponibiliza os slots para alocação de aulas

  Cenário: Bloqueio de sobreposição temporal na matriz de horários
    Quando o operador tenta cadastrar um tempo com horário inicial "08:00" e término "08:50"
    E esse horário colide com o tempo precedente que encerra às "08:20"
    Então o sistema rejeita a operação com status 422
    E exibe mensagem de erro de sobreposição de horários

  Cenário: Alocação normal de aula em slot disponível
    Dado que o slot de Segunda-feira às "07:30" está vago
    Quando a secretaria aloca a disciplina "Matemática" com o professor "Carlos Silva"
    Então a aula é gravada com sucesso
    E o professor "Carlos Silva" passa a constar como titular daquele horário

  Cenário: Bloqueio obrigatório por choque de horários de professor (mesma escola)
    Dado que o professor "Carlos Silva" já leciona na turma "6º Ano A" na Terça-feira às "08:20"
    Quando o operador tenta alocar o professor "Carlos Silva" na turma "7º Ano B" na Terça-feira às "08:20"
    Então o sistema bloqueia a alocação
    E informa que o docente já possui aula alocada na turma "6º Ano A" no mesmo horário

  Cenário: Bloqueio por choque de horários entre escolas distintas no mesmo tenant
    Dado que o professor "Carlos Silva" leciona na "Escola Municipal Santos Dumont" na Quarta-feira às "07:30"
    Quando a secretaria da "Escola Municipal Monteiro Lobato" tenta alocar o professor "Carlos Silva" na Quarta-feira às "07:30"
    Então o sistema impede a gravação com código 422
    E aponta colisão com a aula alocada na "Escola Municipal Santos Dumont"

  Cenário: Atribuição de professor substituto com vigência temporal
    Dado que o professor "Carlos Silva" entrará em licença médica de "2026-03-01" a "2026-03-15"
    Quando a direção cadastra a professora "Ana Souza" como substituta para esse período
    Então as aulas do intervalo passam a exibir a professora "Ana Souza" como docente em regência
    E o professor "Carlos Silva" permanece registrado como titular de direito
