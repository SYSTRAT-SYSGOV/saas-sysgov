# educa-educacenso-exportacao Specification

## Purpose
Permite gerar em lote assíncrono o arquivo oficial do Censo Escolar delimitado por pipe no padrão posicional do INEP/MEC, com cálculo de hash SHA-256 e download rastreável.

## Requirements

### Requirement: Processamento Assíncrono da Exportação
O sistema DEVE (MUST) processar a exportação do Censo Escolar de forma assíncrona através de Jobs em background, registrando o progresso e o status da solicitação na tabela de controle de exportações.

#### Scenario: Enfileiramento com sucesso
- **WHEN** o usuário com permissão solicitar a exportação do Censo para uma escola e ano letivo sem inconsistências impeditivas
- **THEN** o sistema cria um registro com status "solicitada", enfileira o Job de processamento e responde HTTP 202 Accepted com o identificador da tarefa

#### Scenario: Bloqueio de exportação por inconsistência impeditiva
- **WHEN** o usuário solicitar a exportação e a escola possuir inconsistências cadastrais com classificação impeditiva
- **THEN** o sistema recusa a exportação com HTTP 422 Unprocessable Entity, apresentando o relatório das falhas impeditivas

### Requirement: Formatação Posicional Delimitada por Pipe
O sistema DEVE (MUST) formatar cada linha do arquivo de exportação de acordo com os leiautes oficiais do INEP (00, 10, 20, 30, 40, 50, 60 e 99), unindo os campos pelo caractere pipe sem delimitadores de texto adicionais.

#### Scenario: Linha do registro 00 gerada
- **WHEN** o registro 00 for processado para a escola
- **THEN** a linha gerada inicia com "00|" e contém o código INEP com 8 dígitos e os campos cadastrais na ordem prescrita pelo INEP

#### Scenario: Fechamento com registro 99
- **WHEN** o processamento de todos os registros da escola for finalizado
- **THEN** o sistema emite como última linha do arquivo a constante "99|" marcando o término da exportação

### Requirement: Regras de Anulação e Supressão de Campos
O sistema DEVE (MUST) aplicar regras de anulação automática em campos não aplicáveis, mantendo o campo vazio entre pipes para preservar a posição relativa dos dados.

#### Scenario: Escola pública em relação a campos privados
- **WHEN** a escola exportada possuir dependência administrativa municipal ou estadual
- **THEN** os campos de categoria de mantenedora privada e CNPJ privado permanecem vazios entre os delimitadores pipe

#### Scenario: Supressão de turmas e matrículas para escola inativa
- **WHEN** a escola exportada estiver com situação "paralisada" ou "extinta"
- **THEN** o sistema suprime a emissão dos registros 10, 20, 50 e 60, mantendo unicamente 00, 30, 40 e 99

### Requirement: Integridade e Download do Arquivo Exportado
O sistema DEVE (MUST) calcular o hash SHA-256 do arquivo gerado, armazená-lo em storage seguro e fornecer endpoint de download com conversão para a codificação ISO-8859-1 exigida pelo validador do INEP.

#### Scenario: Download de arquivo concluído com sucesso
- **WHEN** o usuário solicitar o download de uma exportação com status "concluida"
- **THEN** o sistema entrega o arquivo com cabeçalho Content-Disposition adequado e codificação ISO-8859-1
