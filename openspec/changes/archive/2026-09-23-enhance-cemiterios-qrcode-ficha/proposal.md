# Proposal: Identificação Física com QR Code e Ficha Cadastral de Unidades de Sepultamento

## Why

A gestão dos cemitérios municipais exige fiscalização física in loco precisa e atendimento transparente e célere aos munícipes e concessionários. Atualmente, os fiscais de campo e administradores de necrópoles não possuem um mecanismo ágil e padronizado de identificação e validação física dos túmulos e gavetas diretamente na sepultura. A disponibilização de geração de plaquetas com QR Code escaneável e emissão de Ficha Cadastral oficial de sepultura (com dados físicos, titularidade, vigência e sepultados) resolve o gargalo de identificação física, diminui fraudes e inconsistências cadastrais e agiliza a fiscalização.

## What Changes

- Adição de modal e gerador de **Plaqueta de Identificação com QR Code** para a unidade de sepultamento, permitindo impressão em formatos padrão (etiqueta adesiva/patrimonial e plaqueta acrílica/metálica).
- O QR Code gerado codifica o identificador e a URL de consulta direta do jazigo com link público/autenticado.
- Adição de emissão/visualização de **Ficha Cadastral da Unidade de Sepultamento (Ficha de Jazigo)** estruturada em layout para impressão (A4) contendo brasão municipal, identificação do cemitério/quadra, dados físicos e geográficos, concessão vigente, ocupantes inumados e histórico de vistorias.
- Integração de ações na `DataTable` (menu de ações rápidas na linha) e no Drawer `DetalheJazigo` ("Emitir Plaqueta QR Code" e "Visualizar Ficha Cadastral").
- Suporte a geração individual e preparação para impressão múltipla/em lote.

## Capabilities

### Modified Capabilities
- `cemiterio/inventario`: Adição dos requisitos para geração de QR Code de identificação física do jazigo e emissão da Ficha Cadastral oficial de sepultura.

## Impact

- **Frontend (`apps/web-client`)**: Novos componentes `ModalQrCodeJazigo.tsx` e `FichaCadastralJazigo.tsx`, integração de biblioteca de renderização SVG/Canvas de QR Code (ou renderização vetorial nativa leve), botões no `InventarioView.tsx` e `DetalheJazigo`.
- **Rotas / Navegação**: Parâmetro ou rota de acesso direto para consulta rápida a partir da leitura do QR Code.
- **Tipografia e Estilo**: Estrita conformidade com `@sysgov/ui`, JetBrains Mono para códigos, números de concessão e datas.
