# Tasks

> Testes do backend rodam no container `sysgov-api` com o ambiente de teste sobrescrito
> (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `APP_ENV=testing`, `CACHE_STORE=array`,
> `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync`) — chamados abaixo de "phpunit (Docker)".
> Frontend: `npm --workspace apps/web-client run typecheck` e `run test`.

## 1. Banco e modelos

- [x] 1.1 Migration aditiva em `cursos_modelos_certificado`: `tipo` (`padrao` default),
      `orientacao` (`paisagem` default), `fundo_path`, `elementos` (JSON), `verso_ativo` (false),
      `verso_fundo_path`; verificar que modelos existentes ficam `padrao`.
- [x] 1.2 Migration de `cursos_assinaturas` (`tenant_id` FK cascade, `nome`, `cargo`,
      `registro_profissional`, `imagem_path`, `selo_path`, `ativa`, índice `(tenant_id, ativa)`);
      model `Assinatura` com `TenantAware`.
- [x] 1.3 Migration aditiva: `cursos_cursos.conteudo_programatico` (texto) e, em
      `cursos_certificados`, `curso_id` (FK nula) e `concluido_em` (date nula) com
      `unique(curso_id, participante_id, concluido_em)`. Também `cursos_participantes.email`
      passa a aceitar nulo (pessoa/empresa emitida à mão sem e-mail, exigido pela spec).
- [x] 1.4 `TipoCertificado::Avulso`; casts e `@property` nos models alterados.
- [x] 1.5 Teste de isolamento A/B para `cursos_assinaturas` e para certificados avulsos.

## 2. Biblioteca de assinaturas

- [x] 2.1 `AssinaturaService` (criar, atualizar, ativar/desativar, excluir bloqueado quando
      referenciada em algum `elementos`), upload de imagem e selo (PNG/JPEG pelo conteúdo, até 2 MB,
      arquivos antigos mantidos), AuditLogger (como os modelos de certificado, sem evento de
      Outbox: nenhum consumidor precisa dele). Regra `ImagemPngOuJpeg` (getimagesize).
- [x] 2.2 `AssinaturaController`, `AssinaturaPolicy` (`cursos.manage`), rotas
      `/api/cursos/assinaturas` (+ `/imagem`, `/selo`). As imagens são servidas pelo disco
      `public` (URL em `imagem_url`/`selo_url`), como a capa do curso; o JSON do model serve de
      resposta, como nos modelos de certificado.
- [x] 2.3 Testes: CRUD, upload com extensão falsa recusado, exclusão em uso recusada, anti-BOLA
      entre tenants e rotas no `IsolamentoRotasTest`. ("Inativa não entra em modelo novo" fica
      no teste do modelo visual, 3.3.)

## 3. Modelo visual

- [x] 3.1 `ModeloCertificadoService`: aceitar `tipo`, `orientacao`, `elementos`, `verso_ativo`;
      validar elementos (D3) e campos dinâmicos dos textos livres; upload de fundo e de fundo de
      verso (PNG/JPEG, até 5 MB, salvo **em JPEG** de até 2480 px — PNG de página inteira estourava a
      memória do DomPDF).
- [x] 3.2 Rotas `POST /modelos-certificado/{modelo}/fundo`, `.../verso-fundo` e
      `POST /modelos-certificado/{modelo}/pre-visualizar` (PDF com dados de exemplo, sem gravar).
- [x] 3.3 Testes: elemento fora da página, sem QR code, dois QR codes, campo desconhecido em texto
      livre, assinatura de outro tenant, pré-visualização não cria certificado.

## 4. Emissão e PDF

- [x] 4.1 Snapshot do leiaute (D5) e do verso (D6) em `CertificadoService::emitir`.
- [x] 4.2 View `cursos::certificado-visual` (posicionamento em pt, fontes DejaVu, caixa alta,
      alinhamento, assinatura com nome/cargo/registro) e página de verso para os dois tipos;
      `pdf()` escolhe a view pelo snapshot.
- [x] 4.3 Testes: PDF de modelo `padrao` inalterado (mesmos dados no HTML renderizado), PDF
      visual contém nome/código nas posições (asserção sobre o HTML da view), alterar modelo e
      assinatura depois da emissão não muda o PDF emitido, verso omitido sem conteúdo.

## 5. Emissão avulsa

- [x] 5.1 `EmissaoAvulsaService`: resolve/cria participante com `ParticipantePessoaService::resolver`
      (CPF → pessoa; CNPJ → documento; senão e-mail),
      idempotência por `(curso_id, participante_id, concluido_em)`, transação por linha.
- [x] 5.2 Rotas `POST /cursos/{curso}/certificados-avulsos` e `.../importar` (CSV, D7) com
      `CertificadoPolicy`/`cursos.manage`; resposta `{emitidos, existentes, recusadas}`.
- [x] 5.3 Testes: lista com linha inválida, emissão repetida devolve o existente, empresa com
      CNPJ, curso de outro tenant → 404, CSV com BOM e `;`, validação pública do avulso só com
      dados mínimos.

## 6. Frontend

- [x] 6.1 SDK `@sysgov/sdk`: tipos e chamadas de assinaturas, modelo visual, fundos,
      pré-visualização e emissão avulsa.
- [x] 6.2 Tela "Assinaturas" no módulo Cursos (lista, cadastro, upload de imagem e selo,
      ativar/desativar) com `@sysgov/ui`.
