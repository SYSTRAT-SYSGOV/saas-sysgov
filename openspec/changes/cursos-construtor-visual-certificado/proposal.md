# Proposal

## Why

Os certificados de cursos são emitidos hoje por dois sistemas. O módulo Cursos do SYSGOV tem o
ciclo correto — código único não adivinhável, QR code, validação pública só com dados mínimos,
revogação e dados congelados na emissão —, mas imprime sempre o mesmo leiaute fixo (moldura azul,
título, corpo e até três assinaturas em linha). O sistema PHP de certificados
(`systema/certificado`, em uso em `veiga.pro.br/certificado`) serve de **referência funcional**
para esta mudança; seu diferencial é o **construtor visual**: sobe-se a arte do certificado como fundo e arrastam-se sobre ela o nome, o
texto, o QR code, as assinaturas e os selos; há ainda um cadastro de assinaturas reutilizáveis com
registro profissional e selo, e um verso com o conteúdo programático.

Esta mudança traz esses recursos para dentro do módulo Cursos, no padrão do SYSGOV (isolamento por
órgão, autorização por objeto, auditoria, testes e validação pública sem CPF). O sistema PHP **não
é alterado, não é desligado e nenhum dado dele é lido**: é usado apenas como exemplo.

## What Changes

- **Leiaute visual do modelo de certificado**: o modelo passa a ter dois tipos — `padrao` (o
  leiaute fixo de hoje, inalterado) e `visual`. O modelo visual tem orientação (paisagem ou
  retrato), uma imagem de fundo e uma lista de elementos posicionados em pontos sobre a página A4:
  textos (campo dinâmico ou texto livre com campos dinâmicos, com fonte, tamanho, cor, negrito,
  alinhamento e largura), QR code de validação, logotipo, assinatura e selo.
- **Construtor no painel**: tela de edição que mostra o fundo em escala e permite arrastar,
  redimensionar e configurar cada elemento, com pré-visualização em PDF gerada pelo servidor com
  dados de exemplo. Fundo em PDF é convertido no navegador (primeira página → PNG) antes do envio.
- **Biblioteca de assinaturas do órgão**: cadastro reutilizável com nome, cargo, registro
  profissional, imagem da assinatura, imagem do selo e situação (ativa/inativa). Os modelos visuais
  referenciam assinaturas da biblioteca; os modelos padrão continuam com as assinaturas próprias.
- **Verso opcional**: novo campo `conteudo_programatico` no curso; o modelo pode imprimir um verso
  com esse conteúdo (ou a lista de cursos, no certificado de formação), com fundo próprio opcional.
- **Emissão avulsa**: o Administrador emite certificados para pessoas informadas à mão ou por CSV
  num curso, sem turma nem apuração de presença — cobre eventos externos e o uso atual do PHP,
  inclusive certificados em nome de empresas.
- **Dados congelados também no leiaute**: a emissão grava no snapshot o leiaute, o fundo e os dados
  das assinaturas usados; trocar o modelo ou a assinatura depois não altera certificados emitidos.
  Arquivos de fundo, assinatura e selo substituídos não são apagados.
- **Dados só no banco do SYSGOV**: tudo é gravado no MySQL do Docker (`sysgov`), como o restante
  do módulo. Não há integração nem importação do sistema PHP.

## Capabilities

### New Capabilities

Nenhuma — todo o comportamento pertence à capacidade `cursos`.

### Modified Capabilities

- `cursos`: modelo de certificado configurável (tipos padrão/visual, fundo, elementos, verso),
  emissão (tipo avulso, snapshot do leiaute), nova biblioteca de assinaturas e emissão avulsa.

## Impact

- **Backend** (`apps/api/Modules/Cursos`): migrations aditivas em `cursos_modelos_certificado`
  (`tipo`, `orientacao`, `fundo_path`, `elementos`, `verso_ativo`, `verso_fundo_path`),
  `cursos_cursos` (`conteudo_programatico`) e `cursos_certificados` (`curso_id` nulo-permitido,
  tipo `avulso`); nova tabela `cursos_assinaturas`. `CertificadoService` ganha o renderizador
  visual (DomPDF, posicionamento absoluto em pt), `ModeloCertificadoService` valida elementos;
  novo `AssinaturaService`, controller e policy; endpoints de pré-visualização e de emissão avulsa.
  Sem permissões novas: tudo é gestão do
  Administrador (`cursos.manage`).
- **Frontend** (`apps/web-client/src/modules/cursos`): construtor visual do modelo, tela de
  assinaturas, emissão avulsa (formulário e CSV), campo de conteúdo programático no curso. Nova
  dependência `pdfjs-dist` (conversão do fundo em PDF no navegador). SDK `@sysgov/sdk` com os
  novos tipos e chamadas.
- **Sem quebra**: modelos existentes continuam `padrao` e o PDF deles não muda; certificados já
  emitidos não mudam; a validação pública continua expondo só os dados mínimos.
- **Sistema PHP** (`systema/certificado`): nenhum impacto — continua em uso, sem alteração.
