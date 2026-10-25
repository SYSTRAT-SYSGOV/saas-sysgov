# language: pt
Funcionalidade: Lotação Docente e Cumprimento da Lei do Piso 11.738/2008 no Submódulo Servidores do SYS-Educa
  Como gestor de recursos humanos ou secretário escolar da rede municipal
  Quero gerenciar a vida funcional do servidor, alocar professores e fiscalizar a jornada de trabalho
  Para assegurar a legalidade das contratações, o teto da carga horária e o cumprimento de 1/3 de hora-atividade da Lei do Piso

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a escola "Escola Municipal Monteiro Lobato" está cadastrada no sistema
    E que o ano letivo de 2026 está ativo com calendário publicado

  @servidores @cadastral @pessoas
  Cenário: Cadastrar servidor vinculado a uma pessoa física existente
    Dado que o cidadão "Carlos Eduardo" está previamente cadastrado no módulo Pessoas
    Quando o gestor cadastra o servidor escolar com:
      | pessoa_id               | Carlos Eduardo      |
      | carga_horaria_semanal   | 40.0                |
      | escolaridade            | superior_completo   |
      | codigo_inep_docente     | 123456789012        |
    Então o servidor é salvo com status ativo vinculado à pessoa física
    E nenhuma nova pessoa física duplicada é criada no banco

  @servidores @funcao @matricula
  Cenário: Atribuir funções profissionais com matrículas independentes
    Dado que o servidor "Carlos Eduardo" está ativo na rede
    Quando o gestor atribui a função de "Professor de Educação Básica" com a matrícula "MAT-2026-001"
    E atribui a função de "Coordenador Pedagógico" com a matrícula "MAT-2026-002"
    Então o servidor possui 2 vínculos funcionais ativos com suas respectivas matrículas

  @lotacao @lei_do_piso @aprovacao
  Cenário: Alocar professor respeitando o piso mínimo de 1/3 em horas-atividade
    Dado que o professor "Carlos Eduardo" possui jornada semanal de 30 horas
    Quando o gestor cadastra uma alocação semanal contendo:
      | escola            | Escola Municipal Monteiro Lobato |
      | ano_letivo        | 2026                             |
      | turno             | manha                            |
      | horas_regencia    | 20.0                             |
      | horas_atividade   | 10.0                             |
    Então a alocação é aprovada e registrada com sucesso
    E o percentual de hora-atividade é de 33.33% atendendo ao mínimo de 1/3 da Lei Federal nº 11.738/2008

  @lotacao @lei_do_piso @bloqueio
  Cenário: Bloquear alocação docente que descumpre a proporção da Lei do Piso
    Dado que o professor "Carlos Eduardo" possui jornada semanal de 30 horas
    Quando o gestor tenta cadastrar uma alocação semanal com:
      | escola            | Escola Municipal Monteiro Lobato |
      | ano_letivo        | 2026                             |
      | turno             | manha                            |
      | horas_regencia    | 25.0                             |
      | horas_atividade   | 5.0                              |
    Então a operação é recusada com erro 422 informando código "LEI_DO_PISO_VIOLATION"
    E a mensagem esclarece que a hora-atividade deve ser de no mínimo 1/3 da jornada (10.0 horas)

  @lotacao @teto @carga_contratual
  Cenário: Bloquear alocação que ultrapassa a carga horária contratual global
    Dado que o servidor possui contrato de 40.0 horas semanais e já possui 35.0 horas alocadas
    Quando o gestor tenta alocar mais 10.0 horas semanais em outra unidade escolar
    Então a alocação é recusada com erro 422 informando extrapolação da carga horária contratual

  @afastamento @licenca @suspensao
  Cenário: Lançar licença médica suspendendo alocações ativas
    Dado que o professor possui alocação ativa na "Escola Municipal Monteiro Lobato"
    Quando a direção registra um afastamento por "licenca_medica" de 01/05/2026 a 31/05/2026
    Então o afastamento é salvo e o status da alocação no período passa para "suspensa"

  @falta @atraso @justificativa
  Cenário: Registrar falta funcional com justificativa legal
    Dado que o servidor faltou ao plantão escolar no dia 15/04/2026
    Quando o diretor registra a ocorrência de falta com:
      | minutos               | 240                             |
      | justificada           | true                            |
      | motivo_justificativa  | Atestado médico para consulta   |
    Então a falta é gravada com status justificado no prontuário do servidor
