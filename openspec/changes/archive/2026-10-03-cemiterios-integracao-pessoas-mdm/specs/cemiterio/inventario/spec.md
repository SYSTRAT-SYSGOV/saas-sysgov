# Delta de Especificação: cemiterio/inventario

## ADDED Requirements

### Requirement: Acesso ao Cadastro Central de Pessoas na Aba Concessão e Titulares
O sistema SHALL disponibilizar na aba "Concessão & Titulares" do modal de detalhes do jazigo (`ModalDetalheJazigo`) ações de acesso direto à ficha cadastral centralizada do titular concessionário no módulo de Pessoas (`PessoaDetailView`). Para operadores com privilégios de administração, a visualização completa de dados civis e desmascaramento auditado de CPF DEVE ser respeitada conforme as diretrizes do Hub MDM.

#### Scenario: Visualização do titular concessionário com atalho para o cadastro mestre
- **GIVEN** que o operador está visualizando a aba "Concessão & Titulares" de um jazigo concedido
- **WHEN** clica no nome do titular, no badge de identificação ou no botão "Ver Cadastro Central"
- **THEN** o sistema abre a visualização detalhada do cadastro de pessoa (`PessoaDetailView`) sem descontinuar o modal do jazigo, apresentando seus dados civis, documentos, vínculos e contatos consolidados

#### Scenario: Titular sem vínculo prévio com pessoa física central
- **GIVEN** que a concessão possui titular registrado apenas no formato legado sem `pessoa_id`
- **WHEN** o operador abre a aba "Concessão & Titulares"
- **THEN** o sistema exibe os dados do titular e oferece uma ação explícita para "Vincular a Pessoa no Cadastro Central"

### Requirement: Edição do Titular Concessionário Integrada com Seletor MDM
O sistema SHALL permitir aos operadores autorizados editar os dados do titular concessionário utilizando o componente universal `PessoaPicker` de `@sysgov/ui`, possibilitando selecionar uma pessoa já cadastrada na base mestre com busca reativa e cache, ou criar uma nova pessoa física inline via modal de cadastro rápido sem perda do estado da tela.

#### Scenario: Substituição ou vínculo de titular por pessoa existente
- **GIVEN** que o operador abre o modal "Editar Titular" a partir da aba "Concessão & Titulares"
- **WHEN** pesquisa por nome ou CPF no `PessoaPicker` e seleciona uma pessoa física existente
- **THEN** o sistema preenche automaticamente os dados cadastrais, endereço e contatos a partir do MDM e associa o `pessoa_id` ao concessionário

#### Scenario: Cadastro rápido inline de novo titular durante a edição
- **GIVEN** que o titular desejado não consta na base central de pessoas
- **WHEN** o operador clica em "Nova Pessoa" no seletor integrado
- **THEN** o sistema abre o assistente de cadastro rápido (`PessoaFormModal`), valida o CPF e registra a nova pessoa física no módulo de Pessoas, retornando-a imediatamente selecionada para o formulário de titular

### Requirement: Criação de Nova Concessão e Outorga de Jazigo com Titular do MDM
O sistema SHALL disponibilizar na aba "Concessão & Titulares" de unidades de sepultamento sem concessão ativa uma ação de "Nova Concessão / Vincular Titular", permitindo outorgar formalmente o título com preenchimento obrigatório do titular concessionário através do `PessoaPicker`.

#### Scenario: Outorga de concessão a partir do modal do jazigo
- **GIVEN** que um jazigo encontra-se disponível ou sem concessão associada
- **WHEN** o operador aciona a criação de concessão informando modalidade, número de termo, vigência e seleciona o titular via `PessoaPicker`
- **THEN** o sistema grava o termo de concessão associando o concessionário com seu `pessoa_id` correspondente e atualiza imediatamente a aba de titulares do jazigo
