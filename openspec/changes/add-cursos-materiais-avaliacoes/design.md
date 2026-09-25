# Design

## Context

Ver `proposal.md` (Why) e `specs/cursos/spec.md` (requisitos). Estado atual relevante, depois
da Fase 1 (`add-cursos-fundacao`, design D1 a D12):

- **Critério de conclusão**: `ApuracaoConclusaoService::apurar(Inscricao)` devolve
  `{concluiu, frequencia}` e é chamado só pelo `EncerramentoService`, dentro da transação que
  trava a turma (`lockForUpdate`). `cursos_cursos.nota_minima` (`decimal(5,2)`, nulo) existe e
  não é usada; o SDK já expõe o campo.
- **Arquivos**: tudo o que o módulo grava hoje (capa do curso, logotipo e assinaturas dos
  modelos) fica no disco `public`, com URL pública. Não há, em nenhum módulo, arquivo privado
  entregue por endpoint autorizado. O disco `local` (`storage/app`) existe e não é exposto.
- **Limite de upload**: a API roda em `php:8.4-cli` com `artisan serve` e sem `php.ini`, então
  valem os padrões do PHP (`upload_max_filesize=2M`, `post_max_size=8M`). A capa do curso usa
  `max:2048` e cabe; um PDF de apostila não cabe.
- **HTML sanitizado**: `Modules/Licita/Support/HtmlSanitizer` (lista de tags permitidas) é
  usado em 12 pontos do Licita. O design D9 da Fase 1 previa promovê-lo para `app/Support`.
- **Frontend**: `@sysgov/ui` tem `RichTextEditor` (carregado sob demanda) e o web-client tem
  `dompurify`. As telas do Cursos seguem o padrão página + modal de formulário
  (`CursoFormModal`, `AulaFormModal`).
- **Fuso**: `config/app.php` usa `America/Sao_Paulo`; `cursos_turmas.data_inicio` é `date` e
  `cursos_aula_agendamentos.inicio` é `dateTime`.

## Goals / Non-Goals

**Goals:**
- Gabarito e orientação de correção nunca saírem do servidor antes da correção, por
  construção (recursos de resposta separados), e não por filtro no frontend.
- Arquivos de material inacessíveis sem autorização, inclusive por quem descobrir o caminho.
- Encaixar a nota no critério de conclusão sem mudar quem chama a apuração (promessa do D4).

**Non-Goals:**
- Antivírus nos uploads e conversão ou miniatura de PDFs.
- Visualizador de PDF próprio: o navegador exibe o arquivo entregue com
  `Content-Disposition: inline`.
- Relatórios de desempenho por questão ou por turma (Fase 3, relatórios).

## Decisions

### D1. Tabelas novas, todas `TenantAware`
`cursos_materiais` (`curso_id`, `aula_id` nulo, `tipo`, `titulo`, `descricao`, `ordem`,
`publicado`, `conteudo` para texto, `url` para link, `video_provedor` + `video_id` para vídeo,
`arquivo_path`, `arquivo_nome`, `arquivo_tamanho`, `liberacao_regra`, `liberacao_dias`),
`cursos_questoes` (`curso_id`, `tipo`, `enunciado`, `pontuacao`, `orientacao_correcao`,
`ativa`), `cursos_questao_alternativas` (`questao_id`, `texto`, `correta`, `ordem`),
`cursos_avaliacoes` (`curso_id`, `titulo`, `instrucoes`, `peso`, `tentativas_max`,
`tempo_limite_minutos`, `publicada`, `liberacao_regra`, `liberacao_dias`, `aula_id`),
`cursos_avaliacao_questoes` (pivot com `ordem`), `cursos_tentativas` (`avaliacao_id`,
`inscricao_id`, `numero`, `status`, `iniciada_em`, `prazo_em`, `enviada_em`, `corrigida_em`,
`nota`, `questoes` JSON) e `cursos_respostas` (`tentativa_id`, `questao_id`,
`alternativa_id` nulo, `texto` nulo, `pontos`, `comentario`, `corrigida_por`,
`corrigida_em`). Em `cursos_inscricoes`, nova coluna `nota_apurada` (`decimal(5,2)`, nula).
Índices compostos iniciando por `tenant_id`, como na Fase 1 (D1). Unicidade
`(tentativa_id, questao_id)` em respostas e `(avaliacao_id, inscricao_id, numero)` em
tentativas.

