# Spec Delta

## Purpose

Permitir que cada órgão (tenant) ofereça cursos, eventos e formações aos seus servidores,
controlando inscrições com vagas e lista de espera, presença por aula, conclusão e emissão de
certificados com validação pública de autenticidade.

## ADDED Requirements

### Requirement: Dados do módulo são isolados por tenant
Todo registro do módulo (cursos, formações, turmas, aulas, inscrições, presenças, modelos de
certificado e certificados) SHALL pertencer a exatamente um tenant e SHALL ser visível e
alterável apenas no contexto desse tenant. Uma requisição autenticada que referencie um registro
de outro tenant SHALL receber `404`, sem revelar a existência do registro. A única exceção é a
validação pública de certificado, que expõe apenas os dados mínimos definidos no requisito
próprio.

#### Scenario: Curso de outro tenant não é acessível
- **WHEN** um usuário do tenant A solicita os dados de um curso do tenant B pelo identificador
- **THEN** o sistema responde `404` e não retorna nenhum dado do curso

#### Scenario: Listagem mostra só o tenant ativo
- **WHEN** um administrador do tenant A lista os cursos
- **THEN** somente cursos do tenant A são retornados, mesmo existindo cursos em outros tenants

### Requirement: Perfis Administrador, Instrutor e Participante
O módulo SHALL oferecer três perfis, provisionados para o tenant quando o módulo é habilitado:
- **Administrador de Cursos**: acesso total ao módulo no tenant.
- **Instrutor**: SHALL ver e operar (aulas agendadas, chamada, QR de check-in, encerramento)
  apenas as turmas em que está designado como instrutor.
- **Participante**: SHALL ver o catálogo publicado e acessar apenas as próprias inscrições,
  frequência e certificados.
Toda autorização SHALL ser verificada no servidor sobre o objeto, independentemente do que o
frontend exibe.

#### Scenario: Instrutor tenta registrar presença em turma alheia
- **WHEN** um instrutor registra presença numa turma em que não é instrutor designado
- **THEN** o sistema responde `403` e nenhuma presença é gravada

#### Scenario: Participante tenta ver inscrição de outra pessoa
- **WHEN** um participante solicita a inscrição ou o certificado de outro participante
- **THEN** o sistema responde `403`

#### Scenario: Habilitar o módulo provisiona os perfis
- **WHEN** o módulo `cursos` é habilitado para um tenant no Admin Suite
- **THEN** os três perfis ficam disponíveis para atribuição aos usuários desse tenant

### Requirement: Cadastro e ciclo de vida do curso
O Administrador SHALL poder criar, editar e excluir cursos com título (obrigatório), descrição,
tipo (`curso` ou `evento`), carga horária em minutos (obrigatória, maior que zero), imagem de
capa opcional e critério de conclusão (frequência mínima em %, padrão 75). O curso SHALL nascer
em `rascunho` e transitar apenas `rascunho → publicado → encerrado`. Somente cursos
`publicado` SHALL aparecer no catálogo do participante e aceitar inscrições. Um curso com
inscrições registradas SHALL NOT ser excluído, apenas encerrado.

#### Scenario: Curso em rascunho não aparece no catálogo
- **WHEN** um participante consulta o catálogo e existe um curso em `rascunho`
- **THEN** esse curso não é listado

#### Scenario: Transição inválida é recusada
- **WHEN** o Administrador tenta voltar um curso `encerrado` para `publicado`
- **THEN** o sistema recusa a operação com mensagem de transição inválida

#### Scenario: Exclusão de curso com inscrições
- **WHEN** o Administrador tenta excluir um curso que tem inscrições em qualquer turma
- **THEN** o sistema recusa a exclusão e orienta a encerrar o curso

### Requirement: Evento é um curso de turma única
Um curso do tipo `evento` SHALL ter no máximo uma turma e SHALL usar as mesmas regras de
inscrição, vagas, lista de espera, presença, conclusão e certificado dos demais cursos.

#### Scenario: Segunda turma para evento
- **WHEN** o Administrador tenta criar uma segunda turma para um curso do tipo `evento`
- **THEN** o sistema recusa a criação informando que eventos têm turma única

