# Spec Delta

## ADDED Requirements

### Requirement: Materiais do curso
O Administrador SHALL poder cadastrar, editar, reordenar, publicar, despublicar e excluir
materiais de um curso. Cada material SHALL ter título (obrigatório), descrição opcional, ordem,
vínculo opcional com uma aula do próprio curso e exatamente um dos tipos:
- **arquivo**: um PDF de até 20 MB, validado pelo conteúdo do arquivo e não só pela extensão;
- **vídeo**: endereço de um vídeo do YouTube ou do Vimeo, exibido incorporado na plataforma;
- **link**: endereço externo `http` ou `https`;
- **texto**: conteúdo formatado, sanitizado ao salvar.
Endereços de vídeo de outros provedores e endereços de link com outros esquemas SHALL ser
rejeitados. Só materiais publicados SHALL ser exibidos ao participante. Material do tipo
arquivo SHALL ter o arquivo substituível sem perder o restante do cadastro.

#### Scenario: Vídeo de provedor não suportado
- **WHEN** o Administrador cadastra um material de vídeo com um endereço que não é do YouTube nem do Vimeo
- **THEN** o sistema recusa o material informando os provedores aceitos

#### Scenario: Arquivo que não é PDF
- **WHEN** o Administrador envia como material um arquivo com extensão `.pdf` cujo conteúdo não é PDF
- **THEN** o sistema recusa o arquivo

#### Scenario: Texto com script
- **WHEN** o Administrador salva um material de texto contendo `<script>` ou atributos de evento como `onclick`
- **THEN** o material é salvo sem esses trechos

#### Scenario: Material despublicado
- **WHEN** o Administrador despublica um material
- **THEN** o material deixa de aparecer para os participantes e continua disponível para o Administrador

### Requirement: Liberação programada de materiais
Cada material SHALL ter uma regra de liberação, avaliada separadamente para cada turma do curso:
- **imediata**: liberado assim que a inscrição do participante é confirmada;
- **no início da aula**: liberado no início do agendamento, na turma, da aula vinculada ao
  material; exige vínculo com aula;
- **dias após o início da turma**: liberado à 00:00 (horário de Brasília) do dia que fica N dias
  depois da data de início da turma, com N entre 0 e 365.
Enquanto o material não estiver liberado para a turma do participante, o sistema SHALL exibir
apenas o título e a data prevista de liberação, e SHALL recusar o acesso ao conteúdo. Quando a
aula vinculada não estiver agendada na turma, o material SHALL permanecer não liberado e SHALL
ser exibido como "aguardando agendamento". A liberação SHALL ser calculada no momento da
consulta, sem depender de processamento agendado.

#### Scenario: Material liberado no início da aula
- **WHEN** um participante consulta um material vinculado à aula 2, cujo agendamento na turma dele começa às 14h, e são 13h59
- **THEN** o participante vê o título e a data prevista, e o conteúdo é recusado

#### Scenario: Mesmo material em turmas diferentes
- **WHEN** um material tem liberação "7 dias após o início da turma" e o curso tem uma turma que começou há 10 dias e outra que começou há 3 dias
- **THEN** o material está liberado para os participantes da primeira turma e não liberado para os da segunda

#### Scenario: Aula vinculada sem agendamento
- **WHEN** o material está vinculado a uma aula que não foi agendada na turma do participante
- **THEN** o material aparece como "aguardando agendamento" e o conteúdo é recusado

#### Scenario: Regra "no início da aula" sem aula
- **WHEN** o Administrador salva um material com liberação "no início da aula" sem vínculo com aula
- **THEN** o sistema recusa o material

### Requirement: Acesso ao conteúdo dos materiais
O participante SHALL acessar os materiais liberados das turmas em que tem inscrição
`confirmada`, `concluida` ou `nao_concluida`. Inscrições `pendente`, `lista_espera`, `recusada`
e `cancelada` SHALL NOT dar acesso ao conteúdo. O Administrador e os instrutores designados em
alguma turma do curso SHALL acessar todos os materiais do curso, independentemente da
liberação. Os arquivos PDF SHALL ser entregues somente por requisição autenticada e autorizada,
e SHALL NOT ter endereço público acessível sem login.