- [x] 6.3 Construtor visual: escolha do tipo no modelo; área A4 em escala com o fundo; adicionar,
      arrastar (pointer events), redimensionar e remover elementos; painel de propriedades; fundo
      em PDF convertido por `pdfjs-dist` (import dinâmico); botão de pré-visualização em PDF.
      Testes de unidade da conversão tela ↔ pontos e da validação local.
- [x] 6.4 Campo "Conteúdo programático" no formulário do curso; opção de verso e fundo de verso
      no modelo.
- [x] 6.5 Tela de emissão avulsa no curso: formulário de pessoas e importação CSV com modelo
      para download e relatório de linhas recusadas.

## 7. Verificação e documentação

- [x] 7.1 Suítes phpunit (Docker) do Cursos e do Admin verdes; PHPStan sem novos erros;
      typecheck e vitest do web-client verdes.
- [x] 7.2 Documentação do módulo Cursos (rotas novas, elementos do leiaute, CSV) — `docs/modules/cursos.md`.
- [x] 7.3 Recriar no construtor um modelo equivalente a um certificado do sistema PHP de referência
      e comparar visualmente os PDFs (só olhando o PHP; nada é alterado nele).
      Conferido em 02/10/2026 com a prévia "Padrão Conclusão" do PHP (fundo de Araucária, assinatura
      e QR code): fundo, posições, título em caixa alta, data, carga horária, QR code e assinatura
      coincidem na sobreposição. Diferenças: fonte (DejaVu Sans no SYSGOV, Arial no PHP — texto
      cerca de 8% mais largo e entrelinha maior); faltavam `{CPF}` e `{DATA_CONCLUSAO}` — resolvido
      no bloco 9 com as variáveis do PHP; o código do SYSGOV (XXXX-XXXX-XXXX) pede uma
      caixa de pelo menos ~115 pt para não quebrar no hífen.

## 8. Construtor por curso (fluxo do sistema de referência)

> Conferido em 02/10/2026: fundo em PDF convertido e cadastrado, texto com campos inseridos pelo
> chip, construtor com curso/fundo/texto, assinatura e opcionais marcados, elemento arrastado e
> configurado, leiaute salvo e recarregado, PDF de prévia igual à tela. Dados do teste removidos.

- [x] 8.1 Migrations `cursos_fundos`, `cursos_textos` e `curso_id`/`fundo_id`/`texto_id` em
      `cursos_modelos_certificado`; models, policies e serviços com exclusão recusada quando em uso.
- [x] 8.2 API: CRUD de fundos (upload PNG/JPEG) e textos; `GET/PUT /cursos/{curso}/leiaute` e
      `POST /cursos/{curso}/leiaute/pre-visualizar`; `montarDados` com fundo/texto das bibliotecas e
      campo `complementar`.
- [x] 8.3 Testes: bibliotecas (CRUD, isolamento, exclusão em uso, campo desconhecido), leiaute do
      curso (cria/atualiza modelo e vincula ao curso, fundo/texto de outro tenant, texto corrigido
      reflete na emissão seguinte, pré-visualização não grava).
- [x] 8.4 Frontend: SDK; abas Fundos e Textos; aba Construtor visual com os passos 1–3, página
      compartilhada com o construtor de modelos e painel de propriedades; testes.
- [x] 8.5 Suítes, PHPStan, typecheck/vitest, documentação e conferência no navegador.
- [x] 8.6 Assinatura desenhada na tela (canvas → PNG transparente recortado no traço) no
      formulário da biblioteca de assinaturas, ao lado do envio de arquivo; testes e conferência
      no navegador.

## 9. Variáveis do sistema de referência e biblioteca de empresas (D10)

- [x] 9.1 Migration `cursos_empresas`, `cursos_participantes.empresa_id` e `cursos_cursos.responsavel`;
      model, policy, serviço (CNPJ validado e único) e rotas `GET/POST /empresas`,
      `PUT/DELETE /empresas/{empresa}`.
- [x] 9.2 Variáveis `{NOME}`…`{CONTEUDO_PROGRAMATICO}` na validação e no `renderizar` (formato antigo
      mantido); valores novos na emissão e na prévia; `{CODIGO_CERTIFICADO}` preenchido no PDF.
- [x] 9.3 Emissão avulsa com empresa por linha e coluna `EMPRESA_CNPJ` no CSV.
- [x] 9.4 Testes: empresas (CNPJ, repetido, isolamento, exclusão em uso), variáveis (todas
      preenchidas, "Autônomo", formato antigo, desconhecida), CSV com empresa, responsável do curso.
- [x] 9.5 Frontend: SDK; aba Empresas; botões de variáveis nas abas Textos e Modelos e no texto livre
      do construtor; Responsável no formulário do curso; Empresa na emissão avulsa; testes.
- [x] 9.6 Documentação, suítes e conferência no navegador.

---

> **Verificação (01/10/2026):** Cursos 410 e Admin 108 testes verdes; PHPStan sem erros nos
> arquivos da change; typecheck do web-client sem erros; vitest 542/543 (a falha é o teste antigo
> do `AuthProvider`, alheio a esta change). Conferido no navegador com o banco do Docker: fundo
> enviado, assinatura da biblioteca adicionada, elemento arrastado, leiaute salvo e PDF de prévia
> idêntico ao construtor (frente + verso). Dados da verificação removidos depois.
>
> **7.3 (02/10/2026):** concluída com a prévia do PHP enviada pelo usuário (a prévia do PHP não
> grava nada); ver o resultado no item 7.3.
