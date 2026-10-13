## ADDED Requirements

### Requirement: Criação e numeração da ata
O sistema DEVE permitir criar uma ata informando título, tipo, secretaria (unidade do organograma), data da reunião, local, cidade, redator, participantes e o indicador de sigilo. Cada ata DEVE receber um número sequencial por secretaria e ano, que nunca é reutilizado.

#### Scenario: Numeração por secretaria e ano
- **GIVEN** a Secretaria de Educação já tem as atas 01/2026 e 02/2026
- **WHEN** um usuário cria uma nova ata para essa secretaria em 2026
- **THEN** a ata recebe o número 03/2026 e o status `em_redacao`

#### Scenario: Exclusão não renumera
- **GIVEN** a ata 02/2026 é excluída
- **WHEN** uma nova ata é criada na mesma secretaria e ano
- **THEN** ela recebe o próximo número livre, sem reaproveitar o 02

### Requirement: Rascunho trava o texto
Ao salvar o rascunho, o texto e os dados da ata DEVEM ficar bloqueados para edição. A ata pode ser reaberta depois apenas para colher assinaturas e finalizar. O bloqueio DEVE ser aplicado no servidor.

#### Scenario: Edição bloqueada após rascunho
- **GIVEN** uma ata com status `rascunho`
- **WHEN** alguém envia uma alteração do conteúdo, dos metadados ou dos participantes
- **THEN** o servidor responde 409 e nada é alterado

#### Scenario: Retomar para assinar
- **GIVEN** uma ata em `rascunho`
- **WHEN** o usuário a abre novamente
- **THEN** o editor aparece somente leitura e as ações disponíveis são Assinar, Preview do PDF, Imprimir e Finalizar

### Requirement: Redação por escrita, voz e Assistente IA
Durante `em_redacao`, o editor DEVE oferecer formatação básica, digitação por voz em pt-BR e um Assistente IA que grava o áudio da reunião e gera o texto em um de 5 modos: transcrição fiel, ata formal, resumo em tópicos, decisões e tarefas, resumo executivo.

#### Scenario: Texto gerado pela IA
- **GIVEN** o editor já tem texto e o usuário grava a reunião no modo "ata formal"
- **WHEN** a IA devolve o resultado
- **THEN** o texto anterior é marcado em vermelho e o texto gerado é anexado, já sanitizado

#### Scenario: IA não configurada
- **GIVEN** não há `GEMINI_API_KEY` configurada
- **WHEN** o usuário abre o editor
- **THEN** o botão do Assistente IA aparece desativado, com a explicação, e o endpoint responde 503

### Requirement: Assinaturas dos participantes
Os participantes DEVEM poder vir do Cadastro de Pessoas ou ser informados por nome avulso. Cada participante assina uma única vez, com assinatura desenhada, e só depois de salvo o rascunho (texto travado). Quem já assinou NÃO DEVE aparecer mais na caixa de seleção de assinantes.

#### Scenario: Assinante sai da seleção
- **GIVEN** uma ata com os participantes Ana e Bruno, e Ana já assinou
- **WHEN** o usuário abre a janela de assinatura
- **THEN** a caixa de seleção lista apenas Bruno

#### Scenario: Assinatura repetida
- **WHEN** alguém envia uma assinatura para um participante que já assinou
- **THEN** o servidor responde 409

### Requirement: Preview, impressão e finalização com PDF
O sistema DEVE oferecer o preview do PDF com a marca "RASCUNHO — NÃO FINALIZADO", a impressão e a finalização. A finalização exige o status `rascunho` e todas as assinaturas, gera o PDF oficial no servidor (timbrado da secretaria, paginação, QR Code e código de validação), guarda o arquivo com hash e torna a ata imutável.

#### Scenario: Finalizar com assinaturas pendentes
- **GIVEN** uma ata em `rascunho` com um participante sem assinatura
- **WHEN** o usuário tenta finalizar
- **THEN** a operação é recusada, com a lista de pendentes

#### Scenario: Finalização bem-sucedida
- **GIVEN** uma ata em `rascunho` com todos os participantes assinados
- **WHEN** o usuário confirma a finalização
- **THEN** o PDF é gerado e guardado, o status passa a `finalizada` e o arquivo é baixado

### Requirement: Validação pública
O sistema DEVE expor uma página pública, sem login, que valida o código impresso no PDF.

#### Scenario: Código válido
- **WHEN** alguém informa o código de uma ata finalizada
- **THEN** a página confirma a autenticidade com o número, a secretaria e a data de finalização (mais o título e o redator quando a ata não é sigilosa)

#### Scenario: Ata não finalizada
- **WHEN** o código pertence a uma ata ainda não finalizada
- **THEN** a página informa que o documento não tem validade até ser finalizado

### Requirement: Ata sigilosa e escopo por secretaria
O usuário DEVE ver apenas as atas das unidades às quais está vinculado, exceto quem tem `ata.manage`. Uma ata sigilosa só pode ser aberta, e só pode ter o PDF baixado, pelo autor e por quem tem `ata.manage`.

#### Scenario: Acesso negado a ata sigilosa
- **GIVEN** uma ata sigilosa criada por Ana
- **WHEN** Bruno, da mesma secretaria e sem `ata.manage`, tenta abri-la
- **THEN** o servidor responde 403 e a listagem mostra só "Ata sigilosa", sem o conteúdo

#### Scenario: Isolamento entre tenants
- **WHEN** um usuário do tenant A consulta atas
- **THEN** nenhuma ata do tenant B é retornada

### Requirement: Cadastros de tipos e de secretaria
Usuários com `ata.manage` DEVEM poder cadastrar os tipos de ata e, para cada unidade do organograma, a sigla e o papel timbrado (JPG/PNG).

#### Scenario: Timbrado no PDF
- **GIVEN** a secretaria tem papel timbrado configurado
- **WHEN** o PDF de uma ata dessa secretaria é gerado
- **THEN** a imagem aparece como fundo das páginas

### Requirement: Auditoria
Toda ação do módulo (criar, editar, salvar rascunho, assinar, finalizar, baixar PDF, abrir ata sigilosa, usar a IA, excluir, cadastros) DEVE ser registrada no `AuditLog` com usuário, data e hora. Uma tela de consulta DEVE estar disponível para quem tem `ata.audit`.

#### Scenario: Assinatura auditada
- **WHEN** um participante assina
- **THEN** o registro de auditoria indica a ata, o participante e o usuário que registrou a assinatura