#### Scenario: Participante em lista de espera
- **WHEN** um participante em `lista_espera` tenta abrir um material liberado da turma
- **THEN** o sistema responde `403`

#### Scenario: Acesso ao PDF sem login
- **WHEN** alguém tenta baixar o PDF de um material sem estar autenticado
- **THEN** o sistema responde `401` e não entrega o arquivo

#### Scenario: Consulta depois da conclusão
- **WHEN** um participante com inscrição `concluida` abre um material liberado do curso
- **THEN** o conteúdo é entregue

#### Scenario: Instrutor antes da liberação
- **WHEN** um instrutor designado numa turma do curso abre um material ainda não liberado
- **THEN** o conteúdo é entregue

### Requirement: Banco de questões do curso
O Administrador SHALL poder cadastrar questões no banco de um curso, com enunciado formatado
(sanitizado ao salvar), pontuação maior que zero (padrão 1) e um dos tipos:
- **objetiva**: de 2 a 6 alternativas, com exatamente uma correta;
- **dissertativa**: resposta em texto livre, corrigida manualmente, com orientação de correção
  opcional visível só para quem corrige.
Uma questão que já tenha sido respondida em alguma tentativa SHALL NOT ser excluída, apenas
desativada. Questão desativada SHALL NOT poder ser incluída em novas avaliações. Alterar uma
questão SHALL NOT alterar tentativas já iniciadas.

#### Scenario: Objetiva sem alternativa correta
- **WHEN** o Administrador salva uma questão objetiva sem nenhuma alternativa marcada como correta, ou com duas
- **THEN** o sistema recusa a questão

#### Scenario: Exclusão de questão respondida
- **WHEN** o Administrador tenta excluir uma questão que já foi respondida
- **THEN** o sistema recusa a exclusão e oferece desativar a questão

#### Scenario: Edição de questão após tentativas
- **WHEN** o enunciado de uma questão é alterado depois que participantes já a responderam
- **THEN** as tentativas existentes continuam exibindo e corrigindo pela versão respondida

### Requirement: Avaliações do curso
O Administrador SHALL poder criar avaliações num curso do tipo `curso`, com título, instruções,
questões escolhidas do banco daquele curso em ordem definida, peso na nota final (inteiro de 1
a 10, padrão 1), número máximo de tentativas (1 a 10, padrão 1), tempo limite opcional em
minutos e regra de liberação com as mesmas opções dos materiais. Uma avaliação SHALL ter ao
menos uma questão para ser publicada. Depois que uma avaliação tiver alguma tentativa, as
questões, a ordem e a pontuação dela SHALL NOT ser alteradas, e ela SHALL NOT ser despublicada
nem excluída; título, instruções, peso, tentativas e tempo limite continuam editáveis. Só
avaliações publicadas SHALL aparecer ao participante e contar na nota final.

#### Scenario: Avaliação em evento
- **WHEN** o Administrador tenta criar uma avaliação num curso do tipo `evento`
- **THEN** o sistema recusa a criação informando que eventos não têm avaliação

#### Scenario: Questão de outro curso
- **WHEN** o Administrador tenta incluir numa avaliação uma questão do banco de outro curso
- **THEN** o sistema recusa a inclusão

#### Scenario: Alterar questões após tentativa
- **WHEN** o Administrador tenta remover uma questão de uma avaliação que já tem tentativas
- **THEN** o sistema recusa a alteração

