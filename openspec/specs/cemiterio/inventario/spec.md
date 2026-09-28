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
O sistema SHALL disponibilizar um painel expansível de filtros avançados que permita refinar a listagem de unidades de sepultamento por múltiplos eixos complementares:
1. **Localização e Estrutura**: Cemitério/Parque, Setor/Quadra (com opções restritas ao cemitério ativo quando aplicável) e busca textual rápida por código do jazigo ou identificador do concessionário.
2. **Tipologia e Estado Físico**: Tipo de Unidade (Jazigo, Gaveta, Ossuário/Nicho, Cova Pública), Estado Operacional (Disponível, Concedido, Ocupado, Capacidade Máxima, Em Manutenção/Ruína) e Faixa de Ocupação (Vazio 0%, Parcial, Lotado 100%).
3. **Situação Jurídica da Concessão**: Todas, Com Concessão Vigente, Sem Concessão / Vago, Concessão Vencida e Em Processo de Sucessão Hereditária.
4. **Situação Financeira e Fiscal**: Todas, Adimplente (sem pendências financeiras), Inadimplente (com guias de manutenção anual ou serviços vencidos) e Sem Guias Emitidas.
5. **Georreferenciamento e SIG**: Todos, Georreferenciados (com coordenadas GPS) e Sem Coordenadas Cartográficas.
6. **Critérios Regulatórios e Sanitários**: Elegível para Exumação e Em Notificação de Abandono.

O painel DEVE exibir contador visual de filtros ativos em tempo de execução, botão de expansão/recolhimento e ação de limpeza imediata de todos os filtros. Quando em contexto de necrópole ativa, o seletor de Cemitério DEVE ser fixado no cemitério selecionado ou ocultado, e o botão de criação de novos cemitérios DEVE ser suprimido da barra de ações do inventário local.

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

#### Scenario: Aplicação combinada de filtros de concessão e situação financeira
- **WHEN** o gestor cemiterial seleciona o filtro de concessão "Com Concessão Vigente" combinado com o filtro financeiro "Inadimplente"
- **THEN** a listagem de inventário apresenta unicamente os jazigos concedidos cujos titulares possuem guias DAM ou taxas anuais em atraso
- **THEN** o contador de filtros ativos reflete a quantidade exata de critérios aplicados (ex: "2 filtros ativos")

#### Scenario: Filtro por jazigos sem coordenadas para vistoria de campo
- **WHEN** o operador seleciona o filtro de georreferenciamento "Sem Coordenadas"
- **THEN** a tabela exibe apenas as unidades que ainda não foram vetorizadas ou georreferenciadas no mapa GIS

---

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
O sistema SHALL substituir a antiga cortina lateral retrátil por um Modal Integrado de Detalhes da Unidade de Sepultamento (`ModalDetalheJazigo`) de grande porte (`size="2xl"`, `max-w-5xl` ou `max-w-6xl`), estruturado ergonomicamente em sub-abas temáticas e navegáveis para visualização integral de todas as dimensões do túmulo:
1. **Sub-aba Visão Geral & Físico**: Dimensões métricas (comprimento, largura, área calculada em m²), coordenadas georreferenciadas (latitude e longitude em tipografia `JetBrains Mono`), capacidade total e ocupação com barra de progresso percentual, estado operacional com chips semânticos, atalho de navegação cruzada para o mapa cartográfico GIS e ações de transição de estado (interdição por ruína/manutenção com justificativa formal).
2. **Sub-aba Concessão & Titulares**: Dados do termo ou título de concessão vigente (número, modalidade perpétua ou temporária, data de início e vencimento), dados do concessionário titular com CPF/CNPJ mascarado, contatos, endereço, flag de titular falecido, processo administrativo vinculado e histórico de processos de sucessão hereditária.
3. **Sub-aba Sepultados & Inumações**: Relação detalhada de todos os falecidos inumados nas gavetas/carneiras da sepultura, com indicação de gaveta, data de óbito, data de sepultamento, número da certidão de óbito, termo, livro, folha e cartório de registro civil, além de alertas de prazos sanitários para exumação.
4. **Sub-aba Financeiro & Arrecadação**: Extrato completo de cobranças e guias de recolhimento vinculadas ao jazigo ou sua concessão, situação consolidada de adimplência, valores em centavos (`R$`) em `JetBrains Mono`, datas de vencimento, status da guia e ações de download de PDF ou 2ª via.
5. **Sub-aba Vistorias & Obras**: Galeria cronológica de vistorias técnicas com fotos e notas fiscais, alvarás de obras e reformas executadas por empreiteiros credenciados e histórico de auditoria.

O cabeçalho do modal DEVE disponibilizar botões de acesso direto para emissão da Ficha Cadastral Ampliada e emissão da Plaqueta de Identificação QR Code.

