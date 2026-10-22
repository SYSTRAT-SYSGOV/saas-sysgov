## MODIFIED Requirements

### Requirement: Modelo de certificado configurável
O Administrador SHALL poder cadastrar modelos de certificado de dois tipos. O tipo `padrao` tem
título, texto do corpo contendo campos dinâmicos (`{{participante}}`, `{{curso}}`,
`{{carga_horaria}}`, `{{periodo}}`, `{{data_emissao}}`, `{{orgao}}`, `{{nota}}`), logotipo e até
três assinaturas (nome, cargo e imagem), impressos no leiaute fixo do sistema. O tipo `visual` tem
os mesmos título e corpo, uma orientação (`paisagem` ou `retrato`), uma imagem de fundo e uma lista
de elementos posicionados, conforme o requisito "Leiaute visual do modelo de certificado". O campo
`{{nota}}` SHALL ser substituído pela nota final com duas casas decimais quando o curso tiver nota
mínima, e por um travessão (`—`) nos demais casos, incluindo certificados de formação e avulsos.
Um modelo de qualquer tipo SHALL poder ser marcado como padrão do tenant e SHALL poder ser
vinculado a um curso ou formação específicos. Campos dinâmicos desconhecidos SHALL ser rejeitados
ao salvar o modelo, tanto no corpo quanto nos textos livres dos elementos. Modelos existentes antes
desta mudança SHALL ser do tipo `padrao` e continuar gerando o mesmo PDF.

#### Scenario: Campo dinâmico inválido
- **WHEN** o Administrador salva um modelo com o campo `{{cpf_completo}}`
- **THEN** o sistema recusa o modelo apontando o campo desconhecido

#### Scenario: Campo dinâmico inválido em texto livre do leiaute
- **WHEN** o Administrador salva um modelo visual com um elemento de texto livre contendo `{{cpf_completo}}`
- **THEN** o sistema recusa o modelo apontando o campo desconhecido

#### Scenario: Nota impressa no certificado
- **WHEN** um certificado é emitido para uma inscrição concluída com nota final 8,75, num curso com nota mínima, usando um modelo com `{{nota}}`
- **THEN** o certificado exibe "8,75" no lugar do campo

#### Scenario: Nota em curso sem avaliação
- **WHEN** um certificado é emitido para um curso sem nota mínima usando um modelo com `{{nota}}`
- **THEN** o certificado exibe "—" no lugar do campo

#### Scenario: Modelo anterior à mudança
- **WHEN** um certificado é emitido com um modelo cadastrado antes desta mudança
- **THEN** o PDF sai no leiaute fixo, igual ao de antes

### Requirement: Emissão de certificado com código único
Para cada inscrição que passar a `concluida`, para cada conclusão de formação e para cada emissão
avulsa, o sistema SHALL emitir um certificado usando o modelo vinculado ao curso/formação ou, na
falta dele, o modelo padrão do tenant (na emissão avulsa, o Administrador pode escolher o modelo).
O certificado SHALL ter um tipo (`curso`, `formacao` ou `avulso`) e um código único em toda a
plataforma, não sequencial e não adivinhável, e SHALL guardar os dados impressos no momento da
emissão (nome, curso, carga horária, período, órgão) e, para modelos visuais, o leiaute, o fundo e
os dados das assinaturas usados (nome, cargo, registro profissional, imagens), de modo que
alterações posteriores no curso, no participante, no modelo ou na assinatura não mudem um
certificado já emitido. O PDF do certificado SHALL conter o código e um QR code que leva à página
pública de validação. Sem modelo aplicável, a emissão SHALL ficar pendente e o Administrador SHALL
ser informado no encerramento.

#### Scenario: Emissão ao concluir
- **WHEN** uma inscrição passa a `concluida` e o tenant tem modelo padrão
- **THEN** um certificado com código único é emitido e fica disponível para o participante

#### Scenario: Alteração posterior do curso
- **WHEN** o título do curso é alterado depois da emissão do certificado
- **THEN** o certificado já emitido continua exibindo o título da época da emissão

#### Scenario: Alteração posterior do leiaute ou da assinatura
- **WHEN** depois da emissão o Administrador move elementos do modelo visual, troca o fundo ou troca a imagem e o cargo de uma assinatura usada
- **THEN** o PDF do certificado já emitido continua com o leiaute, o fundo e a assinatura da época da emissão