### Requirement: Formação agrupa cursos em uma trilha
O Administrador SHALL poder criar formações com título, descrição e uma lista ordenada de
cursos do mesmo tenant, cada um marcado como obrigatório ou optativo, com ao menos um curso
obrigatório. Um participante SHALL ser considerado concluinte da formação quando tiver
concluído (inscrição com status `concluida`) ao menos uma turma de cada curso obrigatório. Ao
atingir a conclusão, o sistema SHALL emitir um certificado da formação cuja carga horária é a
soma das cargas horárias dos cursos concluídos que a compõem.

#### Scenario: Conclusão da formação
- **WHEN** um participante conclui o último curso obrigatório ainda pendente de uma formação
- **THEN** o sistema o registra como concluinte da formação e emite o certificado da formação

#### Scenario: Optativo não é exigido
- **WHEN** um participante concluiu todos os cursos obrigatórios mas nenhum optativo
- **THEN** a formação é considerada concluída

### Requirement: Turmas com vagas, modalidade e instrutores
O Administrador SHALL poder criar turmas para um curso com: data de início e de fim (fim não
anterior ao início), período de inscrição, número de vagas (inteiro maior que zero), modalidade
(`presencial`, `online` ou `hibrido`), local (obrigatório para presencial e híbrido), link
(obrigatório para online e híbrido), indicador de aprovação manual das inscrições e um ou mais
instrutores, que SHALL ser usuários ativos do mesmo tenant. A turma SHALL ter status `aberta`,
`encerrada` ou `cancelada`.

#### Scenario: Turma online sem link
- **WHEN** o Administrador cria uma turma `online` sem informar o link
- **THEN** o sistema recusa a criação indicando que o link é obrigatório

#### Scenario: Instrutor de outro tenant
- **WHEN** o Administrador designa como instrutor um usuário que não pertence ao tenant
- **THEN** o sistema recusa a designação

### Requirement: Aulas do curso agendadas por turma
O curso SHALL ter uma ou mais aulas (título, descrição, ordem e duração em minutos). Cada turma
SHALL ter um agendamento (data e horário de início e fim) por aula do curso, dentro do período
da turma. A frequência de um participante na turma SHALL ser calculada sobre as aulas agendadas
dessa turma.

#### Scenario: Agendamento fora do período da turma
- **WHEN** o Administrador agenda uma aula para uma data posterior ao fim da turma
- **THEN** o sistema recusa o agendamento

### Requirement: Inscrição do participante em turma
Um participante SHALL poder se inscrever numa turma de curso `publicado`, com status `aberta`,
dentro do período de inscrição. Cada participante SHALL ter no máximo uma inscrição ativa
(`pendente`, `confirmada` ou `lista_espera`) por turma. Havendo vaga, a inscrição SHALL nascer
`confirmada`, ou `pendente` quando a turma exige aprovação manual; o Administrador SHALL poder
aprovar (`pendente → confirmada`) ou recusar (`pendente → cancelada`). O Administrador SHALL
poder inscrever participantes diretamente. A ocupação de vagas SHALL considerar inscrições
`confirmada` e `pendente` e SHALL ser consistente sob inscrições simultâneas: o número de
inscrições que ocupam vaga nunca excede o número de vagas.

#### Scenario: Inscrição com vaga e sem aprovação manual
- **WHEN** um participante se inscreve numa turma com vaga que não exige aprovação
- **THEN** a inscrição é criada com status `confirmada`

#### Scenario: Inscrição duplicada
- **WHEN** um participante com inscrição `confirmada` tenta se inscrever de novo na mesma turma
- **THEN** o sistema recusa a nova inscrição

#### Scenario: Inscrições simultâneas pela última vaga
- **WHEN** dois participantes se inscrevem ao mesmo tempo numa turma com uma única vaga restante
- **THEN** exatamente um fica com a vaga e o outro entra na lista de espera

#### Scenario: Inscrição fora do período
- **WHEN** um participante tenta se inscrever depois do fim do período de inscrição
- **THEN** o sistema recusa a inscrição

### Requirement: Lista de espera com promoção automática
Quando não houver vaga, a inscrição SHALL ser criada com status `lista_espera`, com posição por
ordem de chegada. Quando uma inscrição que ocupa vaga for cancelada, o sistema SHALL promover
automaticamente a inscrição mais antiga da lista de espera para `confirmada` (ou `pendente`, se
a turma exige aprovação manual) e SHALL publicar um evento de promoção para notificação futura.
Promoções SHALL cessar quando a turma for encerrada ou cancelada.

