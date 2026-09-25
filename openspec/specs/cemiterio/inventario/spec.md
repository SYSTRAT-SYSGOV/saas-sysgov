# cemiterio/inventario Specification

## Purpose
Gerencia o inventário físico completo dos cemitérios municipais com visualização analítica via KPIs padronizados no modelo CAPD, filtragem multidimensional avançada e controle de unidades de sepultamento em DataTable de alta performance.

## Requirements

### Requirement: Painel de Indicadores Operacionais do Inventário (KPIs)
O sistema SHALL exibir no topo da aba de inventário um conjunto de cartões de indicadores (KPIs) com métricas consolidadas em tempo real: Total de Unidades Cadastradas, Vagas Disponíveis, Unidades Concedidas, Unidades Ocupadas ou em Capacidade Máxima, Unidades em Ruína/Manutenção e Taxa de Ocupação Global em percentual (`%`). Os valores numéricos e percentuais DEVEM utilizar obrigatoriamente tipografia técnica em JetBrains Mono (`tabular-nums font-mono`). Quando uma necrópole estiver selecionada no contexto do módulo, os indicadores DEVEM (SHALL) refletir estritamente as unidades e jazigos daquele cemitério, vedada a exibição de dados agregados de outros cemitérios do município.

#### Scenario: Carga inicial de indicadores globais do município
- **WHEN** o usuário acessa a aba de inventário sem selecionar um cemitério específico
- **THEN** o sistema exibe os cartões com os totais consolidados de todos os cemitérios ativos do tenant

#### Scenario: Carga de indicadores da necrópole ativa
- **WHEN** o usuário acessa a aba de inventário com um cemitério específico selecionado
- **THEN** o sistema exibe os cartões de KPIs calculados única e exclusivamente a partir dos jazigos e unidades da necrópole ativa
- **THEN** a soma de unidades, disponíveis, ocupadas e em ruína corresponde com exatidão ao total cadastrado para a necrópole selecionada

#### Scenario: Filtragem contextual de indicadores por cemitério
- **WHEN** o usuário seleciona um cemitério específico no filtro
- **THEN** os cartões de indicadores recalculam imediatamente para refletir exclusivamente as métricas do cemitério selecionado

---

### Requirement: Painel de Filtros Avançados Multidimensionais
O sistema SHALL disponibilizar um painel de filtros avançados que permita refinar a listagem de unidades por: Cemitério/Parque, Setor/Quadra (com opções restritas ao cemitério ativo), Tipo de Unidade (Jazigo, Gaveta, Ossuário/Nicho, Cova Pública), Estado Operacional (Disponível, Concedido, Ocupado, Capacidade Máxima, Manutenção) e Faixa de Ocupação (Vazio 0%, Parcial, Lotado 100%), além de busca textual rápida por código ou identificador de concessão. Quando em contexto de necrópole ativa, o seletor de Cemitério DEVE (SHALL) ser fixado no cemitério selecionado ou ocultado, e o botão de criação de novos cemitérios DEVE (SHALL) ser suprimido da barra de ações do inventário local.

#### Scenario: Ocultação de ações globais no inventário local
- **WHEN** o usuário visualiza o inventário de um cemitério específico
- **THEN** o botão "+ Novo Cemitério" permanece oculto da barra de ações do inventário local
- **THEN** estão visíveis apenas ações pertinentes ao cemitério: "+ Novo Setor/Quadra", "+ Novo Jazigo" e "Importar Planilha (CSV)"

#### Scenario: Filtro em cascata de setores por cemitério
- **WHEN** o usuário seleciona o Cemitério "A"
- **THEN** o seletor de Setor/Quadra passa a listar unicamente os setores pertencentes ao Cemitério "A" e reseta qualquer setor incompatível

#### Scenario: Limpeza e restauração de filtros
- **WHEN** o usuário clica na ação de "Limpar Filtros"
- **THEN** todos os filtros retornam ao estado padrão e a listagem exibe todas as unidades autorizadas

