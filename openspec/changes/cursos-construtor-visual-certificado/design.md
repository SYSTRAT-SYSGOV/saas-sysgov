# Design

## Context

Ver `proposal.md` (Why) e a delta da spec `cursos`. Estado atual, verificado no código:

- **Modelo** (`cursos_modelos_certificado`): `nome`, `titulo`, `corpo` (campos dinâmicos validados
  por `ModeloCertificadoService::PLACEHOLDERS`), `logotipo_path`, `assinaturas` (JSON, até 3:
  nome, cargo, imagem), `padrao`. Arquivos no disco `public`; arquivos substituídos **não** são
  apagados porque certificados emitidos apontam para eles.
- **Certificado** (`cursos_certificados`): `codigo` (12, único na plataforma — exceção D7),
  `tipo` (`curso`/`formacao`), `participante_id`, `inscricao_id` (único), `formacao_id`
  (`unique(formacao_id, participante_id)`), `modelo_id`, `dados` (snapshot JSON: título, corpo
  renderizado, logotipo, assinaturas, órgão, curso, carga horária, período), revogação.
- **PDF**: `CertificadoService::pdf` usa DomPDF (`barryvdh/laravel-dompdf`) com a view
  `cursos::certificado` (A4 paisagem, leiaute fixo em mm) e QR via `chillerlan/php-qrcode`
  (PNG base64). Imagens entram embutidas como `data:` URI.
- **Participante** (`cursos_participantes`): `nome`, `email`, `documento`, `user_id` nulo-permitido.
- **Validação pública**: `api/public/cursos/certificados/{codigo}`, sem `TenantContext`, só pelo
  `ValidacaoCertificadoService`; URL do portal `CURSOS_URL_PORTAL/validar-certificado/XXXX-XXXX-XXXX`;
  `normalizarCodigo` aceita hífens, minúsculas e O/I/L.
- **Container da API**: extensão `gd` presente; **sem** Imagick e sem Ghostscript.
- **Frontend**: `ModelosCertificadoPage.tsx` edita título, corpo, logotipo e assinaturas; não há
  biblioteca de arrastar nem pdf.js no `package.json`.
- **Sistema PHP de referência** (não alterado nem lido por esta change): página A4 paisagem de 842×595 pt; elementos `{x, y, width, size, color, align,
  type, label, src}`; fundo PDF importado com FPDI após conversão por Ghostscript; códigos de 10
  caracteres hexadecimais maiúsculos; tabelas `certificados_emitidos` (participante **ou**
  empresa), `participantes` (CPF), `empresas` (CNPJ), `cursos`, `assinaturas`.

## Goals / Non-Goals

**Goals:**
- Leiaute livre sobre fundo próprio, com resultado previsível entre o construtor e o PDF.
- Nenhuma mudança no PDF de modelos e certificados existentes.
- Certificado emitido imutável também no visual (leiaute, fundo, assinaturas).
- Sistema PHP de referência intocado: nenhuma alteração, conexão ou leitura de dados dele.

**Non-Goals:**
- Importar certificados emitidos pelo PHP ou desligá-lo (ele segue em uso).
- Migrar automaticamente os modelos/leiautes do PHP (são poucos; recriar no construtor é mais
  rápido e confiável que converter coordenadas de outro motor).
- Assinatura digital ICP-Brasil no PDF.
- Fontes enviadas pelo usuário (ficam as fontes embutidas do DomPDF).
- Envio de e-mail na emissão avulsa além do evento `cursos.CertificadoEmitido` que já existe.

## Decisions

### D1. Um motor de PDF só: DomPDF com posicionamento absoluto em pontos
O modelo visual vira uma view Blade nova (`cursos::certificado-visual`) com `@page { size: A4
landscape|portrait; margin: 0 }`, o fundo como `<img>` de página inteira e cada elemento como
`<div style="position:absolute; left:{x}pt; top:{y}pt; width:{largura}pt">`. Coordenadas em
**pontos** (A4 = 842×595 pt), as mesmas do sistema PHP de referência e do canvas do construtor, então não há
conversão de unidade entre tela e PDF — o construtor só aplica uma escala visual.
*Alternativa descartada*: FPDI/FPDF como no sistema PHP — segundo motor, sem UTF-8 nativo, e fundo PDF
exige Ghostscript (ausente no container) para PDFs com compressão moderna.