### D2. Liberação calculada na leitura por um único serviço
`LiberacaoService::situacao(ComLiberacao, Turma): SituacaoLiberacao` devolve `liberado`, a data
prevista (`preverEm`, só antes da liberação) e `aguardandoAgendamento`; `liberado()` é um atalho.
`Material` e `Avaliacao` implementam o contrato `ComLiberacao` (regra, dias e aula). Um `?CarbonImmutable`
não distinguia "imediata" de "aguardando agendamento", por isso o retorno é um objeto de valor.
Regras: `imediata` → liberado; `inicio_aula` → `inicio` do agendamento da aula na turma (sem
agendamento ou sem aula, aguardando); `dias_apos_inicio` → `data_inicio` da turma + N dias às
00:00 em `America/Sao_Paulo`.
Materiais e avaliações compartilham a mesma regra (colunas iguais), o que mantém uma só
implementação e um só componente de formulário.
- *Por quê*: um material pertence ao curso e vale para todas as turmas; guardar uma data por
  turma exigiria criar e manter linhas a cada nova turma ou reagendamento.
- *Alternativa descartada*: job agendado que "libera" materiais. Não há scheduler rodando hoje
  (o `outbox:process` nem está agendado) e a liberação é só uma comparação de datas.

### D3. PDF em disco privado, entregue por endpoint autorizado
Upload validado com `mimetypes:application/pdf` (confere o conteúdo, não a extensão) e
`max:20480`, gravado com nome aleatório em `cursos/{tenant_id}/materiais/{uuid}.pdf` no disco
`local`. `GET /api/cursos/materiais/{material}/arquivo` passa pela `MaterialPolicy` (inscrição
válida + liberação, ou admin/instrutor do curso) e responde com
`Storage::disk('local')->response()`, `Content-Disposition: inline` e
`X-Content-Type-Options: nosniff`. O nome original fica só em `arquivo_nome`, para o
download. Substituir o arquivo apaga o anterior depois do commit.
- O frontend baixa o arquivo pelo SDK (com o token Sanctum) e abre um `blob:` numa aba, como o
  certificado em PDF já faz. Não há URL assinada.
- *Alternativa descartada*: `temporaryUrl` (URL assinada) no disco local. Funciona, mas cria um
  link que vale sem login durante a validade e pode ser repassado; o blob autenticado não.
- `Dockerfile`: arquivo `docker/php/uploads.ini` com `upload_max_filesize=25M` e
  `post_max_size=26M`, copiado para `$PHP_INI_DIR/conf.d/`. A margem acima de 20 MB fica para
  a validação do Laravel responder com mensagem clara em vez de o PHP descartar o corpo.

### D4. Vídeo guardado como provedor + ID, embed montado no servidor
Na gravação, a URL passa por um parser com lista fechada (`youtube.com/watch?v=`, `youtu.be/`,
`youtube.com/embed/`, `youtube.com/shorts/`, `vimeo.com/<id>`, `player.vimeo.com/video/<id>`),
que extrai `video_provedor` e `video_id` (validado por regex). A API devolve `embed_url`
montada a partir deles (`https://www.youtube-nocookie.com/embed/<id>` ou
`https://player.vimeo.com/video/<id>`). O frontend só renderiza `embed_url` num `<iframe>`
com `sandbox="allow-scripts allow-same-origin allow-presentation"` e
`referrerpolicy="strict-origin-when-cross-origin"`.
- *Por quê*: o `src` do iframe nunca é texto livre do usuário, então não há como incorporar
  outro site.

### D5. Texto e enunciados sanitizados no servidor com o `HtmlSanitizer` promovido
`Modules/Licita/Support/HtmlSanitizer` é movido para `app/Support/HtmlSanitizer` (os 12 usos no
Licita passam a importar do novo namespace, sem mudança de comportamento). Materiais de texto,
enunciados, instruções e orientações de correção são sanitizados ao salvar. No frontend, a
exibição passa ainda pelo `DOMPurify` já instalado (defesa em profundidade). Respostas
dissertativas são **texto puro** (sem HTML), exibidas com quebra de linha preservada.

