# educa-conselho-pre-conselho Specification

## Purpose
Permite aos docentes e equipes pedagógicas preencher fichas diagnósticas por componente curricular antes do conselho de classe, mapeando objetivos atingidos, metodologias e estudantes com necessidades de intervenção pedagógica preventiva.

## Requirements

### Requirement: Registro de Ficha Diagnóstica de Pré-Conselho
O sistema DEVE (SHALL) permitir que os professores de cada turma e componente curricular registrem fichas diagnósticas estruturadas para o período letivo selecionado.

#### Scenario: Preenchimento com sucesso da ficha diagnóstica
- **WHEN** o docente autenticado envia os dados do pré-conselho contendo diagnóstico da turma, objetivos atingidos, metodologias aplicadas e recursos pedagógicos
- **THEN** o sistema salva a ficha de pré-conselho com status ativo e vincula ao ano letivo, período, turma e componente curricular

#### Scenario: Tentativa de registro fora do prazo do cronograma
- **WHEN** o docente submete a ficha diagnóstica após a data limite estipulada no cronograma pedagógico da escola
- **THEN** o sistema recusa a gravação com código 422 informando encerramento do prazo de submissão do pré-conselho

### Requirement: Mapeamento Individualizado de Alunos em Risco
O sistema DEVE (SHALL) registrar a sinalização nominal de estudantes que apresentam baixo rendimento acadêmico, faltas reiteradas ou vulnerabilidades socioemocionais no pré-conselho.

#### Scenario: Sinalização de estudante com encaminhamento pedagógico
- **WHEN** o docente inclui um estudante na ficha de pré-conselho definindo o nível de atenção como alto e prescrevendo encaminhamentos de reforço
- **THEN** o sistema armazena a avaliação individual do aluno associada à ficha da disciplina e disponibiliza o consolidado para a coordenação pedagógica