### Requirement: DataTable de Unidades de Sepultamento com Exportação
O sistema SHALL renderizar a lista de unidades utilizando o componente padrão `DataTable`, com ordenação dinâmica em todas as colunas relevantes (Código, Tipo, Setor, Ocupação, Estado), paginação fixa em 10 itens por página (`pageSize: 10`) e suporte nativo à exportação de dados nos formatos CSV, XLSX e PDF com preservação de metadados técnicos.

#### Scenario: Paginação fixa em 10 itens por página
- **WHEN** o usuário acessa a aba de inventário ou navega entre as páginas da listagem
- **THEN** a tabela exibe no máximo 10 registros por página, sem seletores alternativos de tamanho que alterem essa densidade padrão

#### Scenario: Ordenação por ocupação e código
- **WHEN** o usuário clica no cabeçalho da coluna "Ocupação" ou "Código"
- **THEN** o sistema reordena as linhas de forma crescente ou decrescente com base nos valores brutos numéricos e alfanuméricos

#### Scenario: Exportação dos dados filtrados
- **WHEN** o usuário aciona a exportação de dados com filtros ativos
- **THEN** o arquivo gerado (CSV, XLSX ou PDF) contém exatamente o conjunto de registros filtrados com cabeçalhos padronizados

### Requirement: Painel Lateral de Detalhes da Unidade (Drawer)
O sistema SHALL exibir, ao clicar em uma unidade da tabela, um painel lateral retrátil (Drawer) de largura ampliada e ergonômica (`sm:max-w-lg`) contendo as informações completas da unidade: dimensões físicas, capacidade máxima, ocupação atual com indicador visual de preenchimento, dados da concessão vinculada (se houver), lista de ocupantes inumados, linha do tempo histórica de eventos e suporte a fechamento imediato via botão "X", tecla Escape ou backdrop.

#### Scenario: Consulta detalhada de jazigo ocupado
- **WHEN** o usuário clica sobre uma linha de jazigo com ocupação registrada
- **THEN** o sistema abre a cortina lateral com layout amplo e legível, exibindo a relação de falecidos sepultados, data de sepultamento e histórico de movimentações

#### Scenario: Fechamento imediato da cortina lateral
- **WHEN** o usuário clica no botão "X" do cabeçalho da cortina lateral ou pressiona a tecla Escape
- **THEN** o Drawer fecha suavemente e o foco retorna à listagem de inventário

#### Scenario: Mudança assistida de estado para manutenção
- **WHEN** o usuário autorizado solicita marcar a unidade como "Em Ruína/Manutenção"
- **THEN** o sistema exige justificativa formal obrigatória, valida o controle de concorrência otimista e registra o evento na trilha de auditoria

### Requirement: Geração e Impressão de Plaqueta de Identificação com QR Code
O sistema SHALL disponibilizar a emissão e impressão de Plaqueta de Identificação com QR Code escaneável para qualquer unidade de sepultamento cadastrada. O QR Code gerado DEVE codificar o identificador único do jazigo e a URL de consulta do portal, permitindo visualização na tela e impressão imediata com dados da necrópole, código do jazigo em tipografia técnica JetBrains Mono (`font-mono`), setor e capacidade física.

#### Scenario: Visualização e impressão da plaqueta QR Code
- **WHEN** o usuário seleciona a ação "Plaqueta QR Code" na listagem ou no Drawer de Detalhes da unidade
- **THEN** o sistema exibe um modal contendo a pré-visualização da plaqueta com o QR Code vetorial renderizado, dados identificadores do jazigo e botão de acionamento para impressão

#### Scenario: Leitura do QR Code e consulta rápida
- **WHEN** o QR Code impresso ou na tela é escaneado por dispositivo móvel
- **THEN** o link direciona para a visualização dos dados cadastrais públicos ou autenticados da unidade de sepultamento