### D2. Fundo sempre imagem; PDF convertido no navegador
O backend aceita só PNG/JPEG (conteúdo verificado com `getimagesize`, até 5 MB). O construtor usa
`pdfjs-dist` para renderizar a primeira página de um PDF num canvas a 200 dpi e envia o PNG.
Mantém o servidor sem Ghostscript/Imagick e o PDF final com uma única imagem de fundo.
*Trade-off*: fundo vetorial vira raster; a 200 dpi a impressão fica nítida e o arquivo razoável.

### D3. Elementos como JSON validado no modelo
`cursos_modelos_certificado.elementos` (JSON) com itens
`{id, tipo, x, y, largura, campo?|texto?, fonte, tamanho, cor, negrito, caixa_alta, alinhamento,
assinatura_id?, mostrar_textos?}`. Validação no `ModeloCertificadoService` (tipos, limites de
página pela orientação, 6–72 pt, cor `#rrggbb`, ≤ 40 elementos, exatamente um `qrcode`, campos
dinâmicos conhecidos, assinaturas do tenant e ativas). Fontes: `sans` → DejaVu Sans, `serif` →
DejaVu Serif (já disponíveis no DomPDF, com acentuação).

### D4. Biblioteca de assinaturas como entidade própria
Tabela `cursos_assinaturas` (`tenant_id`, `nome`, `cargo`, `registro_profissional`,
`imagem_path`, `selo_path`, `ativa`, timestamps, soft delete não — exclusão bloqueada se houver
referência em algum `elementos`). Os modelos `padrao` mantêm o JSON `assinaturas` atual; só os
visuais usam a biblioteca. Modelo de dados e rotas seguem o padrão do módulo (TenantAware,
Policy com `cursos.manage`, AuditLogger + Outbox em toda escrita).

### D5. Snapshot do leiaute na emissão
Ao emitir com modelo visual, `dados` recebe `leiaute = {orientacao, fundo_path, elementos}` com
cada elemento de assinatura/selo **resolvido** (nome, cargo, registro, `imagem_path`,
`selo_path`) e o verso (`verso_fundo_path`, conteúdo). O PDF é sempre renderizado do snapshot,
nunca do modelo atual. Como arquivos substituídos não são apagados (regra já existente), os
caminhos do snapshot continuam válidos. Certificados antigos (sem `leiaute`) usam a view fixa.

### D6. Verso
`cursos_cursos.conteudo_programatico` (texto, nulo). Modelo: `verso_ativo` (bool) e
`verso_fundo_path`. Na emissão, o snapshot guarda `verso = {titulo, linhas}`: conteúdo do curso,
ou "curso — carga horária" de cada curso da formação. Verso vazio → página omitida. Mesmo leiaute
de verso para os dois tipos de modelo (página fixa simples, com o fundo quando houver).

### D7. Emissão avulsa
Novo `TipoCertificado::Avulso`. `cursos_certificados` ganha `curso_id` (nulo, FK) e
`concluido_em` (date, nulo) com `unique(curso_id, participante_id, concluido_em)` — garante a
idempotência "mesma pessoa, curso e data". `POST /api/cursos/cursos/{curso}/certificados-avulsos`
(JSON com lista) e `.../certificados-avulsos/importar` (CSV `NOME;EMAIL;DOCUMENTO;CONCLUSAO`,
separador `;` ou `,`, UTF-8 com ou sem BOM, até 1.000 linhas). Participante resolvido pelo
`ParticipantePessoaService::resolver` (change `educacao-multiescola-e-cadastro-pessoas`, D9): CPF
→ pessoa do Cadastro de Pessoas e um único participante por pessoa; CNPJ → participante sem pessoa
pelo documento; senão pelo e-mail; criado se não houver.
Resposta `{emitidos, existentes, recusadas: [{linha, motivo}]}`. Cada linha em sua transação para
recusas não derrubarem as demais.

### D8. Construtor por curso com bibliotecas de fundos e textos (02/10/2026)

Pedido do usuário após conferir o sistema de referência: o construtor deve seguir o fluxo do PHP —
curso alvo → fundo → modelo de texto → assinaturas (checkboxes) → elementos opcionais
(checkboxes) → posicionar e configurar → salvar e pré-visualizar.

- Tabelas `cursos_fundos` e `cursos_textos` (TenantAware, `ativo`); fundo guardado em JPEG
  ≤ 2480 px como os demais (D2) e com `orientacao` deduzida da imagem.