#### Scenario: Consulta detalhada de jazigo ocupado
- **WHEN** o usuário clica sobre uma linha de jazigo com ocupação registrada
- **THEN** o sistema abre a visualização modal com layout amplo e legível, exibindo a relação de falecidos sepultados, data de sepultamento e histórico de movimentações

#### Scenario: Fechamento imediato da cortina lateral
- **WHEN** o usuário clica no botão "X" do cabeçalho ou pressiona a tecla Escape
- **THEN** o modal fecha suavemente e o foco retorna à listagem de inventário

#### Scenario: Mudança assistida de estado para manutenção
- **WHEN** o usuário autorizado solicita marcar a unidade como "Em Ruína/Manutenção"
- **THEN** o sistema exige justificativa formal obrigatória, valida o controle de concorrência otimista e registra o evento na trilha de auditoria

#### Scenario: Visualização do modal de detalhes com navegação entre sub-abas
- **WHEN** o usuário clica sobre qualquer jazigo na listagem de inventário ou no mapa interativo
- **THEN** o sistema abre o modal centralizado amplo (`max-w-5xl`) com as 5 sub-abas visíveis
- **THEN** o usuário consegue alternar livremente entre as abas Físico, Concessão, Sepultados, Financeiro e Vistorias sem perda de contexto

#### Scenario: Interdição manual com validação de concorrência no modal
- **WHEN** o usuário autorizado solicita marcar a unidade como "Em Ruína/Manutenção" a partir da sub-aba de visão geral
- **THEN** o sistema abre confirmação com justificativa formal obrigatória, valida a versão de concorrência (`lock_version`) e atualiza o estado imediatamente

#### Scenario: Fechamento imediato do modal de detalhes
- **WHEN** o usuário clica no botão "X", clica no backdrop ou pressiona a tecla Escape
- **THEN** o modal fecha instantaneamente sem acionar requisições residuais

---

### Requirement: Geração e Impressão de Plaqueta de Identificação com QR Code
O sistema SHALL disponibilizar a emissão e impressão de Plaqueta de Identificação com QR Code escaneável para qualquer unidade de sepultamento cadastrada. O QR Code gerado DEVE codificar o identificador único do jazigo e a URL de consulta do portal, permitindo visualização na tela e impressão imediata com dados da necrópole, código do jazigo em tipografia técnica JetBrains Mono (`font-mono`), setor e capacidade física.

#### Scenario: Visualização e impressão da plaqueta QR Code
- **WHEN** o usuário seleciona a ação "Plaqueta QR Code" na listagem ou no Drawer de Detalhes da unidade
- **THEN** o sistema exibe um modal contendo a pré-visualização da plaqueta com o QR Code vetorial renderizado, dados identificadores do jazigo e botão de acionamento para impressão

#### Scenario: Leitura do QR Code e consulta rápida
- **WHEN** o QR Code impresso ou na tela é escaneado por dispositivo móvel
- **THEN** o link direciona para a visualização dos dados cadastrais públicos ou autenticados da unidade de sepultamento

### Requirement: Emissão da Ficha Cadastral Oficial da Unidade de Sepultamento
O sistema SHALL disponibilizar a emissão e visualização em modal da Ficha Cadastral Completa da Unidade de Sepultamento em dimensões ampliadas e ergonômicas (`max-w-5xl` ou `max-w-6xl` no desktop), eliminando a necessidade de barras de rolagem verticais excessivas para visualização na tela. O layout do documento oficial DEVE ser organizado em um grid inteligente de alta densidade visual (multi-colunas), apresentando simultaneamente:
1. **Cabeçalho Oficial Municipal**: Brasão/insígnia, identificação da República Federativa do Brasil, Prefeitura Municipal e Divisão de Necrópoles.
2. **Quadro de Dados Físicos e Espaciais**: Código do jazigo, necrópole, setor/quadra, lote/carneira, tipo construtivo, dimensões, área em m² e coordenadas GPS em `JetBrains Mono`.
3. **Quadro Jurídico da Concessão e Titular**: Termo de outorga, modalidade, vigência, processo administrativo, qualificação do concessionário e documento oficial mascarado.
4. **Quadro de Registro de Ocupantes Sepultados**: Grade compacta com nome completo do falecido, parentesco/gaveta, data de óbito, data de inumação e dados cartorários de certidão de óbito.
5. **Autenticidade e Fé Pública**: Declaração formal de veracidade das informações, QR Code vetorial escaneável para validação de autenticidade documental e chancela de emissão com data e hora.

O documento DEVE preservar as diretrizes CSS de impressão `@media print` para saída fiel em folha A4 oficial.