### D6. Tentativa com snapshot; gabarito só em recursos de correção
Ao iniciar, a tentativa grava em `questoes` (JSON) o enunciado, a pontuação, as alternativas
com `id`, texto e `correta`, e a orientação de correção, na ordem da avaliação. A correção
automática e a exibição usam **só o snapshot**, o que cumpre "alterar questão não altera
tentativa" sem versionar o banco de questões.
- Dois API Resources: `TentativaParticipanteResource` monta a saída a partir do snapshot
  **omitindo** `correta` e `orientacao_correcao` (e, depois de corrigida, inclui só `acertou`
  por objetiva) e `TentativaCorrecaoResource` (admin/instrutor) inclui tudo. Um teste funcional
  confere que a resposta ao participante não contém as chaves `correta` nem
  `orientacao_correcao` em nenhum estado da tentativa.
- *Alternativa descartada*: versionar questões (`cursos_questao_versoes`). Mais normalizado,
  mas mais tabelas e joins para um benefício que o snapshot já entrega; o volume por tentativa
  é pequeno (dezenas de questões).

### D7. Tempo limite sem job: prazo gravado e fechamento preguiçoso
`prazo_em = iniciada_em + tempo_limite` é gravado no início. Salvar resposta e enviar checam
`now() <= prazo_em` (com 30 s de tolerância para latência) sob `lockForUpdate` da tentativa.
Toda leitura ou escrita de uma tentativa `em_andamento` vencida a finaliza antes de seguir
(`TentativaService::fecharSeVencida`), aplicando a mesma rotina de envio. O encerramento da
turma também finaliza as que estiverem em andamento (spec).
- *Por quê*: mesmo motivo do D2, não há scheduler ativo, e o resultado observável é igual.
- O cronômetro do frontend é só visual; o servidor devolve `prazo_em` e a hora do servidor
  para o cálculo do tempo restante, evitando depender do relógio do navegador.

### D8. Respostas salvas uma a uma, auditoria só no envio
`PUT /api/cursos/tentativas/{tentativa}/respostas/{questao}` faz `upsert` da resposta (a
interface salva ao escolher a alternativa e, nas dissertativas, com debounce). Esse endpoint
**não** chama o `AuditLogger` por resposta. O envio registra na auditoria o conjunto de
respostas e publica `cursos.TentativaEnviada`; a correção de cada dissertativa é auditada, e a
última publica `cursos.TentativaCorrigida`.
- Limite de requisições para o salvamento (`throttle:cursos-respostas`, 60/min por usuário),
  para que o autosave com debounce não seja usado para inundar a auditoria nem o banco.

### D9. Nota e apuração: extensão do `ApuracaoConclusaoService`
`NotaService::notaFinal(Inscricao)` calcula a média ponderada da maior nota corrigida por
avaliação publicada (spec). `ApuracaoConclusaoService::apurar` passa a devolver
`{concluiu, frequencia, nota}` e, quando `nota_minima` não é nula, exige as duas condições. O
`EncerramentoService` grava `nota_apurada` junto com `frequencia_apurada`.
- Antes da transação de encerramento, o `EncerramentoService` recusa se houver tentativa
  `aguardando_correcao` na turma ou se o curso tiver nota mínima sem avaliação publicada. Dentro
  da transação, com a turma travada, finaliza as tentativas em andamento e só então apura.
- Como a apuração grava o resultado na inscrição, mudar `nota_minima` ou `frequencia_minima`
  depois não altera turmas encerradas (spec) sem precisar de coluna extra.
- Arredondamento: `round(..., 2)` (meio para cima) na nota de cada tentativa e na nota final,
  e a comparação com `nota_minima` usa o valor já arredondado. Assim, 6,995 vira 7,00 e
  conclui, igual ao que a pessoa lê na tela.

### D10. `{{nota}}` no certificado
`ModeloCertificadoService::PLACEHOLDERS` ganha `nota`. O `CertificadoService` inclui
`nota` (formatada `8,75` ou `—`) no snapshot `dados` na emissão; certificados já emitidos não
têm a chave e renderizam `—`, sem migração de dados.

### D11. Autorização
Novas policies `MaterialPolicy`, `QuestaoPolicy`, `AvaliacaoPolicy` e `TentativaPolicy`, com
as permissões que já existem (`cursos.manage`, `cursos.instrutor`, `cursos.participar`) e o
vínculo instrutor↔turma da Fase 1 (D11). Sem permissões novas no `module.json`, então os
perfis provisionados não mudam. Regras de objeto:
- Material/avaliação (leitura): admin; instrutor designado em alguma turma do curso;
  participante com inscrição `confirmada`/`concluida`/`nao_concluida` numa turma do curso e
  item publicado e liberado para aquela turma.
- Tentativa: o próprio participante (via `participante.user_id`); correção só por admin ou
  instrutor designado na turma da inscrição.

