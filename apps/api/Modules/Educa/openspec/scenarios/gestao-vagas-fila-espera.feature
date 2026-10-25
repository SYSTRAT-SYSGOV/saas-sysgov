# language: pt
Funcionalidade: Gestão de Vagas, Fila de Espera Transparente e Pré-Matrícula Municipal
  Como gestor da educação básica municipal e cidadão solicitante de vaga
  Quero gerenciar a oferta de vagas escolares e classificar inscrições de forma impessoal e transparente
  Para garantir o cumprimento da Lei Federal nº 14.685/2023, do Estatuto da Criança e do Adolescente e a equidade no acesso à escola pública

  Contexto:
    Dado que o tenant municipal possui o módulo "educa-secretaria" habilitado
    E que a escola municipal "EMEI Sol Nascente" possui capacidade regulamentada de 25 vagas para "creche_maternal" no turno "integral"
    E que 24 vagas já estão ocupadas por matrículas ativas, restando 1 vaga remanescente

  Cenário: Prioridade absoluta e imediata para criança com deficiência (LBI e ECA)
    Dado que existem 10 candidatos inscritos na fila de espera com diferentes pontuações socioeconômicas
    Quando a família inscreve a criança "Lucas" com laudo médico comprobatório de deficiência (PcD)
    E a equipe da triagem valida o critério de prioridade legal
    Então o sistema classifica "Lucas" na 1ª posição da fila de espera daquela etapa
    E registra trilha de auditoria imutável indicando prioridade legal compulsória

  Cenário: Critérios objetivos de desempate socioeconômico na fila de espera
    Dado que a candidata "Mariana" e o candidato "Pedro" concorrem à mesma etapa e escola
    E que ambos obtiveram 100 pontos referentes ao critério de vulnerabilidade CadÚnico / Bolsa Família
    Quando a renda familiar per capita de "Mariana" é comprovadamente inferior à de "Pedro"
    Então o sistema posiciona "Mariana" à frente de "Pedro" na fila de espera
    E registra a justificativa do critério de menor renda familiar para desempate

  Cenário: Convocação nominal com SLA e controle de vagas reservadas
    Dado que surge 1 vaga remanescente na "EMEI Sol Nascente"
    Quando a secretaria escolar dispara a convocação do 1º colocado da fila
    Então o sistema altera o status do candidato para "convocado"
    E incrementa o quantitativo de "vagas_reservadas" da escola
    E estabelece o prazo limite de comparecimento de 5 dias úteis para entrega dos documentos
    E bloqueia a alocação da vaga para qualquer outro solicitante durante a vigência do prazo

  Cenário: Conversão automática de candidato convocado em matrícula ativa
    Dado que o candidato convocado comparece à escola com a documentação completa
    Quando o operador da secretaria escolar defere a solicitação e informa a turma de destino
    Então o sistema converte a inscrição em um registro ativo na tabela "educa_enrollments"
    E altera o status na fila de espera para "matriculado"
    E decrementa as "vagas_reservadas" e incrementa as "vagas_ocupadas" da capacidade da escola