#### Scenario: Cancelamento libera vaga para a fila
- **WHEN** um participante `confirmado` cancela a inscrição numa turma lotada com fila
- **THEN** o primeiro da lista de espera passa a `confirmada` e a ordem da fila é mantida para os demais

### Requirement: Cancelamento de inscrição
O participante SHALL poder cancelar a própria inscrição até o início da primeira aula agendada
da turma; o Administrador SHALL poder cancelar a qualquer momento antes do encerramento. Uma
inscrição `cancelada` ou `concluida` SHALL NOT voltar a outro status.

#### Scenario: Participante cancela após o início
- **WHEN** o participante tenta cancelar a inscrição depois do início da primeira aula
- **THEN** o sistema recusa e orienta a procurar o Administrador

### Requirement: Exportação da lista de inscritos
O Administrador e os instrutores da turma SHALL poder exportar a lista de inscritos de uma
turma em CSV (UTF-8), com nome, e-mail, status da inscrição, data da inscrição e frequência
apurada até o momento. A exportação SHALL ser registrada na auditoria.

#### Scenario: Exportação da turma
- **WHEN** o Administrador exporta os inscritos de uma turma
- **THEN** recebe um CSV com uma linha por inscrição da turma e a exportação fica registrada na auditoria

### Requirement: Registro manual de presença
O instrutor designado e o Administrador SHALL poder registrar, para cada aula agendada da
turma, presença ou falta de cada inscrição `confirmada`, a partir do horário de início da aula
e até o encerramento da turma. Alterações posteriores SHALL ser permitidas até o encerramento e
SHALL ficar registradas na auditoria com o valor anterior e o novo.

#### Scenario: Chamada antes da aula
- **WHEN** o instrutor tenta registrar presença numa aula que ainda não começou
- **THEN** o sistema recusa o registro

#### Scenario: Correção de presença
- **WHEN** o instrutor altera uma falta para presença antes do encerramento da turma
- **THEN** a presença é atualizada e a auditoria guarda o valor anterior e o novo

### Requirement: Check-in de presença por QR code
Durante a janela da aula (do início até o fim agendado), o instrutor designado SHALL poder
exibir um QR code de check-in. O conteúdo do QR SHALL expirar em no máximo 60 segundos e ser
renovado automaticamente enquanto exibido. O participante autenticado, com inscrição
`confirmada` na turma, SHALL registrar a própria presença lendo um QR válido. O check-in SHALL
ser idempotente e SHALL ser recusado com QR expirado, fora da janela da aula, de outra aula ou
sem inscrição confirmada.

#### Scenario: Check-in válido
- **WHEN** um participante confirmado lê o QR vigente durante a aula
- **THEN** a presença na aula é registrada com origem `qr_code`

#### Scenario: QR expirado
- **WHEN** um participante usa um QR gerado há mais de 60 segundos
- **THEN** o check-in é recusado e o participante é orientado a ler o código atual

#### Scenario: Check-in repetido
- **WHEN** um participante já presente lê o QR da mesma aula novamente
- **THEN** o sistema confirma a presença sem criar registro duplicado

### Requirement: Encerramento da turma e apuração de conclusão
O Administrador ou um instrutor designado SHALL poder encerrar a turma após a última aula
agendada. Ao encerrar, o sistema SHALL, para cada inscrição `confirmada`, calcular a frequência
(aulas com presença ÷ aulas agendadas × 100) e marcar a inscrição como `concluida` quando a
frequência for maior ou igual à mínima do curso, ou `nao_concluida` caso contrário. Inscrições
`pendente` e `lista_espera` SHALL ser canceladas. Após o encerramento, presenças e inscrições da
turma SHALL ser imutáveis.

#### Scenario: Apuração pela frequência mínima
- **WHEN** a turma de um curso com frequência mínima de 75% é encerrada e um participante esteve em 3 de 4 aulas
- **THEN** a inscrição desse participante passa a `concluida`

#### Scenario: Frequência insuficiente
- **WHEN** a turma é encerrada e um participante esteve em 2 de 4 aulas num curso com mínimo de 75%
- **THEN** a inscrição passa a `nao_concluida` e nenhum certificado é emitido

#### Scenario: Encerramento antes da última aula
- **WHEN** o instrutor tenta encerrar a turma antes do fim da última aula agendada
- **THEN** o sistema recusa o encerramento

