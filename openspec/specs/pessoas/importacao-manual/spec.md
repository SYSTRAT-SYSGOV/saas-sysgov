# Importacao-Manual Specification

## Purpose

Permite que um administrador cadastre pessoas em massa a partir de uma planilha própria, sem depender de integração externa, para os casos em que há um lote de servidores ou munícipes para registrar de uma só vez.

## Requirements

### Requirement: Importação manual de pessoas via planilha
O sistema SHALL permitir que um usuário com a permissão `cadastros.pessoas.create` envie um arquivo de planilha (CSV) contendo múltiplas pessoas para cadastro em lote, oferecendo um modelo de planilha para download antes do envio.

#### Scenario: Download do modelo de planilha
- **WHEN** o usuário abre o assistente de importação em massa de pessoas
- **THEN** o sistema oferece o download de um arquivo de modelo CSV com as colunas esperadas e uma linha de exemplo

#### Scenario: Usuário sem permissão não acessa a importação em massa
- **WHEN** um usuário sem a permissão `cadastros.pessoas.create` tenta abrir o assistente de importação em massa
- **THEN** o sistema nega o acesso à funcionalidade

### Requirement: Pré-visualização e validação local antes do envio
O sistema SHALL validar localmente, antes de qualquer envio ao backend, cada linha da planilha carregada, sinalizando como inválida qualquer linha sem nome ou sem CPF, ou cujo CPF esteja duplicado dentro do próprio arquivo, sem bloquear o cadastro das demais linhas válidas.

#### Scenario: Linha sem CPF é sinalizada
- **WHEN** uma linha da planilha carregada não possui CPF preenchido
- **THEN** o sistema marca a linha como inválida com o motivo e a mantém fora do lote enviado ao backend, sem impedir o envio das demais linhas válidas

#### Scenario: CPF duplicado dentro da própria planilha
- **WHEN** duas linhas da planilha carregada possuem o mesmo CPF
- **THEN** o sistema marca a segunda ocorrência como inválida por duplicidade no arquivo

### Requirement: Execução em lote com relatório de sucesso e falha por registro
O sistema SHALL processar cada linha válida da planilha individualmente, reaproveitando as mesmas regras de validação e autorização do cadastro individual de pessoas, exibindo o progresso do processamento e um relatório final com a contagem de registros importados com sucesso e com falha, sem interromper o lote quando uma linha individual falhar.

#### Scenario: Linha rejeitada pelo backend não interrompe o lote
- **WHEN** uma linha válida localmente é rejeitada pelo backend por já existir uma pessoa com aquele CPF no tenant
- **THEN** o sistema registra essa linha como falha no relatório final e continua processando as linhas restantes do lote

#### Scenario: Relatório final de importação
- **WHEN** o processamento de todas as linhas válidas é concluído
- **THEN** o sistema exibe a contagem total de registros processados, importados com sucesso e com falha

#### Scenario: Importação em massa não promove pessoa a usuário
- **WHEN** uma pessoa é cadastrada por meio da importação em massa via planilha
- **THEN** o sistema cria o registro de pessoa sem criar automaticamente uma conta de acesso vinculada
