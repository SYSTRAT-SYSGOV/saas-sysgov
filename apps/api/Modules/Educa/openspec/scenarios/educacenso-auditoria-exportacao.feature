# language: pt
Funcionalidade: Auditoria, Exportação e Retorno do Educacenso (INEP/MEC) no SYS-Educa
  Como operador escolar ou secretário municipal de educação
  Quero auditar a consistência dos dados escolares, gerar o arquivo oficial do Censo Escolar e processar o arquivo de retorno
  Para garantir conformidade com as regras do INEP/MEC e habilitar os repasses constitucionais do FUNDEB

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a escola "Escola Municipal Monteiro Lobato" possui o ano letivo de 2026 configurado
    E que a data de referência oficial do Censo Escolar é a última quarta-feira de maio de 2026

  @auditoria @data_referencia @bloqueio
  Cenário: Bloquear auditoria quando ano letivo não possuir data de referência do Censo
    Dado que o ano letivo de 2026 não possui data de referência do Censo cadastrada
    Quando eu solicito a auditoria de consistência cadastral da escola
    Então a operação é recusada com erro 422 informando a obrigatoriedade da data de referência institucional

  @auditoria @regras @impeditivo @inep
  Cenário: Identificar inconsistência impeditiva para escola sem código INEP válido
    Dado que a escola "Escola Municipal Monteiro Lobato" não possui código INEP informado
    Quando eu executo a auditoria cadastral da escola para o Censo Escolar
    Então o sistema emite um diagnóstico impeditivo para o Registro 00
    E a escola fica bloqueada para exportação oficial até o saneamento do código INEP

  @auditoria @regras @docente @cpf
  Cenário: Identificar docente alocado sem CPF no cadastro de pessoas
    Dado que a turma "5º Ano A" possui um docente alocado sem CPF cadastrado no MDM de Pessoas
    Quando eu executo a auditoria cadastral da escola
    Então o sistema emite uma pendência impeditiva para o Registro 30 e 50
    E indica a necessidade de completar o cadastro do profissional no módulo Pessoas

  @exportacao @bloqueio @impeditivos
  Cenário: Bloquear exportação de arquivo do Censo havendo inconsistências impeditivas
    Dado que a escola possui 2 inconsistências cadastradas com gravidade impeditiva
    Quando eu tento solicitar a exportação do arquivo do Censo
    Então a requisição é rejeitada com status 422 Unprocessable Entity
    E o sistema apresenta o relatório detalhado das falhas que impedem a exportação

  @exportacao @assincrona @leiaute_pipe
  Cenário: Gerar arquivo posicional delimitado por pipe após auditoria aprovada
    Dado que a escola não possui nenhuma inconsistência impeditiva
    Quando eu solicito a geração do arquivo oficial do Censo
    Então a exportação é enfileirada com status "solicitada" e código HTTP 202
    E o job em lote processa os registros 00, 10, 20, 30, 40, 50 e 60
    E o arquivo é finalizado com a linha "99|"
    E o checksum SHA-256 é calculado e registrado no histórico

  @retorno @conciliacao @atualizacao_inep
  Cenário: Processar arquivo de retorno do INEP e atualizar códigos de alunos e turmas
    Dado que a escola realizou a exportação do Censo e aguarda o retorno do MEC
    Quando o usuário faz o upload do arquivo de retorno oficial do INEP
    Então o sistema valida a integridade do arquivo
    E atualiza atomicamente os códigos INEP dos alunos e turmas identificados
    E registra o log detalhado de conciliação com as entidades atualizadas
