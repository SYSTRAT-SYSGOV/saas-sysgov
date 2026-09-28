# Design: Identificação Física com QR Code e Ficha Cadastral de Unidades de Sepultamento

## Context

A visualização de inventário municipal de cemitérios conta com listagem tabular avançada (`DataTable`) e um Drawer lateral retrátil (`DetalheJazigo`). Para atender à fiscalização em campo e emitir documentos oficiais com fé pública, precisamos implementar:
1. Geração de **Plaqueta de Identificação com QR Code** para afixação física nos túmulos/gavetas.
2. Emissão de **Ficha Cadastral da Unidade de Sepultamento (A4)** com dados consolidados e QR Code de autenticação.

## Goals / Non-Goals

**Goals:**
- Prover componente `ModalQrCodeJazigo` com pré-visualização da plaqueta (layout de alta qualidade visual, dados em JetBrains Mono, moldura técnica, dados da necrópole, código do túmulo, setor, tipo e capacidade).
- Permitir impressão direta via CSS `@media print` da plaqueta e da Ficha Cadastral.
- Prover componente `ModalFichaCadastral` com layout A4 institucional (brasão municipal, identificação do cemitério, coordenadas GPS, dados de concessão, histórico de sepultados e declaração de autenticidade cadastral).
- Disponibilizar ações intuitivas no `InventarioView.tsx` (menu de ações rápidas na tabela e botões de cabeçalho no Drawer de Detalhes).
- Codificar a URL canônica de consulta da unidade: `${window.location.origin}/cemiterios?plot_id=${jazigo.id}&codigo=${jazigo.codigo}`.

**Non-Goals:**
- Integração com impressoras térmicas específicas por protocolo binário proprietário (a impressão é feita via spooler padrão do navegador/sistema operacional).
- Geração de novas tabelas de banco de dados (os dados consumidos já estão presentes nos endpoints de `jazigo`, `concessoes`, `inumacoes` e `parques`).

## Decisions

1. **Geração de QR Code via biblioteca `qrcode` (SVG/Canvas)**:
   - *Decisão:* Adicionar a biblioteca padrão `qrcode` e `@types/qrcode` para renderização vetorial precisa (SVG ou DataURL) sem depender de APIs externas de terceiros, garantindo funcionamento offline e privacidade.
   - *Alternativas consideradas:* Gerar via URL de API externa (ex: Google Charts ou QuickChart) — descartado por violar privacidade de dados de governo e depender de conectividade externa.

2. **Formatos de Impressão (CSS Print Styles)**:
   - *Decisão:* Criar estilos específicos de impressão com `@media print` para a plaqueta (tamanho reduzido para corte em 10cm x 7cm ou padrão de etiqueta) e para a Ficha Cadastral (folha inteira A4 vertical).
   - *Alternativas consideradas:* Gerar exclusivamente PDF via backend em Laravel — mais lento, exige round-trip com o servidor para cada pré-visualização. A solução client-side no React permite visualização imediata e impressão nativa instantânea.

3. **Pontos de Acesso na Interface**:
   - *Decisão:* Adicionar botão "QR Code" e "Ficha Cadastral" na barra de ações do Drawer `DetalheJazigo`, além de ícone de atalho na coluna de ações da `DataTable`.

## Risks / Trade-offs

- [Ambiente de Impressão com Cores de Fundo Desativadas] → O layout da plaqueta e da ficha cadastral deve usar bordas sólidas nítidas (`border-2 border-black/80`) e tipografia contrastada de alta legibilidade, garantindo que mesmo se a opção "Gráficos de segundo plano" estiver desmarcada no navegador, a plaqueta e o QR Code permaneçam 100% nítidos e legíveis.
