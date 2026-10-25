# language: pt
Funcionalidade: Conselho de Classe, Pré-Conselho e Atas Deliberativas no SYS-Educa
  Como membro da equipe escolar (docente, coordenador pedagógico ou diretor)
  Quero preencher diagnósticos de pré-conselho e registrar atas deliberativas de conselho
  Para assegurar acompanhamento pedagógico contínuo e decisões formais transparentes de progressão e retenção

  Contexto:
    Dado que a escola "EMEF Paulo Freire" possui o ano letivo de 2026 ativo
    E existe a turma "3º Ano B" com 25 estudantes matriculados
    E o cronograma do 1º Bimestre está agendado com prazo de pré-conselho até "2026-04-15"

  Cenário: Docente submete ficha de pré-conselho dentro do prazo regulamentar
    Dado que o professor de Matemática preencheu o diagnóstico da turma com 85% de objetivos atingidos
    E sinalizou o aluno "Lucas Gabriel" com nível de atenção "alto" por dificuldade em álgebra básica
    Quando o professor submete a ficha diagnóstica em "2026-04-10"
    Então o sistema deve registrar a ficha de pré-conselho com sucesso
    E disponibilizar a sinalização individual para visualização pela coordenação pedagógica

  Cenário: Tentativa de envio de pré-conselho após encerramento do prazo do cronograma
    Dado que a data atual é "2026-04-18" e o prazo do cronograma encerrou em "2026-04-15"
    Quando o professor tenta submeter a ficha diagnóstica sem autorização da direção
    Então o sistema deve recusar a operação com código 422
    E apresentar a mensagem "O prazo de submissão do pré-conselho para este período está encerrado"

  Cenário: Coordenação pedagógica e docentes deliberam ata de conselho de classe
    Dado que a reunião do conselho de classe da turma "3º Ano B" foi realizada com a presença dos membros
    E foram registradas deliberações individuais de progressão plena para 23 alunos e recuperação intensiva para 2 alunos
    Quando a coordenação finaliza a ata da turma
    Então o status da ata transiciona para "finalizada"
    E a ata torna-se imutável, impedindo qualquer alteração de resultado sem processo formal de reabertura

  Cenário: Tentativa de modificação em ata já finalizada ou homologada
    Dado que a ata do 1º Bimestre da turma "3º Ano B" já se encontra com status "finalizada"
    Quando um usuário tenta alterar a deliberação de um estudante nesta ata
    Então o sistema deve rejeitar a requisição com código 422 e erro "ata_bloqueada_para_edicao"