#### Scenario: Emissão da ficha cadastral a partir do Drawer de Detalhes
- **WHEN** o usuário clica na ação "Ficha Cadastral" no Modal de Detalhes do Jazigo
- **THEN** o sistema abre a visualização da ficha cadastral formatada para impressão contendo todos os dados físicos, jurídicos e ocupacionais consolidados da unidade

#### Scenario: Ficha cadastral para unidade sem concessão ativa
- **WHEN** a ficha cadastral é emitida para um jazigo disponível ou sem concessão ativa
- **THEN** a seção de titularidade indica expressamente a situação de disponibilidade ou cova pública sem omitir os dados físicos e dimensões da sepultura

#### Scenario: Abertura da ficha cadastral em modal ampliado sem rolagem
- **WHEN** o usuário aciona a ação "Ficha Cadastral" a partir do Modal de Detalhes do Jazigo ou da listagem
- **THEN** o sistema renderiza o modal em formato amplo (`max-w-5xl` ou superior)
- **THEN** todas as 5 seções do documento oficial (cabeçalho, dados físicos, concessão, inumados e autenticidade com QR Code) são visíveis na tela de desktop simultaneamente sem barras de rolagem excessivas

#### Scenario: Impressão oficial da ficha cadastral
- **WHEN** o usuário clica no botão "Imprimir Ficha Cadastral"
- **THEN** o sistema aciona a caixa de diálogo de impressão nativa (`window.print()`), formatando o documento rigorosamente para uma folha A4 com fundo branco e tipografia nítida

---

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

### Requirement: Extrato Financeiro e Controle de Arrecadação por Unidade de Sepultamento
O sistema SHALL disponibilizar na sub-aba "Financeiro" do modal de detalhes do jazigo a consolidação de todas as guias de recolhimento e taxas vinculadas à unidade de sepultamento ou à sua concessão correspondente. A interface DEVE apresentar:
1. **Card de Situação de Adimplência**: Indicador com badges semânticos de regularidade fiscal (Adimplente em verde, Pendente/A Vencer em azul, Inadimplente/Vencida em vermelho ou Isento).
2. **Métricas Consolidadas**: Total emitido, Total pago e Total em aberto/vencido com valores expressos em centavos convertidos para Real (`R$`) e formatados obrigatoriamente na tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
3. **Tabela de Guias de Recolhimento**: Relação de carnês/guias DAM contendo número da guia, serviço (taxa anual de conservação/manutenção, taxa de concessão, taxa de inumação, taxa de exumação, reforma/obra), exercício de competência, data de vencimento, data de liquidação, valor e situação cadastral (Emitida, Paga, Vencida, Cancelada).
4. **Ações Documentais**: Ações diretas para download do PDF da Guia de Recolhimento com código de barras/PIX e acionamento de emissão de segunda via para guias vencidas.

#### Scenario: Visualização do extrato financeiro de jazigo adimplente
- **WHEN** o usuário seleciona a sub-aba "Financeiro" de um jazigo cujas taxas anuais estão quitadas
- **THEN** o sistema exibe o badge "Adimplente", o saldo devedor zerado em `JetBrains Mono` e a lista das guias pagas com as respectivas datas de baixa

#### Scenario: Visualização e segunda via de taxa anual vencida
- **WHEN** o jazigo possui guia de taxa de manutenção anual com data de vencimento anterior à data corrente e situação "emitida"
- **THEN** o sistema exibe o status "Inadimplente", destaca a guia vencida em vermelho e disponibiliza a ação para geração de 2ª via atualizada

### Requirement: Exibição de Processo Administrativo e Sucessão no Drawer de Detalhes
O sistema SHALL exibir no Drawer lateral de detalhes do jazigo e na Ficha Cadastral o número do Processo Administrativo Municipal vinculado à concessão ou túmulo, bem como o indicador explícito de "Titular Falecido - Sucessão Hereditária Pendente" com alerta visual em destaque quando o titular concessionário tiver registro de óbito sem regularização sucessória concluída.

#### Scenario: Visualização de jazigo com processo administrativo e titular falecido
- **WHEN** o usuário abre a cortina lateral de detalhes de um jazigo cujo titular está registrado como falecido
- **THEN** o painel exibe o número do Processo Administrativo em tipografia técnica `font-mono tabular-nums`
- **THEN** o painel renderiza em destaque um badge de alerta indicando que o titular é falecido e que a concessão está com sucessão hereditária pendente

#### Scenario: Visualização de detalhes de inumação com gaveta e equipe operacional
- **WHEN** o usuário consulta a lista de ocupantes sepultados no Drawer de Detalhes do Jazigo
- **THEN** cada registro de sepultamento apresenta a identificação da Gaveta/Nicho ocupada (ex: "Gaveta 1"), o nome do Coveiro e o nome do Pedreiro/Empreiteiro responsável pelo ato fúnebre quando registrados
