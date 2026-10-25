# language: pt
Funcionalidade: Gestão de Transporte Escolar, Rotas, Vistorias e Alocação de Estudantes no SYS-Educa
  Como gestor de transporte escolar ou operador da Secretaria Municipal de Educação
  Quero gerenciar rotas, itinerários, veículos com vistorias DETRAN, condutores credenciados e alocação nominal de estudantes
  Para garantir segurança no transporte de alunos, cumprimento do Código de Trânsito Brasileiro e integridade de vagas

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que o módulo "educa" e submódulo "educa-transporte" estão habilitados
    E que as escolas "E.M. Monteiro Lobato" e "E.M. Cecília Meireles" estão cadastradas

  @rotas @pontos_de_parada
  Cenário: Cadastrar rota escolar com itinerário e paradas ordenadas
    Dado que um operador com permissão "educa.transporte.rotas.create" cria uma rota com código "ROTA-01", turno "matutino", tipo "rural" e extensão "24.50" km
    Quando o operador adiciona 3 pontos de parada ordenados sequencialmente (ordens 1, 2 e 3)
    E associa as escolas atendidas pela rota
    Então a rota é salva com sucesso com status ativo
    E a lista de paradas reflete rigorosamente a sequência de embarque/desembarque

  @veiculos @vistoria @detran @bloqueio
  Cenário: Bloquear vínculo de veículo com vistoria semestral do DETRAN vencida
    Dado que o veículo de placa "BRA2E19" possui capacidade de 32 assentos
    E a última vistoria do DETRAN expirou há mais de 180 dias
    Quando o operador tenta vincular o veículo à rota "ROTA-01" ou alocar estudantes
    Então a operação é recusada com erro 422 Unprocessable Entity
    E o sistema emite alerta indicando a obrigatoriedade de laudo semestral válido do DETRAN

  @condutores @cnh @mdm_pessoas
  Cenário: Bloquear credenciamento de motorista sem CNH categoria D ou E válida
    Dado que um operador tenta cadastrar um condutor vinculado a uma pessoa do MDM Pessoas
    Mas a CNH informada pertence à categoria "B" ou está com validade expirada
    Quando a requisição de cadastro é enviada
    Então o sistema rejeita a operação com status 422
    E informa que motoristas de transporte escolar exigem CNH categoria D ou E com curso especializado vigente

  @alocacao @trava_vagas @concorrencia
  Cenário: Impedir sobrelotação de assentos na alocação de estudantes
    Dado que a rota "ROTA-01" possui um micro-ônibus alocado com capacidade máxima de 20 assentos
    E que 20 estudantes já foram alocados e confirmados nessa rota
    Quando outro operador tenta alocar mais 1 estudante na mesma rota
    Então a alocação é bloqueada com erro 422 informando esgotamento da lotação do veículo
    E a contagem de assentos ocupados permanece estritamente em 20

  @alocacao @estudante @transporte_publico
  Cenário: Alocar com sucesso estudante elegível com ponto de embarque definido
    Dado que o estudante possui matrícula ativa e indicação de uso de transporte escolar público
    E que a rota "ROTA-01" possui assentos disponíveis no turno "matutino"
    Quando o operador aloca o estudante indicando o ponto de parada de embarque
    Então a alocação é registrada com sucesso
    E o contador de assentos ocupados do veículo é incrementado atomicamente