### Requirement: Emissão da Ficha Cadastral Oficial da Unidade de Sepultamento
O sistema SHALL permitir a geração e visualização em modal/impressão da Ficha Cadastral Completa da Unidade de Sepultamento (formato A4 para fé pública). A ficha DEVE apresentar de forma organizada o cabeçalho municipal oficial, dados técnicos e físicos (código, tipo, dimensões, georreferenciamento), situação da concessão ativa com nome do titular e vigência, listagem completa de inumações com data e número de ordem de serviço, e QR Code de autenticidade documental.

#### Scenario: Emissão da ficha cadastral a partir do Drawer de Detalhes
- **WHEN** o usuário clica na ação "Ficha Cadastral" no Drawer de Detalhes do Jazigo
- **THEN** o sistema abre a visualização da ficha cadastral formatada para impressão contendo todos os dados físicos, jurídicos e ocupacionais consolidados da unidade

#### Scenario: Ficha cadastral para unidade sem concessão ativa
- **WHEN** a ficha cadastral é emitida para um jazigo disponível ou sem concessão ativa
- **THEN** a seção de titularidade indica expressamente a situação de disponibilidade ou cova pública sem omitir os dados físicos e dimensões da sepultura

### Requirement: Seleção Múltipla e Operações Coletivas em Lote (Bulk Actions)
O sistema SHALL permitir ao usuário selecionar individualmente ou coletivamente unidades de sepultamento na listagem tabular (`DataTable`) através de caixas de seleção (checkboxes). Ao haver ao menos uma unidade selecionada, uma barra de ações flutuante (Bulk Action Bar) DEVE ser exibida na tela, disponibilizando operações em massa: Interdição Coletiva para Ruína/Manutenção, Emissão Coletiva de Plaquetas com QR Code em grade de impressão e Exportação dos itens selecionados.

#### Scenario: Seleção em massa e exibição da barra de ações
- **WHEN** o usuário seleciona múltiplos jazigos na tabela através dos checkboxes
- **THEN** a barra de ações em lote é exibida exibindo o total de registros selecionados e os botões de ação coletiva

#### Scenario: Interdição em lote com justificativa obrigatória
- **WHEN** o usuário aciona a ação de interdição coletiva para as unidades selecionadas
- **THEN** o sistema abre modal exigindo justificativa técnica formal e aplica a transição de estado registrando a auditoria individualmente por unidade

#### Scenario: Emissão de plaquetas QR Code em lote
- **WHEN** o usuário solicita imprimir plaquetas para os jazigos selecionados
- **THEN** o sistema renderiza uma folha com as plaquetas organizadas em grade com seus respectivos códigos e QR Codes para impressão conjunta

### Requirement: Assistente de Importação em Massa de Unidades de Sepultamento
O sistema SHALL disponibilizar um assistente de importação assistida de unidades de sepultamento a partir de arquivos CSV/planilhas. O assistente DEVE disponibilizar modelo padrão para download, processar o arquivo enviado, validar em memória a integridade das linhas (código único, setor existente, capacidade numérica, dimensões válidas) e exibir pré-visualização categorizada (válidos e com erros) antes da confirmação de gravação.

#### Scenario: Validação prévia de inconsistências na importação
- **WHEN** o usuário envia um arquivo CSV contendo linhas com códigos duplicados ou setores inexistentes
- **THEN** o assistente sinaliza visualmente cada linha com inconsistência e impede a importação de registros inválidos

#### Scenario: Gravação bem-sucedida de novas unidades
- **WHEN** o usuário confirma a importação de um conjunto de unidades válidas
- **THEN** o sistema cadastra sequencialmente os novos jazigos e atualiza imediatamente o inventário e os indicadores de KPIs

### Requirement: Histórico de Vistorias e Laudos Técnicos no Drawer da Unidade
O sistema SHALL exibir no Drawer de Detalhes da Unidade de Sepultamento (`DetalheJazigo`) uma seção dedicada ao histórico de vistorias técnicas de conservação. A seção DEVE apresentar a data de cada inspeção em tipografia `JetBrains Mono` (`font-mono tabular-nums`), classificação do estado de conservação (Ótimo, Bom, Regular, Ruim, Crítico), nível de risco associado (Baixo, Médio, Alto) com badges semânticos de severidade fiscal, parecer técnico descritivo e galeria de fotos anexadas.