### Requirement: Tentativas de avaliação
Um participante com inscrição `confirmada` numa turma `aberta` SHALL poder iniciar uma
tentativa de uma avaliação publicada e liberada para a turma dele, desde que não tenha outra
tentativa em andamento nessa avaliação e não tenha atingido o número máximo de tentativas. A
tentativa SHALL guardar as questões e alternativas como estavam no início. As respostas SHALL
ser salvas à medida que o participante responde e SHALL poder ser alteradas até o envio. Antes
da correção, o sistema SHALL NOT enviar ao participante qual alternativa é a correta nem a
orientação de correção. Com tempo limite, respostas recebidas depois do prazo SHALL ser
recusadas, e a tentativa SHALL ser considerada enviada com as respostas salvas até o prazo.

#### Scenario: Gabarito não é exposto
- **WHEN** um participante inicia uma tentativa de uma avaliação com questões objetivas
- **THEN** a resposta do servidor traz enunciados e alternativas sem indicar qual alternativa é a correta

#### Scenario: Limite de tentativas
- **WHEN** um participante que já enviou as 2 tentativas permitidas tenta iniciar a terceira
- **THEN** o sistema recusa informando que o limite de tentativas foi atingido

#### Scenario: Tempo esgotado
- **WHEN** um participante envia uma resposta 1 minuto depois do fim do tempo limite da tentativa
- **THEN** o sistema recusa a resposta e considera a tentativa enviada com as respostas salvas até o prazo

#### Scenario: Avaliação ainda não liberada
- **WHEN** um participante tenta iniciar uma avaliação cuja liberação para a turma dele é amanhã
- **THEN** o sistema recusa a tentativa e informa a data de liberação

#### Scenario: Turma encerrada
- **WHEN** um participante tenta iniciar uma tentativa depois do encerramento da turma
- **THEN** o sistema recusa a tentativa

### Requirement: Correção de tentativas
Ao enviar uma tentativa, o sistema SHALL corrigir automaticamente as questões objetivas
(pontuação cheia se a alternativa escolhida é a correta, zero caso contrário; questão sem
resposta vale zero). Uma tentativa sem questões dissertativas SHALL ficar `corrigida` no envio;
com dissertativas, SHALL ficar `aguardando_correcao` até que todas sejam corrigidas. O
Administrador e os instrutores designados na turma da inscrição SHALL poder corrigir as
dissertativas, atribuindo pontos de zero até a pontuação da questão, com comentário opcional, e
SHALL poder rever a correção enquanto a turma não for encerrada. A nota da tentativa SHALL ser
a soma dos pontos obtidos dividida pela soma das pontuações das questões, multiplicada por 10,
com duas casas decimais. Depois de corrigida, o participante SHALL ver a nota, os pontos e o
comentário de cada questão e se acertou ou errou cada objetiva, mas SHALL NOT ver qual era a
alternativa correta.

#### Scenario: Tentativa só com objetivas
- **WHEN** um participante envia uma tentativa com 4 objetivas de 1 ponto e acerta 3
- **THEN** a tentativa fica `corrigida` com nota 7,50

#### Scenario: Tentativa com dissertativa
- **WHEN** um participante envia uma tentativa que contém uma questão dissertativa
- **THEN** a tentativa fica `aguardando_correcao` e aparece na fila de correção dos instrutores da turma

#### Scenario: Instrutor de outra turma
- **WHEN** um instrutor tenta corrigir uma tentativa de participante de turma em que não é instrutor designado
- **THEN** o sistema responde `403`

#### Scenario: Pontos acima do máximo
- **WHEN** o instrutor atribui 3 pontos a uma dissertativa que vale 2
- **THEN** o sistema recusa a correção

### Requirement: Nota final da inscrição
A nota final de uma inscrição SHALL ser a média ponderada, pelo peso, da maior nota entre as
tentativas corrigidas em cada avaliação publicada do curso, numa escala de 0 a 10 com duas
casas decimais. Avaliação sem tentativa corrigida SHALL contar como nota zero. O participante,
o Administrador e os instrutores da turma SHALL poder consultar a nota parcial (com as
tentativas corrigidas até o momento) enquanto a turma estiver aberta, e a nota final fica
gravada na inscrição no encerramento.

