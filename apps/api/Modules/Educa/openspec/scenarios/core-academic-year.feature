# language: pt
@educa @core @ano-letivo
Funcionalidade: Ano Letivo e Calendário Escolar (LDB 9.394/1996, art. 24, I)
  Como secretário(a) municipal de educação
  Quero planejar, conduzir e encerrar o ano letivo de cada escola
  Para garantir 200 dias letivos e 800 horas de efetivo trabalho escolar, com rastreabilidade

  # Fontes do legado: AcademicYear (AY-01..AY-12), Calendario (RC-01..RC-14), state-machines.md §3
  # Estados: planning → active → frozen ⇄ active → evaluation_phase → closed

  Contexto:
    Dado o tenant "prefeitura-exemplo" com o módulo "educa" habilitado no catálogo do tenant
    E a escola "EMEF Paulo Freire" cadastrada como unidade da Secretaria Municipal de Educação
    E o usuário "secretaria" autenticado com as permissões "educa.core.anos_letivos.*" e "educa.core.calendarios.*"

  # ---------------------------------------------------------------------------
  # Criação e etapas
  # ---------------------------------------------------------------------------
  @criacao
  Cenário: Criar ano letivo nasce em planejamento
    Quando eu crio o ano letivo 2026 para "EMEF Paulo Freire"
    Então o ano letivo é criado com status "planning"
    E "is_immutable" é falso
    E existe um registro de auditoria "create_academic_year" com módulo "educa"

  @criacao
  Cenário: Unicidade de ano letivo por escola dentro do tenant
    Dado que "EMEF Paulo Freire" já possui o ano letivo 2026
    Quando eu crio novamente o ano letivo 2026 para "EMEF Paulo Freire"
    Então a resposta é 409 Conflict

  @criacao @copia
  Cenário: Copiar estrutura do ano anterior ajustando datas
    Dado que "EMEF Paulo Freire" possui o ano letivo 2024 com a turma "6º A" e uma etapa terminando em "29/02/2024"
    Quando eu crio o ano letivo 2025 copiando as turmas
    Então a turma "6º A" existe em 2025 com as disciplinas e etapas copiadas
    E a data da etapa copiada é "28/02/2025"
    E o relatório informa os contadores de cópia

  @etapas
  Esquema do Cenário: Validar quantidade de etapas pelo tipo de etapa
    Dado o tipo de etapa "<tipo>" que exige <exigidas> etapas
    Quando eu informo <informadas> etapas para o ano letivo 2026
    Então o resultado é "<resultado>"

    Exemplos:
      | tipo      | exigidas | informadas | resultado |
      | Bimestre  | 4        | 4          | aceito    |
      | Bimestre  | 4        | 3          | recusado  |
      | Trimestre | 3        | 3          | aceito    |
      | Semestre  | 2        | 3          | recusado  |

  @etapas
  Cenário: Etapa não pode invadir o período de outro ano letivo da mesma escola
    Dado que "EMEF Paulo Freire" possui 2024 com uma etapa entre "20/01/2024" e "30/01/2024"
    Quando eu salvo a etapa 1 de 2025 de "10/01/2024" a "05/02/2024"
    Então a resposta é 422 Unprocessable Entity
    E a mensagem informa que a data pertence ao período de outro ano letivo

  @etapas
  Cenário: Etapas do mesmo ano não podem se sobrepor nem ter fim anterior ao início
    Quando eu salvo duas etapas de 2026 que se sobrepõem em "20/04/2026"
    Então a resposta é 422 Unprocessable Entity

  @etapas
  Cenário: Reduzir etapas é bloqueado quando há nota ou falta lançada
    Dado o ano letivo 2026 com 4 etapas e notas lançadas na etapa 4
    Quando eu substituo as etapas por apenas 3
    Então a resposta é 409 Conflict
    E as 4 etapas originais permanecem

  # ---------------------------------------------------------------------------
  # Calendário e LDB
  # ---------------------------------------------------------------------------
  @calendario
  Cenário: Calendário da escola exige etapas com datas
    Dado que "EMEF Paulo Freire" não possui etapas datadas em 2026
    Quando eu crio o calendário 2026 da escola
    Então a resposta é 422 Unprocessable Entity
    E a mensagem informa que as datas de início e término do ano letivo não estão definidas

  @calendario
  Cenário: Dias úteis sem marcação são letivos e fins de semana não
    Dado o calendário rascunho 2026 da escola com período de "02/02/2026" a "18/12/2026"
    Então "segunda-feira 02/02/2026" é um dia letivo
    E "sábado 07/02/2026" não é um dia letivo
    E datas anteriores a "02/02/2026" e posteriores a "18/12/2026" não são letivas

  @calendario
  Cenário: Marcar feriado remove o dia do cômputo
    Dado o motivo "FERIADO_NACIONAL" do tipo "holiday" com "is_school_day" falso
    Quando eu marco "07/09/2026" com esse motivo
    Então "07/09/2026" não é dia letivo
    E os totais do calendário são recalculados na mesma operação

  @calendario
  Cenário: Sábado letivo conta como dia letivo
    Dado o motivo "SABADO_LETIVO" do tipo "extra_school_day" com "is_school_day" verdadeiro
    Quando eu marco "sábado 14/03/2026" com esse motivo
    Então "14/03/2026" é dia letivo

  @calendario
  Cenário: Marcação fora do período do ano letivo é recusada
    Quando eu marco "10/01/2027" em um calendário de 2026
    Então a resposta é 422 Unprocessable Entity

  @calendario
  Cenário: Dia é identificado por data única no calendário
    Dado que "10/03/2026" já está marcado
    Quando eu marco novamente "10/03/2026" com outro motivo
    Então existe um único registro para "10/03/2026" com o novo motivo

  @ldb @publicacao
  Esquema do Cenário: Publicação exige mínimos da LDB
    Dado um calendário rascunho com <dias> dias letivos e <horas> horas
    Quando eu tento publicar o calendário
    Então o resultado é "<resultado>"
    E o diagnóstico informa faltam <faltam_dias> dias e <faltam_horas> horas

    Exemplos:
      | dias | horas  | resultado | faltam_dias | faltam_horas |
      | 200  | 800.00 | publicado | 0           | 0.00         |
      | 205  | 820.00 | publicado | 0           | 0.00         |
      | 199  | 800.00 | recusado  | 1           | 0.00         |
      | 200  | 799.99 | recusado  | 0           | 0.01         |
      | 190  | 760.00 | recusado  | 10          | 40.00        |

  @ldb @publicacao
  Cenário: Recusa de publicação sugere sábados letivos
    Dado um calendário rascunho com 190 dias letivos
    Quando eu tento publicar o calendário
    Então a resposta é 422 com code "LDB_MINIMUM_NOT_MET"
    E o diagnóstico sugere incluir sábados letivos de reposição

  @ldb
  Cenário: Horas respeitam a carga diária e a sobrescrita por dia
    Dado um calendário com carga diária de 240 minutos
    E um dia letivo com carga sobrescrita para 300 minutos
    Então as horas do dia sobrescrito somam 5,00 h
    E os demais dias letivos somam 4,00 h cada

  @rede
  Cenário: Escola importa o calendário padrão da rede
    Dado o calendário padrão da rede 2026 publicado com os feriados municipais
    E o calendário rascunho 2026 de "EMEF Paulo Freire" vazio
    Quando eu importo o calendário da rede para a escola
    Então todos os dias e feriados da rede são copiados de forma atômica com origem "rede"
    E a escola pode acrescentar dias próprios com origem "escola"

  @rede
  Cenário: Falha na importação não deixa cópia parcial
    Dado que a importação falha no meio do processamento
    Então nenhum dia do calendário de rede aparece no calendário da escola

  # ---------------------------------------------------------------------------
  # Ciclo de vida do ano letivo
  # ---------------------------------------------------------------------------
  @ciclo
  Cenário: Iniciar ano letivo exige pré-condições
    Dado o ano letivo 2026 em "planning" sem etapas
    Quando eu executo a transição "start"
    Então a resposta é 409 com code "INVALID_TRANSITION"
    E o status permanece "planning"

  @ciclo
  Cenário: Iniciar ano letivo com tudo pronto
    Dado o ano letivo 2026 em "planning" com etapas datadas, calendário publicado e turmas com matriz ativa
    Quando eu executo a transição "start"
    Então o status passa a "active"
    E existe um registro de auditoria "start_academic_year" com os estados anterior e posterior

  @ciclo
  Cenário: Congelar e retomar durante o recesso
    Dado o ano letivo 2026 em "active"
    Quando eu executo a transição "freeze" com justificativa "Recesso escolar de julho"
    Então o status passa a "frozen"
    Quando eu executo a transição "resume"
    Então o status volta a "active"

  @ciclo
  Esquema do Cenário: Transições inválidas são recusadas
    Dado o ano letivo 2026 em "<origem>"
    Quando eu executo a transição "<evento>"
    Então a resposta é 409 com code "INVALID_TRANSITION"

    Exemplos:
      | origem           | evento           |
      | planning         | close            |
      | planning         | freeze           |
      | active           | start            |
      | active           | close            |
      | frozen           | begin_evaluation |
      | evaluation_phase | resume           |
      | closed           | start            |

  @ciclo @ldb
  Cenário: Fase de avaliação exige 200 dias e 800 horas cumpridos
    Dado o ano letivo 2026 em "active" com 198 dias letivos cumpridos
    Quando eu executo a transição "begin_evaluation"
    Então a resposta é 409
    E o diagnóstico informa faltam 2 dias letivos

  @ciclo
  Cenário: Encerrar ano letivo com matrícula em andamento é bloqueado
    Dado o ano letivo 2026 em "evaluation_phase" com uma matrícula ativa sem situação final
    Quando eu executo a transição "close"
    Então a resposta é 409
    E a mensagem informa "Existem matrículas em andamento"
    E nada é alterado

  @ciclo
  Cenário: Matrícula de atividade complementar não bloqueia o encerramento
    Dado o ano letivo 2026 em "evaluation_phase" apenas com matrícula em andamento de curso de atividade complementar
    Quando eu executo a transição "close"
    Então o status passa a "closed"

  @ciclo @imutabilidade
  Cenário: Ano letivo encerrado é somente leitura definitivo
    Dado o ano letivo 2025 com status "closed"
    Então "is_immutable" é verdadeiro
    Quando eu tento atualizar o ano letivo, suas etapas ou seu calendário
    Então a resposta é 409 com code "ACADEMIC_YEAR_IMMUTABLE"

  @ciclo
  Cenário: Remover ano letivo só em planejamento
    Dado o ano letivo 2026 em "active"
    Quando eu removo o ano letivo
    Então a resposta é 409
    E o ano letivo continua existindo

  # ---------------------------------------------------------------------------
  # Lote
  # ---------------------------------------------------------------------------
  @lote
  Cenário: Criação em lote é tudo ou nada
    Dado 3 escolas onde a terceira possui etapa em conflito com outro ano letivo
    Quando eu processo a ação "create" para o ano 2026 nas 3 escolas
    Então nenhum ano letivo é criado
    E o relatório lista o erro da terceira escola

  @lote
  Cenário: Encerramento em lote relata escola com matrículas em andamento
    Dado 2 escolas com ano 2026 em "evaluation_phase", uma delas com matrícula em andamento
    Quando eu processo a ação "close" para o ano 2026
    Então a escola com matrícula em andamento aparece em "errors" com code "ENROLLMENTS_IN_PROGRESS"
    E nada é alterado nessa escola

  # ---------------------------------------------------------------------------
  # Segurança, tenant e licenciamento
  # ---------------------------------------------------------------------------
  @tenant
  Cenário: Isolamento por tenant
    Dado um ano letivo 2026 do tenant "prefeitura-vizinha"
    Quando o usuário do tenant "prefeitura-exemplo" consulta esse ano letivo pelo id
    Então a resposta é 404 Not Found
    E a listagem de anos letivos não contém registros do outro tenant

  @tenant
  Cenário: Tenant no corpo da requisição é ignorado
    Quando eu crio um ano letivo enviando "tenant_id" de outro tenant no corpo
    Então o registro é gravado com o tenant resolvido pelo cabeçalho "X-Tenant-Slug"

  @rbac
  Esquema do Cenário: Permissão específica por ação
    Dado um usuário apenas com a permissão "<permissao>"
    Quando ele tenta "<acao>"
    Então a resposta é <status>

    Exemplos:
      | permissao                         | acao                      | status |
      | educa.core.anos_letivos.view      | listar anos letivos       | 200    |
      | educa.core.anos_letivos.view      | criar ano letivo          | 403    |
      | educa.core.anos_letivos.open      | transição start           | 200    |
      | educa.core.anos_letivos.open      | transição close           | 403    |
      | educa.core.anos_letivos.close     | transição close           | 200    |
      | educa.core.calendarios.manage     | publicar calendário       | 403    |
      | educa.core.calendarios.publish    | publicar calendário       | 200    |

  @licenca
  Cenário: Submódulo não licenciado
    Dado que o tenant não possui o módulo "educa" habilitado
    Quando o usuário acessa qualquer rota do core
    Então a resposta é 403 com code "MODULE_ACCESS_DENIED"
    E o item de menu do Educa não é exibido

  @auditoria
  Esquema do Cenário: Toda mutação é auditada
    Quando eu executo a ação "<acao>"
    Então existe um registro em "audit_logs" com módulo "educa" e ação "<auditoria>"
    E o registro contém os valores anterior e posterior

    Exemplos:
      | acao                   | auditoria                 |
      | criar ano letivo       | create_academic_year      |
      | substituir etapas      | replace_academic_stages   |
      | publicar calendário    | publish_calendar          |
      | marcar dias            | upsert_calendar_days      |
      | encerrar ano letivo    | close_academic_year       |

  # ---------------------------------------------------------------------------
  # Contrato com o submódulo pedagógico (consumo)
  # ---------------------------------------------------------------------------
  @integracao @pedagogico
  Cenário: Dia não letivo não aceita frequência
    Dado o módulo "educa-pedagogico" habilitado no tenant
    E "07/09/2026" marcado como feriado no calendário publicado
    Quando o professor tenta registrar frequência em "07/09/2026"
    Então a gravação é recusada com a mensagem "Data não letiva segundo o Calendário Escolar vigente"

  @integracao @pedagogico
  Cenário: Lançamento de notas respeita o status do ano letivo
    Dado o ano letivo 2026 em "frozen"
    Quando o professor tenta lançar nota
    Então o lançamento é recusado sem exceção de permissão especial
