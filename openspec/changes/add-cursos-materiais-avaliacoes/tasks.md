# Tasks

> Pré-requisito: PR #37 (Fase 1) mergeado e este branch rebaseado na `main`.
> Testes do backend rodam no container `api` com o ambiente do CI (`APP_ENV=testing`, SQLite em
> memória, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`) e
> `php -d memory_limit=-1`; chamados abaixo de "phpunit (Docker)". Frontend: `npm --workspace
> apps/web-client run typecheck` e `run test` num container `node:22`.

## 1. Preparação

- [x] 1.1 Mover `Modules/Licita/Support/HtmlSanitizer` para `app/Support/HtmlSanitizer` e ajustar
      os imports do Licita (D5); verificar que a suíte do Licita continua verde no phpunit
      (Docker) e o PHPStan sem erros novos.
- [x] 1.2 Criar `docker/php/uploads.ini` (`upload_max_filesize=25M`, `post_max_size=26M`) e
      copiá-lo no `Dockerfile` para `$PHP_INI_DIR/conf.d/` (D3); verificar com
      `php -i | grep upload_max_filesize` no container reconstruído.
- [x] 1.3 Criar o `LiberacaoService` (D2) com as três regras e testes unitários: imediata,
      início da aula (com e sem agendamento), N dias após o início da turma (virada do dia em
      `America/Sao_Paulo`) e o cenário "mesmo material em turmas diferentes".

## 2. Materiais

- [x] 2.1 Migration e model `TenantAware` de `cursos_materiais` (D1); verificar `migrate` no
      MySQL do Docker e o isolamento com teste A/B.
- [x] 2.2 Parser de URL de vídeo (YouTube/Vimeo → provedor + ID) e montagem de `embed_url` (D4);
      testes unitários com os formatos aceitos, IDs inválidos e provedores recusados.
- [x] 2.3 `MaterialService` + `MaterialController` (CRUD, reordenar, publicar/despublicar) com
      validações da spec (tipo, link só `http/https`, regra "início da aula" exige aula do
      mesmo curso, texto sanitizado); testes funcionais dos cenários "Vídeo de provedor não
      suportado", "Texto com script", "Regra início da aula sem aula" e "Material
      despublicado".
- [x] 2.4 Upload e substituição do PDF no disco `local` (`mimetypes:application/pdf`,
      `max:20480`, nome aleatório, remoção do anterior após o commit) (D3); testes do cenário
      "Arquivo que não é PDF" e da substituição.
- [x] 2.5 `MaterialPolicy` e `GET materiais/{material}` / `GET materiais/{material}/arquivo`
      (D3, D11); testes dos cenários "Participante em lista de espera", "Acesso ao PDF sem
      login", "Consulta depois da conclusão", "Instrutor antes da liberação", "Material
      liberado no início da aula", "Aula vinculada sem agendamento" e "Arquivo de material de
      outro tenant" (`404`).

## 3. Banco de questões e avaliações

- [x] 3.1 Migrations e models de `cursos_questoes`, `cursos_questao_alternativas`,
      `cursos_avaliacoes` e `cursos_avaliacao_questoes` (D1); verificar `migrate` e isolamento
      A/B.
- [x] 3.2 `QuestaoService` + controller (CRUD, desativar; objetiva com 2 a 6 alternativas e
      exatamente uma correta; enunciado e orientação sanitizados); testes dos cenários
      "Objetiva sem alternativa correta" e "Exclusão de questão respondida".
- [x] 3.3 `AvaliacaoService` + controller (CRUD, publicar/despublicar, questões do próprio curso
      e ativas, travas depois da primeira tentativa, recusa em evento); testes dos cenários
      "Avaliação em evento", "Questão de outro curso" e "Alterar questões após tentativa".
- [x] 3.4 Validar `nota_minima` no cadastro do curso (0 a 10, proibida em evento); testes dos
      cenários "Nota mínima fora da escala" e "Nota mínima em evento".

## 4. Tentativas e correção

- [x] 4.1 Migrations e models de `cursos_tentativas` e `cursos_respostas` (únicos da D1);
      verificar `migrate` e isolamento A/B.
- [x] 4.2 `TentativaService::iniciar` (inscrição confirmada, turma aberta, avaliação publicada
      e liberada, sem outra em andamento, limite de tentativas, snapshot das questões, `prazo_em`)
      (D6, D7); testes dos cenários "Limite de tentativas", "Avaliação ainda não liberada" e
      "Turma encerrada".
- [x] 4.3 `TentativaParticipanteResource` e `TentativaCorrecaoResource` com lista explícita de
      campos (D6); teste que percorre os estados `em_andamento`, `aguardando_correcao` e
      `corrigida` e confirma que a resposta ao participante nunca contém `correta` nem
      `orientacao_correcao` (cenário "Gabarito não é exposto").
- [x] 4.4 Salvamento de resposta (`upsert`, texto puro nas dissertativas, sem auditoria por
      resposta, `throttle:cursos-respostas`) e fechamento preguiçoso da tentativa vencida (D7,
      D8); testes do cenário "Tempo esgotado" (com `Carbon::setTestNow`) e da tolerância de
      30 s.
- [x] 4.5 Envio com correção automática das objetivas, nota com arredondamento (D9), auditoria
      do conjunto de respostas e evento `cursos.TentativaEnviada`; testes dos cenários
      "Tentativa só com objetivas" (nota 7,50) e "Tentativa com dissertativa".
- [x] 4.6 `TentativaPolicy`, fila `GET turmas/{turma}/correcoes` e correção de dissertativa
      (pontos de 0 ao máximo, comentário, revisão até o encerramento, evento
      `cursos.TentativaCorrigida` na última); testes dos cenários "Instrutor de outra turma",
      "Pontos acima do máximo", "Participante tenta ver tentativa de outra pessoa" e
      "Correção de dissertativa" (auditoria + Outbox).

## 5. Nota, apuração e certificado

- [x] 5.1 `NotaService::notaFinal` (média ponderada da melhor tentativa corrigida, avaliação sem
      tentativa = 0) e nota parcial; testes dos cenários "Média ponderada pela melhor
      tentativa" (8,75) e "Avaliação não feita" (5,00).
- [x] 5.2 Migration da coluna `nota_apurada` em `cursos_inscricoes`; `ApuracaoConclusaoService`
      passa a devolver `nota` e exigir a nota mínima quando houver (D9); testes dos cenários
      "Nota insuficiente" e "Frequência e nota suficientes", e os testes da Fase 1 de
      apuração por frequência continuam verdes.
- [x] 5.3 `EncerramentoService`: recusa com tentativas `aguardando_correcao` (listando-as) e com
      nota mínima sem avaliação publicada; finaliza as tentativas em andamento dentro da
      transação; grava `nota_apurada`; testes do cenário "Correção pendente", da recusa sem
      avaliação publicada e da imutabilidade de tentativas e correções depois do encerramento.
- [x] 5.4 Placeholder `{{nota}}` no `ModeloCertificadoService` e no snapshot do
      `CertificadoService` (D10); testes dos cenários "Nota impressa no certificado" e "Nota
      em curso sem avaliação", e de um certificado antigo sem a chave renderizando "—".

## 6. SDK e frontend

- [x] 6.1 Tipos e métodos novos em `packages/sdk/src/modules/cursos` (materiais, questões,
      avaliações, tentativas, correções, conteúdo da inscrição, download do PDF como blob);
      verificar o typecheck do web-client.
- [x] 6.2 Abas Materiais, Questões e Avaliações no `CursoDetalhePage`, com modais e o componente
      `RegraLiberacaoFields` (D13) e o `RichTextEditor` de `@sysgov/ui`; testes de formulário
      (Vitest) para a validação da regra de liberação e das alternativas da objetiva.
- [x] 6.3 Seções Materiais e Avaliações no `InscricaoDetalhePage` (vídeo em iframe com
      `sandbox`, PDF por blob, texto com `DOMPurify`, link com `noopener`), com situação de
      liberação e tentativas restantes; teste do cenário "Consulta de materiais e avaliações".
- [x] 6.4 Tela de responder (`/cursos?tentativa=:id`, na convenção de query string do módulo): responder com autosave, cronômetro pelo relógio do
      servidor, confirmação de envio e tela de resultado sem gabarito; testes Vitest do
      autosave e do bloqueio após o prazo.
- [x] 6.5 Aba Correções no `TurmaDetalhePage` e nota parcial na lista de inscritos, com a
      mensagem de recusa do encerramento listando as pendentes; teste Vitest da fila de
      correção.

## 7. Fechamento

- [ ] 7.1 Estender o `CursosDadosDemonstracaoSeeder` com materiais dos quatro tipos, uma
      avaliação mista e tentativas de exemplo; verificar que o `CursosDadosDemonstracaoSeederTest`
      continua verde.
- [ ] 7.2 Suíte completa verde: phpunit (Docker), PHPStan, typecheck e testes de `apps/web` e
      `apps/web-client`, e build do web-client.
- [ ] 7.3 Teste manual no navegador com um participante e um instrutor: material liberado e
      bloqueado, vídeo incorporado, PDF aberto em aba, tentativa com tempo limite, correção da
      dissertativa, encerramento e certificado com `{{nota}}`.