#### Scenario: Visualização de vistorias com laudo e fotos
- **WHEN** o usuário abre o Drawer de um jazigo que possui vistorias cadastradas
- **THEN** o sistema exibe os cartões cronológicos das vistorias com notas do fiscal e miniaturas clicáveis das fotografias

#### Scenario: Ausência de vistorias cadastradas
- **WHEN** o jazigo inspecionado não possui nenhuma vistoria registrada
- **THEN** o sistema exibe estado vazio indicando a ausência de vistorias com botão de atalho para registrar a primeira inspeção

### Requirement: Registro Ágil de Vistoria a partir do Inventário
O sistema SHALL permitir aos usuários autorizados registrar uma nova vistoria técnica diretamente a partir do Drawer do jazigo. O formulário DEVE coletar obrigatoriamente data da vistoria, estado de conservação, classificação de risco, observações técnicas e suporte a anexar fotografias, gravando o evento no histórico e atualizando a interface em tempo real.

#### Scenario: Registro bem-sucedido de nova vistoria
- **WHEN** o fiscal preenche os dados da vistoria e confirma o formulário
- **THEN** o sistema envia os dados para a API, anexa as fotos, atualiza a lista de vistorias no Drawer e recalcula o histórico da unidade

### Requirement: Alertas e Indicadores de Inteligência Regulológica
O sistema SHALL computar e exibir indicadores e alertas visuais de inteligência regulológica para cada unidade de sepultamento, contemplando:
1. **Concessão Vencida ou a Vencer**: Alerta amarelo quando a concessão temporária expirar em menos de 60 dias e alerta vermelho quando já estiver expirada sem renovação formal.
2. **Elegibilidade para Exumação**: Alerta verde/azul sanitário quando uma inumação cumprir o interstício legal mínimo (3 anos para adultos, 2 anos para crianças) desde a data do óbito/sepultamento, sinalizando aos gestores que os despojos estão legalmente aptos para translado ao ossuário geral ou gaveta ossária familiar.
3. **Sinalização de Ruína e Abandono**: Alerta para jazigos classificados com estado de conservação Crítico ou com edital de abandono aberto.

Os prazos, dias decorridos e datas limite DEVEM ser expressos em tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).

#### Scenario: Jazigo com concessão temporária a expirar em menos de 60 dias
- **WHEN** o usuário visualiza a lista ou o Drawer de um jazigo cuja concessão temporária vence nos próximos 60 dias
- **THEN** o sistema exibe badge semântico de atenção indicando o vencimento iminente e a quantidade exata de dias restantes em JetBrains Mono

#### Scenario: Inumação que atingiu o prazo legal mínimo para exumação
- **WHEN** o jazigo possui inumação com data de sepultamento superior ao interstício sanitário municipal (ex: $\ge 3$ anos)
- **THEN** o sistema exibe o indicador visual "Elegível para Exumação" tanto na tabela quanto no painel de detalhes do jazigo

### Requirement: Filtragem Rápida por Critérios Regulatórios no Inventário
O sistema SHALL disponibilizar no painel de filtros avançados opções de segmentação rápida por critérios regulatórios:
- **Todos os status regulatórios** (padrão)
- **Elegível para Exumação**
- **Concessão a Vencer (< 60 dias)**
- **Concessão Vencida**
- **Em Processo de Notificação / Abandono**

#### Scenario: Filtro de jazigos elegíveis para exumação
- **WHEN** o gestor cemiterial seleciona o filtro "Elegível para Exumação"
- **THEN** a tabela exibe unicamente as sepulturas que possuem ocupantes com tempo de inumação igual ou superior ao prazo regulamentar, auxiliando o planejamento de abertura de novas vagas

#### Scenario: Filtro de concessões a vencer para notificação
- **WHEN** a administração cemiterial seleciona o filtro "Concessão a Vencer"
- **THEN** a tabela exibe unicamente os jazigos cujos contratos expiram em até 60 dias, permitindo gerar lista para contato e emissão de avisos

