# Módulo Cursos — certificados (construtor visual, assinaturas e emissão avulsa)

Este documento cobre a parte de certificados do módulo Cursos trazida da change
`cursos-construtor-visual-certificado`. O restante do módulo (cursos, turmas, presença, avaliações)
segue a documentação geral em `visao-modulos-educacao-cursos.html`.

## Tipos de modelo

| Tipo | Como é montado |
|------|----------------|
| `padrao` | Leiaute fixo do SYSGOV (título, corpo com placeholders, logotipo e até 3 assinaturas do próprio modelo). |
| `visual` | Página A4 desenhada no **construtor**: fundo (PNG, JPEG ou PDF), elementos posicionados livremente e assinaturas da biblioteca do órgão. |

Os dois tipos podem imprimir um **verso** opcional (`verso_ativo`) com o conteúdo programático do
curso (`cursos.conteudo_programatico`, uma linha por tópico) e um fundo próprio (`verso_fundo_path`).

Na emissão, o leiaute e o verso são copiados para `certificados.dados.leiaute` e `dados.verso`:
alterar o modelo depois **não muda** certificados já emitidos.

## Construtor visual por curso (aba Construtor visual)

Segue o fluxo do sistema de referência: o certificado vai sendo montado ao lado conforme os itens
são escolhidos.

1. **Selecionar vínculos** — curso alvo, fundo (aba **Fundos**) e modelo de texto (aba **Textos**);
   opcionalmente, o verso com o conteúdo programático do curso.
2. **Assinaturas** — marque as assinaturas da biblioteca (aba **Assinaturas**) que entram no
   certificado.
3. **Elementos opcionais avulsos** — Tipo de Certificado, Nome do Participante, Nome do Curso, Data
   de Emissão e Texto Complementar (este só quando o texto escolhido tem complemento).

O texto principal, o QR code e o código de autenticidade estão sempre presentes (não saem pela
lixeira). Clique num elemento para abrir **Propriedades do elemento**: tamanho da fonte, cor,
alinhamento, largura da caixa, fonte, negrito e caixa alta. **Salvar layout visual** grava o
leiaute como o modelo do curso (aparece na aba Modelos como "Do construtor do curso") e o vincula
ao curso; **Pré-visualizar PDF** gera o PDF com o curso escolhido sem emitir nada.

Na emissão valem o texto e o fundo **atuais** das bibliotecas: corrigir um texto ajusta os próximos
certificados; os já emitidos não mudam (snapshot).

### Fundos (aba Fundos)

Nome, descrição, status e arquivo PDF, PNG ou JPEG (PDF: a 1ª página vira imagem no navegador). A
orientação da página sai da proporção da imagem. Fundo usado por algum leiaute não é excluído —
desative-o.

### Textos (aba Textos)

Nome, tipo de certificado, texto principal, texto complementar e observações internas. As
variáveis são as do sistema de referência e entram com um clique, na posição do cursor:

| Variável | O que imprime |
|----------|---------------|
| `{NOME}` | Nome do participante. |
| `{CPF}` | CPF do participante (000.000.000-00), do documento ou do Cadastro de Pessoas. |
| `{EMPRESA}` | Nome fantasia da empresa do participante (ou a razão social); sem empresa, "Autônomo". |
| `{CNPJ}` | CNPJ da empresa do participante (vazio sem empresa). |
| `{CURSO}` | Título do curso (na formação, o da formação). |
| `{CARGA_HORARIA}` | Só o número de horas ("20", "1,5") — escreva "horas" no texto. |
| `{DATA}` | Cidade do órgão e data de emissão por extenso ("Araucária, 02 de outubro de 2026"). |
| `{DATA_CONCLUSAO}` | Data de conclusão (fim da turma ou a data da emissão avulsa), dd/mm/aaaa. |
| `{CODIGO_CERTIFICADO}` | Código de validação (XXXX-XXXX-XXXX), preenchido ao gerar o PDF. |
| `{RESPONSAVEL}` | Responsável pelo curso (campo do cadastro do curso). |
| `{CONTEUDO_PROGRAMATICO}` | Conteúdo programático do curso (na formação, os cursos concluídos). |

Os campos no formato antigo (`{{participante}}`, `{{curso}}`, `{{carga_horaria}}`, `{{periodo}}`,
`{{data_emissao}}`, `{{orgao}}`, `{{nota}}`) continuam valendo nos textos e modelos já gravados,
mas não são mais oferecidos. Variável desconhecida é recusada ao salvar. Texto usado por algum
leiaute não é excluído — desative-o.

### Empresas (aba Empresas)

Razão social, nome fantasia, CNPJ (dígitos verificadores conferidos; único no órgão), e-mail,
telefone, responsável e observações. O participante fica ligado a uma empresa pela emissão avulsa
(campo Empresa de cada linha ou coluna `EMPRESA_CNPJ` do CSV) e passa a imprimir `{EMPRESA}` e
`{CNPJ}`. Empresa com participante ligado não é excluída — desative-a.

## Construtor de modelos (aba Modelos de certificado)

Aba **Modelos de certificado → Abrir construtor**.

- Página em pontos: paisagem 842 × 595 pt, retrato 595 × 842 pt; o PDF usa o papel exato.
- Arrastar move o elemento; a alça à direita muda a largura; setas ajustam 1 pt (Shift: 10 pt);
  Delete remove.
- Fundo em PDF: a 1ª página é convertida em imagem no navegador (pdfjs) antes do envio. No servidor
  o fundo vira JPEG de até 2480 px (evita estouro de memória do DomPDF).
