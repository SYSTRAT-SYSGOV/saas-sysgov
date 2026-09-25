# Spec Delta: cemiterio/inventario

## ADDED Requirements

### Requirement: Exibição de Processo Administrativo e Sucessão no Drawer de Detalhes
O sistema SHALL exibir no Drawer lateral de detalhes do jazigo e na Ficha Cadastral o número do Processo Administrativo Municipal vinculado à concessão ou túmulo, bem como o indicador explícito de "Titular Falecido - Sucessão Hereditária Pendente" com alerta visual em destaque quando o titular concessionário tiver registro de óbito sem regularização sucessória concluída.

#### Scenario: Visualização de jazigo com processo administrativo e titular falecido
- **WHEN** o usuário abre a cortina lateral de detalhes de um jazigo cujo titular está registrado como falecido
- **THEN** o painel exibe o número do Processo Administrativo em tipografia técnica `font-mono tabular-nums`
- **THEN** o painel renderiza em destaque um badge de alerta indicando que o titular é falecido e que a concessão está com sucessão hereditária pendente

#### Scenario: Visualização de detalhes de inumação com gaveta e equipe operacional
- **WHEN** o usuário consulta a lista de ocupantes sepultados no Drawer de Detalhes do Jazigo
- **THEN** cada registro de sepultamento apresenta a identificação da Gaveta/Nicho ocupada (ex: "Gaveta 1"), o nome do Coveiro e o nome do Pedreiro/Empreiteiro responsável pelo ato fúnebre quando registrados