### D12. Rotas
Todas em `api/cursos`, com o middleware da Fase 1:
- Admin: `cursos/{curso}/materiais` (CRUD + `reordenar` + `arquivo` POST),
  `cursos/{curso}/questoes` (CRUD + `desativar`), `cursos/{curso}/avaliacoes` (CRUD +
  `publicar`/`despublicar`).
- Leitura: `GET materiais/{material}` e `GET materiais/{material}/arquivo`.
- Participante: `GET inscricoes/{inscricao}/conteudo` (materiais e avaliações com situação de
  liberação, tentativas restantes e nota parcial), `POST avaliacoes/{avaliacao}/tentativas`,
  `GET tentativas/{tentativa}`, `PUT tentativas/{tentativa}/respostas/{questao}`,
  `POST tentativas/{tentativa}/enviar`.
- Correção: `GET turmas/{turma}/correcoes` (fila de tentativas `aguardando_correcao`),
  `GET tentativas/{tentativa}/correcao`,
  `PUT tentativas/{tentativa}/respostas/{questao}/correcao`.

### D13. Frontend
- `CursoDetalhePage` ganha as abas **Materiais**, **Questões** e **Avaliações** (visíveis com
  `cursos.manage`), com modais no padrão existente e o componente comum
  `RegraLiberacaoFields`.
- `TurmaDetalhePage` ganha a aba **Correções** (instrutor/admin) e a nota parcial na lista de
  inscritos.
- `InscricaoDetalhePage` (participante) ganha as seções Materiais e Avaliações; nova rota
  `/cursos/tentativas/:id` com a tela de responder (autosave, cronômetro, confirmação de envio)
  e o resultado depois da correção.
- Materiais: vídeo em iframe (D4), PDF por blob autenticado (D3), texto com `DOMPurify`, link
  com `target="_blank" rel="noopener noreferrer"`.

## Risks / Trade-offs

- **[Resposta com gabarito vazando por um campo novo]** Alguém acrescenta um campo ao snapshot
  e ele sai no recurso do participante → o recurso do participante monta a saída com lista
  explícita de campos (não remove chaves de um array completo) e o teste do D6 cobre todos os
  estados da tentativa.
- **[Arquivos grandes no `artisan serve`]** O servidor embutido processa uma requisição por vez
  e um upload de 20 MB o ocupa → aceitável em desenvolvimento; em produção a API deve rodar
  atrás de um servidor de verdade (fora do escopo, registrado em Open Questions).
- **[Disco local em mais de uma instância]** Com a API em várias réplicas, arquivos no disco
  `local` de uma não existem na outra → o mesmo vale hoje para o disco `public`; trocar o disco
  por S3 é configuração (`FILESYSTEM_DISK`/disco dedicado), e o código usa só a API do
  `Storage`.
- **[Fraude em avaliação online]** Consulta a materiais ou a colegas durante a tentativa → fora
  do alcance técnico desta fase; tempo limite e número de tentativas são os controles, como em
  qualquer LMS sem supervisão.
- **[Encerramento bloqueado por correção]** Um instrutor que não corrige trava o encerramento
  → a recusa lista as pendentes e o Administrador também pode corrigir. É preferível a apurar
  com nota incompleta, que reprovaria participantes por atraso de quem corrige.
- **[Autosave gera muitas escritas]** → `upsert` numa linha por questão, com debounce no
  cliente e limite de requisições por usuário (D8).

## Migration Plan

Só tabelas novas e uma coluna nula em `cursos_inscricoes`; nenhuma alteração destrutiva.
Deploy: rebuild da imagem da API (novo `uploads.ini`) → `migrate` → frontend. O `module:register`
não muda, pois não há permissões novas. A promoção do `HtmlSanitizer` é um move com ajuste de
imports no Licita, coberto pelos testes existentes do Licita. Rollback: as migrations têm
`down()`; arquivos em `storage/app/cursos/*/materiais` podem ser removidos à mão. Cursos sem
`nota_minima` se comportam exatamente como na Fase 1.

## Open Questions

- Como a API roda em produção (hoje `artisan serve`). Se houver um proxy na frente, o limite de
  corpo dele (ex.: `client_max_body_size` do nginx) precisa acompanhar os 25 MB. Verificar no
  deploy, sem impacto no código.
- Texto de orientação exibido ao participante antes de iniciar uma avaliação com tempo limite
  (redação). Pode ser definido na implementação.
