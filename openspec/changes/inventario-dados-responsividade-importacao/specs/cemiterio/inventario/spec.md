# Spec Delta: cemiterio/inventario

## MODIFIED Requirements

### Requirement: DataTable de Unidades de Sepultamento com Exportação
O sistema SHALL renderizar a lista de unidades utilizando o componente padrão `DataTable`, com ordenação dinâmica em todas as colunas relevantes, paginação fixa em 10 itens por página (`pageSize: 10`), suporte nativo à exportação de dados nos formatos CSV, XLSX e PDF com preservação de metadados técnicos, e dimensionamento compacto responsivo que elimine a barra de rolagem horizontal em resoluções desktop padrão (largura mínima de 1280px).

#### Scenario: Paginação fixa em 10 itens por página
- **WHEN** o usuário acessa a aba de inventário ou navega entre as páginas da listagem
- **THEN** a tabela exibe no máximo 10 registros por página, sem seletores alternativos de tamanho que alterem essa densidade padrão

#### Scenario: Ordenação por ocupação e código
- **WHEN** o usuário clica no cabeçalho da coluna "Ocupação" ou "Código"
- **THEN** o sistema reordena as linhas de forma crescente ou decrescente com base nos valores brutos numéricos e alfanuméricos

#### Scenario: Exportação dos dados filtrados
- **WHEN** o usuário aciona a exportação de dados com filtros ativos
- **THEN** o arquivo gerado (CSV, XLSX ou PDF) contém exatamente o conjunto de registros filtrados com cabeçalhos padronizados

#### Scenario: Visualização responsiva sem rolagem horizontal
- **WHEN** o usuário acessa o inventário físico em tela com largura a partir de 1280px
- **THEN** a tabela ajusta automaticamente a largura de suas colunas e o conteúdo textual sem gerar barra de rolagem horizontal no container

## ADDED Requirements

### Requirement: Responsividade e Layout Compacto sem Rolagem Horizontal no Inventário
O sistema SHALL estruturar as colunas do `DataTable` de inventário de forma ergonômica e compacta para eliminar a ocorrência de barra de rolagem horizontal (`overflow-x`), consolidando colunas de menor densidade ou complementares:
1. **Topografia & Localização**: O código do túmulo em `JetBrains Mono` (`font-mono font-bold text-primary`) DEVE integrar em sua mesma célula a indicação da Quadra/Setor e o código legado do livro em tipografia secundária, eliminando a coluna autônoma redundante de setor.
2. **Tipo & Dimensões**: A tipologia do jazigo (Jazigo, Gaveta, Ossuário, Cova Pública) DEVE integrar as dimensões métricas (`C × L m` e `m²`), exibindo as medidas métricas quando cadastradas ou traço em tipografia técnica mono.
3. **Titular & Concessão Vigente**: Exibir exclusivamente o titular da concessão vigente, sinalizando se é falecido ou se possui cotitulares ativos.
4. **Ocupação & Capacidade**: Apresentar a fração de gavetas (`ocupadas / capacidade`) em `font-mono tabular-nums` acompanhada de barra de progresso visual colorida por criticidade.
5. **Sepultados**: Exibir o falecido mais recente ou indicador de sepultamentos ativos, higienizando qualquer terminologia técnica ou sentinela.
6. **Ações Rápidas**: Disponibilizar botão primário compacto "Ver" com ícone de olho e menu de ações complementares (QR Code, Ficha Cadastral e Localização) ocupando largura máxima de 90px a 110px.

#### Scenario: Renderização das colunas consolidadas
- **WHEN** o usuário visualiza a listagem de inventário
- **THEN** o sistema exibe a topografia com código e quadra integrados, tipo com dimensões agregadas e ações em formato compacto
- **THEN** nenhuma barra de rolagem horizontal é gerada na tabela em viewports padrão desktop

#### Scenario: Acesso rápido às ações da unidade
- **WHEN** o usuário clica no botão "Ver" de uma linha do inventário
- **THEN** o modal integrado de detalhes do túmulo (`ModalDetalheJazigo`) é aberto imediatamente com todos os dados da unidade

### Requirement: Reconciliação e Integridade Visual de Titulares e Inumados
O sistema SHALL assegurar a integridade semântica dos dados exibidos na listagem de inventário:
1. **Concessões Vigentes**: Na coluna de Titular/Concessão, o sistema DEVE priorizar a concessão ativa com situação `vigente`, computando apenas cotitulares da mesma concessão ou outras concessões ativas simultâneas, desconsiderando concessões extintas ou canceladas para contadores como `(+N)`.
2. **Tratamento de Registros de Falecidos Sem Nomeação Cadastral**: Quando o registro de óbito legado contiver termos como `"NAO CONSTA FALECIDO"`, `"SEM NOME"` ou estiver sem nome preenchido, a listagem DEVE exibir o rótulo estilizado em badge neutro *Sem identificação nominal (Registro histórico)*, permitindo a pesquisa e visualização sem poluição visual.
3. **Sincronismo entre Inumações e Estado do Jazigo**: O indicador numérico de gavetas ocupadas DEVE corresponder estritamente à contagem de inumações ativas no jazigo (excluindo despojos exumados ou trasladados), e o badge de estado operacional (`Disponível`, `Concedido`, `Ocupado`, `Capacidade Máxima`) DEVE refletir precisamente essa ocupação física combinada com a existência de concessão vigente.

#### Scenario: Exibição de jazigo com concessão vigente e sem sepultados
- **WHEN** um jazigo possui termo de concessão vigente mas nenhuma inumação ativa registrada
- **THEN** o sistema exibe a ocupação como `0 / N gavetas` com status `Livre`
- **THEN** o estado operacional é apresentado como badge azul `CONCEDIDO`
- **THEN** a coluna de sepultados exibe em itálico neutro `Nenhum sepultado`

#### Scenario: Sanitização visual de falecido legado não identificado
- **WHEN** uma inumação histórica possui o nome de registro preenchido como "NAO CONSTA FALECIDO"
- **THEN** a listagem exibe o texto *Sem identificação nominal (Registro histórico)* em tom atenuado
- **THEN** preserva a data de sepultamento e o acesso completo à ficha cadastral e auditoria