- O leiaute do curso é um `ModeloCertificado` visual com `curso_id` (único por tenant),
  `fundo_id` e `texto_id`; salvar cria/atualiza esse modelo e grava `cursos.modelo_certificado_id`.
  Assim a emissão, o snapshot (D5), o verso (D6) e a emissão avulsa (D7) não mudam.
- `montarDados` usa o fundo e o texto atuais das bibliotecas quando o modelo os referencia
  (correção no texto vale para os próximos certificados; o snapshot congela os emitidos).
- Campos dinâmicos dos textos: os mesmos do corpo (`{{participante}}`, `{{curso}}`…), oferecidos
  como chips clicáveis; texto complementar vira o campo `complementar` do leiaute.
- O construtor por modelo (aba Modelos) continua para modelos avulsos; a página do certificado
  (arrastar, redimensionar, teclado) é um componente compartilhado pelos dois.

### D10. Variáveis do texto no formato do sistema de referência e biblioteca de empresas (02/10/2026)

Pedido do usuário: as variáveis oferecidas nos textos devem ser as do PHP — `{NOME}`, `{CPF}`,
`{EMPRESA}`, `{CNPJ}`, `{CURSO}`, `{CARGA_HORARIA}`, `{DATA}`, `{DATA_CONCLUSAO}`,
`{CODIGO_CERTIFICADO}`, `{RESPONSAVEL}` e `{CONTEUDO_PROGRAMATICO}`.

- `ModeloCertificadoService::VARIAVEIS` mapeia cada variável para uma chave dos valores da emissão;
  `renderizar` troca as duas sintaxes. O formato antigo (`{{participante}}`…) **continua valendo**
  nos textos e modelos já gravados (decisão do usuário), mas não é mais oferecido nas telas.
  Variável desconhecida (`{RG}`) é recusada ao salvar, como os campos antigos desconhecidos.
- Valores novos no snapshot: `cpf` (documento do participante, senão o CPF da pessoa ligada no
  Cadastro de Pessoas), `empresa`/`cnpj` (empresa do participante; sem empresa, "Autônomo", como no
  PHP), `carga_horas` (só o número de horas, porque os textos do PHP escrevem "{CARGA_HORARIA}
  horas"), `data_extenso` ("{cidade do órgão}, dd de mês de aaaa"), `data_conclusao` (fim da turma
  ou data da emissão avulsa), `responsavel` (novo campo `cursos_cursos.responsavel`) e
  `conteudo_programatico`.
- `{CODIGO_CERTIFICADO}` só existe depois de gravar o certificado: o corpo guarda a marcação e o
  código entra ao desenhar o PDF (`montarView`).
- Empresas: tabela `cursos_empresas` (TenantAware; CNPJ só dígitos, dígitos verificadores
  conferidos, único por tenant) e `cursos_participantes.empresa_id`. Pessoas jurídicas não entram
  no Cadastro de Pessoas (só CPF), por isso a biblioteca fica no Cursos. A empresa é ligada ao
  participante na emissão avulsa (campo por linha ou coluna `EMPRESA_CNPJ` do CSV); empresa com
  participante ligado não é excluída.
- LGPD: o CPF completo vai para o corpo do certificado (como no PHP) e para o snapshot; a
  validação pública continua mostrando só os campos mínimos (sem CPF) e o PDF exige login.

## Risks / Trade-offs

- [Diferença de renderização entre construtor (HTML) e PDF (DomPDF)] → mesma unidade (pt), mesmas
  fontes embarcadas via `@font-face` no construtor, e pré-visualização do PDF real a um clique.
- [DomPDF lento com fundo grande em lote] → fundo limitado a 5 MB e reamostrado para no máximo
  2480 px no lado maior (GD) ao salvar; lote avulso processado por linha, PDF sob demanda.
- [CSV com dados pessoais] → nada do CSV é gravado além do necessário ao participante; erros não
  ecoam documento completo.
- [pdf.js pesado] → carregado sob demanda (import dinâmico) só quando o usuário escolhe um PDF.

## Migration Plan

1. Migrations aditivas (colunas nulas/`default`), `tipo = 'padrao'` para modelos existentes.
2. Deploy do backend e do frontend; nada muda para quem não usar o construtor.
3. Recriar no construtor, se desejado, os modelos que hoje são feitos no PHP.

Rollback: as colunas novas são ignoradas pelo código anterior; certificados avulsos continuam
validando (a validação lê só o snapshot).

## Open Questions

Nenhuma.
