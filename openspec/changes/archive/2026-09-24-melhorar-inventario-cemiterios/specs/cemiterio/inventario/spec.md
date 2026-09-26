# Spec Delta: cemiterio/inventario

## MODIFIED Requirements

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

## ADDED Requirements

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