- **Pré-visualizar PDF** gera o PDF com as alterações ainda não salvas e dados de exemplo.
- Sair com alterações não salvas pede confirmação.

### Elementos do leiaute (`elementos`)

Coordenadas `x`, `y` e `largura` em pontos, a partir do canto superior esquerdo. Máximo de
40 elementos; no máximo um QR code.

| `tipo` | Campos | Observação |
|--------|--------|------------|
| `texto` | `campo` **ou** `texto`, `fonte` (`sans`/`serif`), `tamanho` (6–72), `alinhamento` (`esquerda`, `centro`, `direita`, `justificado`), `cor` (#rrggbb), `negrito`, `caixa_alta` | `campo` ∈ `participante`, `curso`, `carga_horaria`, `periodo`, `data_emissao`, `orgao`, `nota`, `codigo`, `titulo`, `corpo`, `complementar`. Texto livre aceita as variáveis da aba Textos (`{NOME}`, `{CODIGO_CERTIFICADO}`…) e os campos antigos `{{…}}` (até 2000 caracteres). |
| `qrcode` | `largura` | Link de validação pública do certificado. |
| `logotipo` | `largura` | Logotipo do modelo. |
| `assinatura` | `assinatura_id` | Imagem, nome, cargo e matrícula da assinatura da biblioteca. |
| `selo` | `assinatura_id` | Selo da assinatura (exige selo enviado). |

Um modelo sem elementos usa `LeiauteCertificado::padrao()`. O catálogo acima também vem da API em
`GET /api/cursos/modelos-certificado` (chave `leiaute`).

## Biblioteca de assinaturas

Aba **Assinaturas**: nome, cargo, matrícula, imagem da assinatura e selo (PNG ou JPEG, conferidos
pelo conteúdo do arquivo, não pela extensão). A imagem da assinatura pode ser enviada como arquivo
ou desenhada na própria tela (mouse, caneta ou dedo). O desenho é salvo como PNG de fundo
transparente, recortado no traço. Uma assinatura em uso por um modelo não pode ser
excluída — desative-a.

## Emissão avulsa

No detalhe do curso, **Certificados avulsos**: emite certificados para pessoas sem turma, presença
ou avaliação (palestras, eventos externos). Permissão: administrador do Cursos no tenant do curso.

- Cada pessoa é processada em transação própria; o resultado lista `emitidos`, `existentes` (já tinha
  certificado deste curso para a mesma conclusão) e `recusadas` (com linha e motivo).
- CPF resolve a pessoa no **Cadastro de Pessoas** (cria se não existir, sem sobrescrever dados);
  CNPJ fica só como documento; sem documento, a pessoa é identificada pelo e-mail.
- Modelo: o informado, senão o do curso, senão o modelo padrão do tenant.
- Até 1000 pessoas por envio.

### CSV

UTF-8 (com ou sem BOM), separador `;` ou `,`, linha 1 com cabeçalho:

```csv
NOME;EMAIL;DOCUMENTO;CONCLUSAO;EMPRESA_CNPJ
Maria da Silva;maria@exemplo.gov.br;123.456.789-09;2026-09-30;11.222.333/0001-81
```

`NOME` é obrigatório; `EMAIL`, `DOCUMENTO` (CPF ou CNPJ), `CONCLUSAO` (AAAA-MM-DD ou DD/MM/AAAA;
vazio usa a data informada na tela) e `EMPRESA_CNPJ` (CNPJ de uma empresa ativa da aba Empresas;
desconhecido recusa a linha) são opcionais. O modal oferece o modelo para baixar.

## Rotas (prefixo `/api/cursos`)

| Método e rota | Uso |
|---------------|-----|
| `POST /modelos-certificado/{modelo}/fundo` | Envia o fundo da frente (campo `imagem`). |
| `POST /modelos-certificado/{modelo}/verso-fundo` | Envia o fundo do verso (campo `imagem`). |
| `POST /modelos-certificado/{modelo}/pre-visualizar` | PDF de prévia (aceita leiaute não salvo). |
| `GET/POST /fundos`, `POST/DELETE /fundos/{id}` | Biblioteca de fundos (`POST /fundos/{id}` atualiza; com `imagem`, troca o arquivo). |
| `GET/POST /textos`, `PUT/DELETE /textos/{id}` | Biblioteca de modelos de texto. |
| `GET/PUT /cursos/{curso}/leiaute` | Leiaute do construtor por curso (`fundo_id`, `texto_id`, `elementos`, `verso_ativo`). |
| `POST /cursos/{curso}/leiaute/pre-visualizar` | PDF de prévia do leiaute do curso, sem gravar. |
| `GET/POST /assinaturas`, `PUT/DELETE /assinaturas/{id}` | Biblioteca de assinaturas. |
| `GET/POST /empresas`, `PUT/DELETE /empresas/{id}` | Biblioteca de empresas (`{EMPRESA}`/`{CNPJ}`). |
| `POST /assinaturas/{id}/imagem`, `POST /assinaturas/{id}/selo` | Imagens da assinatura. |
| `POST /cursos/{curso}/certificados-avulsos` | Emissão avulsa por lista (JSON `pessoas[]` com `empresa_id` opcional; `modelo_id` e `concluido_em` opcionais). |
| `POST /cursos/{curso}/certificados-avulsos/importar` | Emissão avulsa por CSV (campo `arquivo`, até 2 MB). |

Todas passam pelo tenant e pelas policies do módulo; imagens são gravadas em
`storage/app/public/cursos/{tenant}/…`.