#### Scenario: Modelo visual sem QR code
- **WHEN** o Administrador salva um modelo visual sem elemento de QR code
- **THEN** o sistema recusa o modelo informando que o QR code de validação é obrigatório

## ADDED Requirements

### Requirement: Leiaute visual do modelo de certificado
O modelo `visual` SHALL ser impresso em página A4 na orientação escolhida, com a imagem de fundo
ocupando a página inteira e os elementos posicionados em pontos (coordenadas `x`, `y` a partir do
canto superior esquerdo e largura `largura`). Os elementos SHALL ser de um destes tipos:
- `texto`: um campo dinâmico (`participante`, `curso`, `carga_horaria`, `periodo`,
  `data_emissao`, `orgao`, `nota`, `codigo`, `titulo` ou `corpo`) ou um texto livre com campos
  dinâmicos; com fonte (serifada ou sem serifa), tamanho de 6 a 72 pt, cor hexadecimal, negrito,
  caixa alta e alinhamento (esquerda, centro, direita, justificado); o texto quebra linha dentro da
  largura;
- `qrcode`: o QR code de validação, com lado igual à largura;
- `logotipo`: a imagem do logotipo do modelo;
- `assinatura`: uma assinatura da biblioteca do órgão, impressa como imagem com nome, cargo e
  registro profissional abaixo, centralizados na largura; opcionalmente sem os textos;
- `selo`: a imagem do selo de uma assinatura da biblioteca.
O fundo SHALL ser PNG ou JPEG de até 5 MB, verificado pelo conteúdo real do arquivo. Elementos
fora da página, mais de 40 elementos, tipos desconhecidos ou assinaturas de outro tenant ou
inativas SHALL ser rejeitados ao salvar. O modelo visual SHALL ter exatamente um elemento
`qrcode`.

#### Scenario: Elemento fora da página
- **WHEN** o Administrador salva um modelo visual paisagem com um texto em `x = 900`
- **THEN** o sistema recusa o modelo informando o elemento fora da página

#### Scenario: Assinatura de outro órgão
- **WHEN** o Administrador salva um modelo visual referenciando uma assinatura de outro tenant
- **THEN** o sistema recusa o modelo como se a assinatura não existisse

#### Scenario: Fundo com extensão falsa
- **WHEN** o Administrador envia como fundo um arquivo `.png` cujo conteúdo não é imagem
- **THEN** o sistema recusa o arquivo

#### Scenario: Nome impresso na posição definida
- **WHEN** um certificado é emitido com um modelo visual que tem o campo `participante` em `x = 100`, `y = 250`, largura 642, 28 pt, centralizado e em caixa alta
- **THEN** o PDF mostra o nome do participante em caixa alta, 28 pt, centralizado nessa faixa da página

### Requirement: Construtor visual e pré-visualização
O painel SHALL oferecer ao Administrador uma tela de construção do modelo visual que exibe o fundo
em escala e permite adicionar, arrastar, redimensionar, configurar e remover elementos, salvando as
posições em pontos. Um fundo em PDF SHALL poder ser escolhido na tela: a primeira página é
convertida em imagem no navegador antes do envio. O Administrador SHALL poder pré-visualizar o
modelo em PDF, gerado pelo servidor com dados de exemplo, sem emitir certificado nem consumir
código.

#### Scenario: Pré-visualização não emite
- **WHEN** o Administrador pede a pré-visualização de um modelo visual
- **THEN** recebe um PDF com dados de exemplo e nenhum certificado é gravado

#### Scenario: Fundo em PDF
- **WHEN** o Administrador escolhe um PDF como fundo no construtor
- **THEN** a primeira página é enviada como imagem e passa a ser o fundo do modelo

### Requirement: Biblioteca de assinaturas do órgão
O Administrador SHALL poder cadastrar assinaturas reutilizáveis do órgão com nome, cargo, registro
profissional (opcional), imagem da assinatura (PNG ou JPEG, até 2 MB) e imagem do selo (opcional,
mesmas regras), e ativá-las ou desativá-las. Uma assinatura inativa SHALL continuar impressa nos
modelos que já a usam, mas não SHALL poder ser adicionada a novos elementos. Uma assinatura usada
por algum modelo SHALL não poder ser excluída, só desativada. Ao substituir uma imagem, o arquivo
anterior SHALL ser mantido, porque certificados emitidos apontam para ele.

