## ADDED Requirements

### Requirement: Leiaute de importação do Censo configurável por órgão
O sistema DEVE oferecer, por tenant, um leiaute de importação do arquivo do Educacenso com os campos de cada registro (posição da coluna, rótulo, tipo, destino). O sistema DEVE trazer o leiaute **Educacenso 2023** como base e DEVE permitir ao órgão adicionar campo personalizado, desativar campo nativo, excluir campo personalizado, alterar a posição, restaurar o padrão e duplicar o leiaute para outro ano. O destino e a chave de um campo nativo NÃO DEVEM ser alteráveis. Exige `transporte.censo.leiaute`.

#### Scenario: Leiaute de fábrica
- **GIVEN** um tenant que nunca configurou o leiaute
- **WHEN** o usuário abre a tela de leiaute
- **THEN** vê os campos do Educacenso 2023 por registro, todos ativos

#### Scenario: Posição mudou no ano corrente
- **GIVEN** o CEP do Registro 30 passou da posição 41 para a 43
- **WHEN** o usuário altera a posição do campo e salva
- **THEN** a importação seguinte lê o CEP da nova posição

#### Scenario: Excluir campo nativo
- **WHEN** o usuário exclui o campo "e-mail" do Registro 30
- **THEN** o campo fica desativado, a importação o ignora e "restaurar padrão" o reativa

#### Scenario: Criar campo personalizado
- **WHEN** o usuário cria o campo "Poder público responsável" no Registro 60, posição 21, tipo código, destino extra
- **THEN** o campo passa a ser lido na importação e o valor é guardado como extra do aluno

#### Scenario: Campo travado
- **WHEN** o usuário tenta desativar o código Inep da escola do Registro 60
- **THEN** a API responde 422 explicando que o campo é necessário para conciliar os dados

#### Scenario: Posição repetida
- **WHEN** o usuário põe dois campos ativos na mesma posição do mesmo registro
- **THEN** a API responde 422 indicando os dois campos

#### Scenario: Duplicar para um novo ano
- **GIVEN** o leiaute "Educacenso 2023" ajustado pelo órgão
- **WHEN** o usuário duplica para "Educacenso 2024"
- **THEN** o novo leiaute nasce com os mesmos ajustes e pode ser alterado sem afetar o original

#### Scenario: Alteração de leiaute auditada
- **WHEN** um leiaute é alterado
- **THEN** a auditoria registra quem alterou e os nomes dos campos afetados

### Requirement: Teste do leiaute com amostra do arquivo
O sistema DEVE permitir enviar o arquivo e devolver, por tipo de registro, a contagem de linhas lidas e uma amostra com coluna, valor, chave e rótulo do campo atribuído, sem gravar nada. Valores de CPF, nome, filiação, telefone e e-mail DEVEM vir mascarados. Exige `transporte.censo.importar`.

#### Scenario: Conferir as posições
- **WHEN** o usuário testa o leiaute com um arquivo
- **THEN** vê as amostras de cada registro e nada é gravado

#### Scenario: Valor que não bate com o tipo
- **GIVEN** a posição configurada para nascimento traz um texto sem formato de data
- **WHEN** o usuário testa o leiaute
- **THEN** o campo é sinalizado como inconsistente

#### Scenario: Dado pessoal mascarado
- **WHEN** a amostra inclui o CPF
- **THEN** ele aparece mascarado

### Requirement: Importação do arquivo do Educacenso
O sistema DEVE importar o arquivo do Educacenso em duas etapas: pré-visualização sem gravar e confirmação. DEVE considerar apenas os alunos com transporte escolar público marcado. DEVE conciliar escola e turma pelo código Inep, e aluno pelo `inep_id` e depois pelo CPF. DEVE listar o que não existe e só criar quando o usuário marcar. NÃO DEVE sobrescrever dado cadastrado com valor vazio. DEVE guardar apenas o relatório, sem o arquivo. Exige `transporte.censo.importar`.

#### Scenario: Pré-visualização
- **GIVEN** um arquivo com 200 matrículas, 40 com transporte
- **WHEN** o usuário envia o arquivo
- **THEN** a pré-visualização mostra os 40 alunos (existentes, novos e divergentes) e nada é gravado

#### Scenario: Aluno encontrado pelo CPF
- **GIVEN** um aluno sem `inep_id`, mas com o mesmo CPF do arquivo
- **WHEN** a importação é confirmada
- **THEN** o `inep_id` é preenchido e nenhum aluno duplicado é criado

#### Scenario: Criar o que não existe só se marcado
- **GIVEN** uma escola do arquivo que não está cadastrada
- **WHEN** o usuário confirma sem marcar a criação
- **THEN** a escola e seus alunos ficam como "não importados" no relatório

#### Scenario: Valor vazio não apaga dado
- **GIVEN** um aluno com CEP cadastrado e o arquivo com CEP vazio
- **WHEN** a importação é confirmada
- **THEN** o CEP cadastrado é mantido

#### Scenario: Divergência de nome
- **GIVEN** o nome no arquivo difere do cadastrado
- **WHEN** a pré-visualização é gerada
- **THEN** a linha aparece como divergência e o nome não é alterado sem confirmação

#### Scenario: Arquivo hostil
- **WHEN** o arquivo excede o limite de tamanho, de colunas por linha ou de tamanho de campo
- **THEN** a API responde 422 sem processar

#### Scenario: Sem dado pessoal no relatório
- **WHEN** a importação termina
- **THEN** o relatório e a auditoria trazem contagens, números de linha e códigos Inep, sem CPF, nome ou filiação

#### Scenario: Isolamento de tenant
- **GIVEN** um aluno com o mesmo Inep em outro tenant
- **WHEN** a importação é confirmada
- **THEN** só os dados do tenant do usuário são lidos e alterados
