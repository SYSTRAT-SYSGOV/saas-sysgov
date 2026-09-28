# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
