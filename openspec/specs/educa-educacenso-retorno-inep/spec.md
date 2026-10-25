# educa-educacenso-retorno-inep Specification

## Purpose
Permite ler e processar o arquivo de confirmação e retorno fornecido pelo INEP, atualizando e conciliando automaticamente os códigos INEP atribuídos a escolas, turmas, alunos e servidores.

## Requirements

### Requirement: Recepção e Validação do Arquivo de Retorno
O sistema DEVE (MUST) validar o formato, a estrutura e a compatibilidade do arquivo de retorno emitido pelo INEP antes de processar qualquer atualização cadastral.

#### Scenario: Arquivo inválido ou corrompido
- **WHEN** o usuário enviar um arquivo com extensão ou cabeçalho incompatível com o padrão de retorno do INEP
- **THEN** o sistema rejeita o processamento informando que o formato do arquivo não é reconhecido

#### Scenario: Arquivo válido de retorno aceito
- **WHEN** o usuário enviar um arquivo de retorno oficial do INEP para a escola e o ano letivo correspondentes
- **THEN** o sistema aceita o arquivo e inicia o processo atômico de conciliação

### Requirement: Conciliação Atômica dos Códigos INEP
O sistema DEVE (MUST) conciliar as chaves identificadoras locais (UUID ou CPF/Certidão) com as linhas do retorno e registrar os códigos INEP oficiais nas tabelas correspondentes de alunos, servidores, turmas e escolas.

#### Scenario: Atualização de código INEP do aluno
- **WHEN** o arquivo de retorno identificar um aluno com novo código INEP de 12 dígitos
- **THEN** o sistema atualiza o perfil do aluno no banco de dados e registra a trilha de auditoria da alteração

#### Scenario: Detecção de divergências cadastrais no retorno
- **WHEN** uma linha de retorno referenciar uma entidade que não possui correspondência inequívoca no tenant
- **THEN** o sistema registra o item como alerta no log de conciliação sem interromper os demais registros válidos
