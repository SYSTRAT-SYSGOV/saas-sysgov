# educa-conselho-atas-deliberativas Specification

## Purpose
Gerencia cronogramas de reuniões, atas deliberativas colegiadas de conselho de classe, pareceres descritivos finais e registros oficiais de deliberação de progressão, recuperação ou retenção dos estudantes.

## Requirements

### Requirement: Gestão de Cronograma de Reuniões do Conselho
O sistema DEVE (SHALL) permitir o agendamento de reuniões de conselho de classe com definição de período letivo, datas limites de pré-conselho e data da plenária colegiada.

#### Scenario: Cadastro de cronograma válido
- **WHEN** a equipe gestora cadastra um cronograma para o ano letivo ativo informando período, data de início e fim do pré-conselho e data da reunião
- **THEN** o sistema valida que as datas pertencem ao ano letivo e cria o cronograma com status agendado

### Requirement: Elaboração e Deliberação da Ata de Conselho
O sistema DEVE (SHALL) registrar as decisões colegiadas de conselho de classe para cada estudante da turma com resultado formal de progressão plena, progressão com dependência, recuperação intensiva ou retenção.

#### Scenario: Finalização de ata de conselho de classe com deliberações
- **WHEN** a direção ou coordenação pedagógica finaliza a ata da turma contendo os membros participantes e as deliberações individuais de todos os estudantes
- **THEN** o sistema transiciona o status da ata de rascunho para finalizada e bloqueia qualquer edição posterior sem reabertura formal

#### Scenario: Tentativa de alteração em ata finalizada ou arquivada
- **WHEN** um operador tenta atualizar dados ou deliberações de uma ata que se encontra no status finalizada ou arquivada
- **THEN** o sistema rejeita a operação com código 422 informando que a ata homologada é imutável