### Requirement: Modelo de certificado configurável
O Administrador SHALL poder cadastrar modelos de certificado com título, texto do corpo contendo
campos dinâmicos (`{{participante}}`, `{{curso}}`, `{{carga_horaria}}`, `{{periodo}}`,
`{{data_emissao}}`, `{{orgao}}`), logotipo e até três assinaturas (nome, cargo e imagem). Um
modelo SHALL poder ser marcado como padrão do tenant e SHALL poder ser vinculado a um curso ou
formação específicos. Campos dinâmicos desconhecidos SHALL ser rejeitados ao salvar o modelo.

#### Scenario: Campo dinâmico inválido
- **WHEN** o Administrador salva um modelo com o campo `{{cpf_completo}}`
- **THEN** o sistema recusa o modelo apontando o campo desconhecido

### Requirement: Emissão de certificado com código único
Para cada inscrição que passar a `concluida`, e para cada conclusão de formação, o sistema SHALL
emitir um certificado usando o modelo vinculado ao curso/formação ou, na falta dele, o modelo
padrão do tenant. O certificado SHALL ter um código único em toda a plataforma, não sequencial e
não adivinhável, e SHALL guardar os dados impressos no momento da emissão (nome, curso, carga
horária, período, órgão), de modo que alterações posteriores no curso ou no participante não
mudem um certificado já emitido. O PDF do certificado SHALL conter o código e um QR code que
leva à página pública de validação. Sem modelo aplicável, a emissão SHALL ficar pendente e o
Administrador SHALL ser informado no encerramento.

#### Scenario: Emissão ao concluir
- **WHEN** uma inscrição passa a `concluida` e o tenant tem modelo padrão
- **THEN** um certificado com código único é emitido e fica disponível para o participante

#### Scenario: Alteração posterior do curso
- **WHEN** o título do curso é alterado depois da emissão do certificado
- **THEN** o certificado já emitido continua exibindo o título da época da emissão

### Requirement: Validação pública de autenticidade
Qualquer pessoa, sem login, SHALL poder consultar um certificado pelo código numa página
pública. Para código válido, a página SHALL exibir apenas: nome do participante, curso ou
formação, carga horária, período, data de emissão e nome do órgão emissor, além do status
(válido ou revogado). Para código inexistente, SHALL informar que o certificado não foi
encontrado, sem distinguir entre tenants. A consulta SHALL ter limite de requisições por
origem e SHALL continuar funcionando mesmo que o órgão emissor desabilite o módulo depois da
emissão.

#### Scenario: Órgão desabilitou o módulo
- **WHEN** alguém valida um certificado emitido por um órgão que depois desabilitou o módulo
- **THEN** a página mostra os dados mínimos do certificado e o status válido

#### Scenario: Código válido
- **WHEN** alguém consulta a página de validação com um código emitido
- **THEN** a página mostra os dados mínimos do certificado e o status válido

#### Scenario: Código inexistente
- **WHEN** alguém consulta um código que não existe
- **THEN** a página informa que o certificado não foi encontrado

#### Scenario: Excesso de consultas
- **WHEN** uma mesma origem excede o limite de consultas por minuto
- **THEN** as consultas seguintes recebem `429` até o fim da janela

### Requirement: Revogação de certificado
O Administrador SHALL poder revogar um certificado informando o motivo. Um certificado revogado
SHALL continuar consultável na validação pública com status `revogado` e SHALL deixar de ser
baixável pelo participante.

#### Scenario: Validação de certificado revogado
- **WHEN** alguém valida o código de um certificado revogado
- **THEN** a página exibe o status `revogado`

### Requirement: Área do participante
O participante SHALL ter uma área com: as próprias inscrições (curso, turma, status, posição na
lista de espera quando houver), a frequência por turma com o detalhe por aula, e os certificados
emitidos, com download do PDF.

#### Scenario: Consulta de frequência
- **WHEN** o participante abre uma inscrição em andamento
- **THEN** vê cada aula agendada com a situação presente, falta ou ainda não realizada, e a frequência percentual

### Requirement: Auditoria e eventos de domínio
Toda mutação do módulo SHALL ser registrada na trilha de auditoria da plataforma com usuário,
ação, recurso e valores antes/depois. Inscrição criada, inscrição cancelada, promoção da lista
de espera, turma encerrada e certificado emitido ou revogado SHALL publicar eventos de domínio
no Outbox.

#### Scenario: Auditoria da inscrição
- **WHEN** um participante se inscreve numa turma
- **THEN** a auditoria registra a ação com o usuário autor e um evento de inscrição é publicado no Outbox