#### Scenario: Média ponderada pela melhor tentativa
- **WHEN** um curso tem a avaliação A (peso 1) em que o participante tirou 6 e depois 8, e a avaliação B (peso 3) em que tirou 9
- **THEN** a nota final é 8,75

#### Scenario: Avaliação não feita
- **WHEN** um curso tem duas avaliações de peso 1 e o participante tirou 10 em uma e não fez a outra
- **THEN** a nota final é 5,00

## MODIFIED Requirements

### Requirement: Dados do módulo são isolados por tenant
Todo registro do módulo (cursos, formações, turmas, aulas, inscrições, presenças, modelos de
certificado, certificados, materiais e seus arquivos, questões, avaliações, tentativas e
respostas) SHALL pertencer a exatamente um tenant e SHALL ser visível e alterável apenas no
contexto desse tenant. Uma requisição autenticada que referencie um registro de outro tenant
SHALL receber `404`, sem revelar a existência do registro. A única exceção é a validação
pública de certificado, que expõe apenas os dados mínimos definidos no requisito próprio.

#### Scenario: Curso de outro tenant não é acessível
- **WHEN** um usuário do tenant A solicita os dados de um curso do tenant B pelo identificador
- **THEN** o sistema responde `404` e não retorna nenhum dado do curso

#### Scenario: Listagem mostra só o tenant ativo
- **WHEN** um administrador do tenant A lista os cursos
- **THEN** somente cursos do tenant A são retornados, mesmo existindo cursos em outros tenants

#### Scenario: Arquivo de material de outro tenant
- **WHEN** um usuário do tenant A solicita o PDF de um material do tenant B pelo identificador
- **THEN** o sistema responde `404` e não entrega o arquivo

### Requirement: Perfis Administrador, Instrutor e Participante
O módulo SHALL oferecer três perfis, provisionados para o tenant quando o módulo é habilitado:
- **Administrador de Cursos**: acesso total ao módulo no tenant.
- **Instrutor**: SHALL ver e operar (aulas agendadas, chamada, QR de check-in, correção de
  avaliações, encerramento) apenas as turmas em que está designado como instrutor, e SHALL ver
  os materiais e as avaliações dos cursos dessas turmas.
- **Participante**: SHALL ver o catálogo publicado e acessar apenas as próprias inscrições,
  frequência, materiais liberados, tentativas, notas e certificados.
Toda autorização SHALL ser verificada no servidor sobre o objeto, independentemente do que o
frontend exibe.

#### Scenario: Instrutor tenta registrar presença em turma alheia
- **WHEN** um instrutor registra presença numa turma em que não é instrutor designado
- **THEN** o sistema responde `403` e nenhuma presença é gravada

#### Scenario: Participante tenta ver inscrição de outra pessoa
- **WHEN** um participante solicita a inscrição ou o certificado de outro participante
- **THEN** o sistema responde `403`

#### Scenario: Participante tenta ver tentativa de outra pessoa
- **WHEN** um participante solicita uma tentativa de avaliação de outro participante
- **THEN** o sistema responde `403`

#### Scenario: Habilitar o módulo provisiona os perfis
- **WHEN** o módulo `cursos` é habilitado para um tenant no Admin Suite
- **THEN** os três perfis ficam disponíveis para atribuição aos usuários desse tenant

### Requirement: Cadastro e ciclo de vida do curso
O Administrador SHALL poder criar, editar e excluir cursos com título (obrigatório), descrição,
tipo (`curso` ou `evento`), carga horária em minutos (obrigatória, maior que zero), imagem de
capa opcional e critério de conclusão (frequência mínima em %, padrão 75, e nota mínima
opcional de 0 a 10, só para o tipo `curso`). O curso SHALL nascer em `rascunho` e transitar
apenas `rascunho → publicado → encerrado`. Somente cursos `publicado` SHALL aparecer no
catálogo do participante e aceitar inscrições. Um curso com inscrições registradas SHALL NOT
ser excluído, apenas encerrado. Alterar a frequência mínima ou a nota mínima SHALL valer só
para as turmas encerradas depois da alteração, sem mudar o resultado de turmas já encerradas.