#### Scenario: Excluir assinatura em uso
- **WHEN** o Administrador tenta excluir uma assinatura referenciada por um modelo
- **THEN** o sistema recusa e sugere desativá-la

#### Scenario: Registro profissional impresso
- **WHEN** um certificado é emitido com uma assinatura de cargo "Instrutora" e registro "CREA 12345"
- **THEN** abaixo da imagem aparecem o nome e "Instrutora — CREA 12345"

### Requirement: Verso com conteúdo programático
O curso SHALL ter um campo opcional de conteúdo programático. Um modelo (de qualquer tipo) com
verso ativo SHALL imprimir uma segunda página com o título "Conteúdo programático", o conteúdo do
curso congelado na emissão, a carga horária e o código de validação, sobre o fundo de verso do
modelo quando houver. No certificado de formação, o verso SHALL listar os cursos da formação com
suas cargas horárias. Sem conteúdo a imprimir, o verso SHALL ser omitido.

#### Scenario: Curso sem conteúdo programático
- **WHEN** um certificado é emitido com modelo de verso ativo para um curso sem conteúdo programático
- **THEN** o PDF tem só a frente

#### Scenario: Conteúdo alterado depois da emissão
- **WHEN** o conteúdo programático do curso é alterado depois da emissão
- **THEN** o verso do certificado já emitido continua com o conteúdo da época da emissão

### Requirement: Emissão avulsa de certificados
O Administrador SHALL poder emitir certificados do tipo `avulso` para um curso do tenant, sem
turma, presença ou avaliação, informando para cada destinatário o nome e, opcionalmente, e-mail e
documento (CPF ou CNPJ), além da data de conclusão, digitados ou importados de CSV (até 1.000
linhas por envio). O destinatário SHALL ser vinculado ao participante do tenant com o mesmo
documento ou e-mail, ou criado sem conta de acesso. Emitir de novo para o mesmo participante e
curso com a mesma data de conclusão SHALL devolver o certificado existente em vez de duplicar. O
período impresso SHALL ser a data de conclusão e a carga horária a do curso. Linhas inválidas do
CSV SHALL ser recusadas individualmente, informando linha e motivo, sem impedir as demais.

#### Scenario: Emissão avulsa de lista
- **WHEN** o Administrador importa um CSV com 3 pessoas válidas e 1 linha sem nome para um curso com modelo padrão do tenant
- **THEN** 3 certificados avulsos são emitidos e a resposta informa a linha recusada e o motivo

#### Scenario: Emissão repetida
- **WHEN** o Administrador emite de novo para a mesma pessoa, curso e data de conclusão
- **THEN** o sistema devolve o certificado já emitido, sem criar outro

#### Scenario: Certificado para empresa
- **WHEN** o Administrador emite um certificado avulso com a razão social como nome e o CNPJ como documento
- **THEN** o certificado é emitido em nome da empresa e a validação pública mostra apenas os dados mínimos

#### Scenario: Curso de outro órgão
- **WHEN** o Administrador tenta emitir certificados avulsos para um curso de outro tenant
- **THEN** o sistema responde como se o curso não existisse

### Requirement: Bibliotecas de fundos e de textos do certificado
O Administrador SHALL poder cadastrar fundos de certificado reutilizáveis (nome, descrição, status
ativo/inativo e arquivo PNG, JPEG ou PDF; PDF convertido em imagem no navegador; orientação deduzida
da proporção da imagem) e modelos de texto reutilizáveis (nome, tipo de certificado, texto principal
com campos dinâmicos, texto complementar opcional e observações internas). Fundo ou texto usado por
algum leiaute SHALL não poder ser excluído, só desativado. Item inativo SHALL continuar valendo onde
já está, mas não SHALL ser oferecido para novos leiautes.

#### Scenario: Excluir fundo em uso
- **WHEN** o Administrador tenta excluir um fundo usado no leiaute de algum curso
- **THEN** o sistema recusa e sugere desativá-lo

#### Scenario: Campo dinâmico desconhecido no texto
- **WHEN** o Administrador salva um texto principal com `{{cpf_do_pai}}`
- **THEN** o sistema recusa e lista as variáveis aceitas

