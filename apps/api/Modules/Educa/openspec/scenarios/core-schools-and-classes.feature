# language: pt
Funcionalidade: Escolas, Matriz Curricular BNCC e Turmas no SYS-Educa
  Como gestor da Secretaria Municipal de Educação (SME)
  Quero manter as unidades escolares, os cursos, as matrizes curriculares e as turmas
  Para garantir a oferta educacional da rede em conformidade com as diretrizes do MEC/INEP e a LDB

  Contexto:
    Dado que o tenant da "Prefeitura Municipal" está ativo
    E que a Secretaria Municipal de Educação está cadastrada no módulo OrgChart como órgão central
    E que o usuário gestor possui as permissões "educa.core.*"

  @escola @orgchart @inep
  Cenário: Cadastrar unidade escolar vinculada à OrgUnit e validar unicidade do código INEP
    Dado que existe uma unidade administrativa "Escola Municipal Monteiro Lobato" no OrgChart
    Quando eu registro os parâmetros educacionais da escola com:
      | org_unit_id                | {monteiro_lobato_id} |
      | codigo_inep                | 12345678             |
      | sigla                      | EMML                 |
      | situacao_funcionamento     | em_atividade         |
      | dependencia_administrativa | municipal            |
      | zona                       | urbana               |
      | regulamentada              | true                 |
    Então a escola educacional é criada com sucesso
    E o vínculo com o OrgChart é estabelecido
    E se tentar cadastrar outra escola com o mesmo código INEP "12345678" para o mesmo tenant a operação é recusada com conflito 409

  @matriz @bncc @carga_horaria
  Cenário: Definir Matriz Curricular da BNCC por Série
    Dado que o curso "Ensino Fundamental - Anos Iniciais" está cadastrado
    E que a série "5º Ano" possui carga horária mínima anual de 800 horas
    E que a área do conhecimento "Linguagens" possui os componentes "Língua Portuguesa", "Arte" e "Educação Física"
    Quando eu configuro a matriz curricular para o "5º Ano" com:
      | componente        | base            | horas_semanais | horas_anuais |
      | Língua Portuguesa | nacional_comum  | 5              | 200          |
      | Matemática        | nacional_comum  | 5              | 200          |
      | Ciências          | nacional_comum  | 3              | 120          |
      | História          | nacional_comum  | 3              | 120          |
      | Geografia         | nacional_comum  | 3              | 120          |
      | Arte              | nacional_comum  | 1              | 40           |
      | Educação Física   | diversificada   | 2              | 80           |
    Então a matriz curricular é salva com total de 880 horas anuais
    E atende aos mínimos legais da LDB

  @turma @lotacao @vagas
  Cenário: Criar turma com controle de capacidade física e turno
    Dado que a escola "Escola Municipal Monteiro Lobato" possui o ano letivo ativo
    E que a série "5º Ano" e a matriz curricular estão autorizadas na escola
    Quando eu crio a turma "5º Ano A" com:
      | turno          | matutino |
      | lotacao_maxima | 30       |
      | sala           | Sala 04  |
    Então a turma é criada com status "ativa"
    E a capacidade disponível de matrícula inicial é de 30 vagas

  @turma @trava_vagas @regra_legado
  Cenário: Bloquear criação de nova turma para série quando houver turma no mesmo turno com vagas abertas
    Dado que a série "5º Ano" na escola possui a trava de "bloquear_abertura_turma_com_vagas" ativada
    E que a turma "5º Ano A" no turno "matutino" possui lotação máxima de 30 e 20 vagas ainda disponíveis
    Quando eu tento criar uma nova turma "5º Ano B" no mesmo turno "matutino" para o mesmo ano letivo
    Então a criação é recusada com erro 422 informando que a turma "5º Ano A" ainda possui 20 vagas em aberto