#### Scenario: Curso em rascunho não aparece no catálogo
- **WHEN** um participante consulta o catálogo e existe um curso em `rascunho`
- **THEN** esse curso não é listado

#### Scenario: Transição inválida é recusada
- **WHEN** o Administrador tenta voltar um curso `encerrado` para `publicado`
- **THEN** o sistema recusa a operação com mensagem de transição inválida

#### Scenario: Exclusão de curso com inscrições
- **WHEN** o Administrador tenta excluir um curso que tem inscrições em qualquer turma
- **THEN** o sistema recusa a exclusão e orienta a encerrar o curso

#### Scenario: Nota mínima fora da escala
- **WHEN** o Administrador define a nota mínima 11 para um curso
- **THEN** o sistema recusa o valor informando a escala de 0 a 10

### Requirement: Evento é um curso de turma única
Um curso do tipo `evento` SHALL ter no máximo uma turma e SHALL usar as mesmas regras de
inscrição, vagas, lista de espera, presença, materiais, conclusão e certificado dos demais
cursos. Um evento SHALL NOT ter avaliações nem nota mínima.

#### Scenario: Segunda turma para evento
- **WHEN** o Administrador tenta criar uma segunda turma para um curso do tipo `evento`
- **THEN** o sistema recusa a criação informando que eventos têm turma única

#### Scenario: Nota mínima em evento
- **WHEN** o Administrador define nota mínima para um curso do tipo `evento`
- **THEN** o sistema recusa o valor informando que eventos não têm avaliação

### Requirement: Encerramento da turma e apuração de conclusão
O Administrador ou um instrutor designado SHALL poder encerrar a turma após a última aula
agendada. O encerramento SHALL ser recusado enquanto houver tentativa `aguardando_correcao` na
turma, listando as pendentes, e SHALL ser recusado quando o curso tiver nota mínima e nenhuma
avaliação publicada. Tentativas ainda em andamento SHALL ser consideradas enviadas com as
respostas salvas. Ao encerrar, o sistema SHALL, para cada inscrição `confirmada`, calcular a
frequência (aulas com presença ÷ aulas agendadas × 100) e, quando o curso tiver nota mínima, a
nota final, e SHALL marcar a inscrição como `concluida` quando a frequência for maior ou igual
à mínima do curso e, havendo nota mínima, a nota final for maior ou igual a ela; caso
contrário, como `nao_concluida`. A frequência e a nota apuradas SHALL ficar gravadas na
inscrição. Inscrições `pendente` e `lista_espera` SHALL ser canceladas. Após o encerramento,
presenças, inscrições, tentativas e correções da turma SHALL ser imutáveis.

#### Scenario: Apuração pela frequência mínima
- **WHEN** a turma de um curso com frequência mínima de 75% e sem nota mínima é encerrada e um participante esteve em 3 de 4 aulas
- **THEN** a inscrição desse participante passa a `concluida`

#### Scenario: Frequência insuficiente
- **WHEN** a turma é encerrada e um participante esteve em 2 de 4 aulas num curso com mínimo de 75%
- **THEN** a inscrição passa a `nao_concluida` e nenhum certificado é emitido

#### Scenario: Nota insuficiente
- **WHEN** a turma de um curso com frequência mínima de 75% e nota mínima 7 é encerrada e um participante tem 100% de frequência e nota final 6,50
- **THEN** a inscrição passa a `nao_concluida` e nenhum certificado é emitido

#### Scenario: Frequência e nota suficientes
- **WHEN** a turma de um curso com frequência mínima de 75% e nota mínima 7 é encerrada e um participante tem 80% de frequência e nota final 7,00
- **THEN** a inscrição passa a `concluida`