### Requirement: Variáveis do texto no formato do sistema de referência
Os textos do certificado (biblioteca de textos, corpo do modelo e texto livre do construtor) SHALL
oferecer as variáveis `{NOME}`, `{CPF}`, `{EMPRESA}`, `{CNPJ}`, `{CURSO}`, `{CARGA_HORARIA}`,
`{DATA}`, `{DATA_CONCLUSAO}`, `{CODIGO_CERTIFICADO}`, `{RESPONSAVEL}` e `{CONTEUDO_PROGRAMATICO}`,
inseridas com um clique na posição do cursor. Na emissão cada variável SHALL ser trocada pelo valor
do participante, da empresa dele, do curso e do órgão; `{EMPRESA}` SHALL imprimir "Autônomo" quando
o participante não tem empresa e `{CARGA_HORARIA}` SHALL imprimir só o número de horas. Os campos no
formato antigo (`{{participante}}`…) SHALL continuar valendo nos textos já gravados. Variável
desconhecida SHALL ser recusada ao salvar.

#### Scenario: Texto com as variáveis do sistema de referência
- **WHEN** um certificado é emitido com o texto "Certificamos que {NOME}, portador(a) do CPF {CPF}, participou do {CURSO} no dia {DATA_CONCLUSAO} com carga horária de {CARGA_HORARIA} horas."
- **THEN** o certificado sai com o nome, o CPF mascarado (000.000.000-00), o curso, a data de conclusão e o número de horas do participante

#### Scenario: Texto antigo continua valendo
- **WHEN** um modelo gravado antes da mudança usa `{{participante}}` e `{{carga_horaria}}`
- **THEN** os certificados continuam saindo com o nome e a carga horária, como antes

#### Scenario: Variável desconhecida
- **WHEN** o Administrador salva um texto com `{RG_DO_ALUNO}`
- **THEN** o sistema recusa e lista as variáveis aceitas

### Requirement: Biblioteca de empresas do órgão
O Administrador SHALL poder cadastrar empresas (razão social, nome fantasia, CNPJ, e-mail, telefone,
responsável, observações e status). O CNPJ SHALL ter dígitos verificadores válidos e ser único no
órgão. Na emissão avulsa, cada pessoa SHALL poder ser ligada a uma empresa da biblioteca (no
formulário ou pela coluna `EMPRESA_CNPJ` do CSV); a empresa passa a ser a do participante e alimenta
`{EMPRESA}` e `{CNPJ}`. Empresa com participante ligado SHALL não poder ser excluída, só desativada.

#### Scenario: CSV com empresa não cadastrada
- **WHEN** uma linha do CSV informa em `EMPRESA_CNPJ` um CNPJ que não está na biblioteca
- **THEN** a linha é recusada com o motivo e as demais são emitidas

#### Scenario: Empresa de outro órgão
- **WHEN** o Administrador tenta alterar uma empresa de outro tenant
- **THEN** o sistema responde como inexistente

### Requirement: Construtor visual por curso
O painel SHALL oferecer um construtor por curso no formato do sistema de referência: o Administrador
escolhe o curso alvo, o fundo e o modelo de texto; marca as assinaturas da biblioteca que entram no
certificado; e marca os elementos opcionais avulsos (tipo de certificado, nome do participante, nome
do curso, data de emissão e texto complementar). O texto principal, o QR code e o código de
autenticidade SHALL estar sempre presentes. Cada elemento marcado aparece na página na hora e SHALL
poder ser posicionado livremente e configurado (tamanho da fonte, cor, alinhamento e largura da
caixa). Salvar SHALL gravar o leiaute como o modelo visual do curso e vinculá-lo ao curso; o PDF
SHALL poder ser pré-visualizado sem emitir certificado. Na emissão, o texto e o fundo usados SHALL
ser os da versão atual do modelo de texto e do fundo escolhidos, copiados para o snapshot.

#### Scenario: Montar e salvar o leiaute do curso
- **WHEN** o Administrador escolhe curso, fundo e texto, marca uma assinatura e "Nome do participante", posiciona os elementos e salva
- **THEN** o curso passa a emitir certificados com esse leiaute, esse fundo, esse texto e essa assinatura

#### Scenario: Texto corrigido na biblioteca
- **WHEN** o texto principal de um modelo de texto é corrigido depois de salvo o leiaute
- **THEN** os próximos certificados do curso saem com o texto corrigido e os já emitidos não mudam

#### Scenario: Fundo de outro órgão
- **WHEN** a requisição de salvar o leiaute informa um fundo de outro tenant
- **THEN** o sistema recusa como inexistente
