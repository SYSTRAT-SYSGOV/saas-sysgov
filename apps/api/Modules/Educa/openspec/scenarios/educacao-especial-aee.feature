# language: pt
Funcionalidade: Educação Especial e Atendimento Educacional Especializado (AEE)
  Como coordenador pedagógico, professor especialista de AEE e gestor da educação básica
  Quero gerenciar os prontuários de estudantes PAEE, seus laudos médicos, o Plano Educacional Individualizado (PEI) e o dimensionamento de apoio
  Para assegurar o direito à educação inclusiva, a conformidade com a LBI, o sigilo médico LGPD e o atendimento adequado na Sala de Recursos

  Contexto:
    Dado que o tenant municipal possui o módulo "educa-secretaria" e o subsistema de AEE habilitados
    E que o estudante "Guilherme" possui matrícula regular ativa na escola "EMEF Paulo Freire" no turno "manha"

  Cenário: Registro de diagnóstico com laudo médico pericial e controle de sigilo LGPD
    Dado que o coordenador pedagógico cadastra o estudante "Guilherme" como público-alvo da educação especial
    Quando informa o diagnóstico com CID-10 "F84.0" (Transtorno do Espectro Autista), data de emissão e CRM do médico
    E anexa o documento do laudo pericial
    Então o sistema cria o prontuário AEE com status "ativo"
    E restringe a visualização do CID e do arquivo do laudo exclusivamente a usuários com a permissão "educa.aee.laudos.view"
    E registra trilha de auditoria imutável na tabela "audit_logs"

  Cenário: Elaboração colaborativa do PEI com metas pedagógicas adaptadas
    Dado que o estudante possui prontuário AEE ativo
    Quando o professor especialista em conjunto com a coordenação elabora o PEI para o semestre letivo
    E cadastra a meta de desenvolvimento na área "comunicacao_linguagem" com objetivo de comunicação aumentativa
    Então o sistema registra a meta com status "em_andamento"
    E vincula as adequações curriculares e metodológicas ao plano do estudante

  Cenário: Parecer descritivo semestral e encerramento de ciclo do PEI
    Dado que o PEI do estudante possui metas em andamento
    Quando o professor registra o parecer descritivo semestral relatando os avanços pedagógicos
    E atualiza o status das metas para "atingido" ou "parcialmente_atingido"
    Então o sistema homologa o parecer e conclui a avaliação daquele período letivo

  Cenário: Enturmação em Sala de Recursos Multifuncionais no contraturno escolar
    Dado que a escola polo "EMEF Vinicius de Moraes" possui Sala de Recursos Multifuncionais cadastrada
    E que "Guilherme" estuda na classe regular no turno da "manha"
    Quando a secretaria enturma "Guilherme" na Sala de Recursos no turno da "tarde"
    Então o sistema valida a não existência de conflito de turno entre a turma regular e a SRM
    E registra a matrícula de dupla entrada em conformidade com as diretrizes do Censo Escolar e Fundeb

  Cenário: Trava de sobrecarga na alocação de cuidadores escolares
    Dado que a cuidadora escolar "Carla" já atende 3 estudantes dependentes com necessidades de higiene e locomoção
    E que o município estipula limite regulamentar máximo de 3 educandos dependentes por profissional
    Quando a secretaria tenta alocar um 4º estudante dependente para "Carla" no mesmo turno
    Então o sistema bloqueia a alocação informando a sobrecarga do profissional
    E exige a designação de outro cuidador ou a ampliação da equipe de apoio