### Requirement: Navegação Cruzada Direta para o Mapa Cartográfico GIS
O sistema SHALL disponibilizar ação de navegação cruzada "Ver no Mapa" tanto nas linhas do DataTable de unidades de sepultamento quanto no painel lateral de detalhes (Drawer). Ao ser acionada, a aplicação DEVE alternar para a aba do mapa GIS, centralizar e aproximar a câmera (zoom com animação fluida) nos limites espaciais da unidade de sepultamento selecionada e abrir seu painel de detalhes sobreposto ao mapa.

#### Scenario: Acionamento da ação "Ver no Mapa" a partir da tabela do inventário
- **WHEN** o usuário clica no botão "Ver no Mapa" em uma linha da tabela de jazigos
- **THEN** o sistema comuta imediatamente para a aba "Mapa", realiza a animação de aproximação (`flyToBounds`) no envelope ou coordenadas da unidade e mantém o jazigo selecionado

#### Scenario: Visualização do status de georreferenciamento no Drawer
- **WHEN** o Drawer de detalhes do jazigo é exibido
- **THEN** o sistema apresenta a situação cartográfica da unidade (Georreferenciada com latitude e longitude em `JetBrains Mono` ou Pendente de Desenho Cartográfico) e botão de atalho para direcionar ao mapa

### Requirement: Ações Autônomas de Criação de Setor e Jazigo
O sistema SHALL disponibilizar os botões de ação "+ Novo Setor/Quadra" e "+ Novo Jazigo" permanentemente habilitados para operadores autorizados (`cemiterios.inventario.manage`), sem exigir que um filtro prévio de cemitério esteja ativo. Quando acionados sem cemitério selecionado, os formulários modais DEVEM permitir a seleção dinâmica do Cemitério e, para o cadastro de Jazigo, a seleção do Setor/Quadra correspondente.

#### Scenario: Abertura de Novo Setor com cemitério ativo no filtro
- **WHEN** o usuário possui um cemitério selecionado no filtro e clica em "+ Novo Setor/Quadra"
- **THEN** o modal abre com o cemitério ativo pré-vinculado, solicitando apenas o código da quadra, o tipo de zona e a descrição

#### Scenario: Abertura de Novo Setor em visão geral sem filtro de cemitério
- **WHEN** o usuário está na visão geral integrada de cemitérios e clica em "+ Novo Setor/Quadra"
- **THEN** o modal abre habilitado, apresentando campo obrigatório de seleção do Cemitério de destino junto aos demais dados do setor

#### Scenario: Cadastro de Novo Jazigo com seleção dinâmica de setor
- **WHEN** o usuário clica em "+ Novo Jazigo" a partir da barra de ações
- **THEN** o modal abre habilitado, exibindo a lista de setores disponíveis organizados com identificação do cemitério correspondente, permitindo o cadastro imediato da unidade

### Requirement: Controle Confiável e Padronizado de Fechamento de Modais
O sistema SHALL assegurar que todos os modais e caixas de diálogo da visão de inventário (`ModalQrCodeJazigo`, `ModalFichaCadastral`, `ModalNovaVistoriaJazigo`, `ModalImportadorJazigos`, `ModalAcaoLoteManutencao`, `ModalImpressaoLoteQr`, `ModalFotoVistoria` e `FormModal`) respondam e fechem imediata e confiavelmente ao acionar o botão de fechar "X", ao pressionar a tecla Escape ou ao clicar no overlay externo, sem ocorrência de exceções em tempo de execução e mantendo o estado da aplicação íntegro.

#### Scenario: Fechamento de modal via clique no botão "X"
- **WHEN** o usuário clica no botão "X" localizado no canto superior direito de qualquer modal do inventário
- **THEN** o modal é fechado instantaneamente e o backdrop é removido sem erros de console

#### Scenario: Fechamento de modal via teclado Escape
- **WHEN** o usuário pressiona a tecla Escape com um modal aberto
- **THEN** o sistema aciona a rotina de fechamento do modal e restaura o foco da interface