#### Scenario: Correção pendente
- **WHEN** o instrutor tenta encerrar a turma e há uma tentativa com dissertativa ainda não corrigida
- **THEN** o sistema recusa o encerramento e lista as tentativas pendentes de correção

#### Scenario: Encerramento antes da última aula
- **WHEN** o instrutor tenta encerrar a turma antes do fim da última aula agendada
- **THEN** o sistema recusa o encerramento

### Requirement: Modelo de certificado configurável
O Administrador SHALL poder cadastrar modelos de certificado com título, texto do corpo contendo
campos dinâmicos (`{{participante}}`, `{{curso}}`, `{{carga_horaria}}`, `{{periodo}}`,
`{{data_emissao}}`, `{{orgao}}`, `{{nota}}`), logotipo e até três assinaturas (nome, cargo e
imagem). O campo `{{nota}}` SHALL ser substituído pela nota final com duas casas decimais
quando o curso tiver nota mínima, e por um travessão (`—`) nos demais casos, incluindo
certificados de formação. Um modelo SHALL poder ser marcado como padrão do tenant e SHALL poder
ser vinculado a um curso ou formação específicos. Campos dinâmicos desconhecidos SHALL ser
rejeitados ao salvar o modelo.

#### Scenario: Campo dinâmico inválido
- **WHEN** o Administrador salva um modelo com o campo `{{cpf_completo}}`
- **THEN** o sistema recusa o modelo apontando o campo desconhecido

#### Scenario: Nota impressa no certificado
- **WHEN** um certificado é emitido para uma inscrição concluída com nota final 8,75, num curso com nota mínima, usando um modelo com `{{nota}}`
- **THEN** o certificado exibe "8,75" no lugar do campo

#### Scenario: Nota em curso sem avaliação
- **WHEN** um certificado é emitido para um curso sem nota mínima usando um modelo com `{{nota}}`
- **THEN** o certificado exibe "—" no lugar do campo

### Requirement: Área do participante
O participante SHALL ter uma área com: as próprias inscrições (curso, turma, status, posição na
lista de espera quando houver), a frequência por turma com o detalhe por aula, os materiais do
curso com a situação de liberação de cada um, as avaliações com as tentativas restantes, o
prazo e o resultado de cada tentativa, a nota parcial ou final, e os certificados emitidos, com
download do PDF.

#### Scenario: Consulta de frequência
- **WHEN** o participante abre uma inscrição em andamento
- **THEN** vê cada aula agendada com a situação presente, falta ou ainda não realizada, e a frequência percentual

#### Scenario: Consulta de materiais e avaliações
- **WHEN** o participante abre uma inscrição confirmada de um curso com materiais e avaliações
- **THEN** vê os materiais liberados com acesso ao conteúdo, os não liberados com a data prevista, e cada avaliação com tentativas restantes e nota obtida

### Requirement: Auditoria e eventos de domínio
Toda mutação do módulo SHALL ser registrada na trilha de auditoria da plataforma com usuário,
ação, recurso e valores antes/depois. Inscrição criada, inscrição cancelada, promoção da lista
de espera, turma encerrada, certificado emitido ou revogado, tentativa enviada e tentativa
corrigida SHALL publicar eventos de domínio no Outbox. O salvamento de respostas durante a
tentativa SHALL NOT gerar um registro de auditoria por resposta; o envio da tentativa SHALL
registrar o conjunto de respostas enviadas.

#### Scenario: Auditoria da inscrição
- **WHEN** um participante se inscreve numa turma
- **THEN** a auditoria registra a ação com o usuário autor e um evento de inscrição é publicado no Outbox

#### Scenario: Correção de dissertativa
- **WHEN** um instrutor corrige a última dissertativa pendente de uma tentativa
- **THEN** a auditoria registra a correção com o autor e os pontos atribuídos, e um evento de tentativa corrigida é publicado no Outbox
