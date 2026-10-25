# language: pt
Funcionalidade: Comunicação Escolar, Avisos Segmentados e Ocorrências Disciplinares no SYS-Educa
  Como operador escolar, gestor educacional ou professor
  Quero publicar comunicados oficiais segmentados, gerenciar ocorrências de alunos com ciência formal dos responsáveis e emitir alertas via Outbox
  Para estreitar a integração família-escola, combater a evasão e registrar a rastreabilidade das providências pedagógicas

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que o módulo "educa" e o submódulo "educa-comunicacao" estão habilitados
    E que a escola "EMEF Cecília Meireles" e a turma "5º Ano A" estão cadastradas

  @avisos @segmentacao
  Cenário: Publicar comunicado oficial direcionado a turma específica
    Dado que um gestor escolar com permissão "educa.comunicacao.avisos.manage" cria um comunicado
    E define o título "Reunião de Pais do 5º Ano", urgência "alta" e público-alvo para a turma "5º Ano A"
    Quando o comunicado é publicado
    Então o status do comunicado é definido como "publicado"
    E o aviso fica visível no mural apenas para alunos e responsáveis vinculados à turma selecionada

  @avisos @bloqueio @validacao
  Cenário: Bloquear publicação de aviso sem público-alvo informado
    Dado que um operador tenta cadastrar um comunicado sem selecionar nenhuma rede, escola ou turma
    Quando a requisição de cadastro é enviada
    Então a operação é recusada com código 422
    E o sistema informa a obrigatoriedade de ao menos um público-alvo de destino

  @ocorrencias @disciplinar @matricula
  Cenário: Registrar ocorrência pedagógica e despachar providência com convocação
    Dado que o estudante possui matrícula ativa no "5º Ano A"
    E a equipe escolar registra uma ocorrência do tipo "disciplinar" com gravidade "alta"
    Quando o coordenador adiciona uma providência exigindo o comparecimento presencial dos responsáveis
    Então a ação é salva com o indicador de comparecimento obrigatório
    E o sistema publica um evento de notificação prioritária no Outbox para envio aos guardiões legais

  @ocorrencias @bloqueio @matricula_inativa
  Cenário: Bloquear registro de ocorrência para aluno sem matrícula ativa
    Dado que a matrícula do aluno está com status "cancelada" ou "transferida"
    Quando o operador tenta lançar uma ocorrência para essa matrícula
    Então o sistema rejeita a operação com status 422
    E informa que ocorrências somente podem ser vinculadas a matrículas ativas

  @ocorrencias @ciencia @responsavel
  Cenário: Registrar ciência formal do responsável legal
    Dado que a ocorrência foi registrada e comunicada à família
    Quando o responsável legal comparece ou confirma digitalmente a leitura da ocorrência
    Então o status da ocorrência transiciona para "cientificada"
    E o registro armazena o carimbo de data, hora e responsável confirmador

  @notificacoes @outbox @infrequencia
  Cenário: Disparar notificação de infrequência escolar via Outbox
    Dado que o estudante atingiu 3 faltas consecutivas não justificadas
    Quando a rotina de controle de frequência solicita o disparo de alerta
    Então o sistema publica um evento na tabela "outbox_events" com payload estruturado
    E o status da requisição retorna 202 Accepted para processamento assíncrono
