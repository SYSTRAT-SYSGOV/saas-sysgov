# Proposal

## Why

A Fase 1 do módulo Cursos (`add-cursos-fundacao`) entregou o ciclo oferta → inscrição →
presença → certificado, mas o conteúdo do curso continua fora da plataforma: apostilas e vídeos
circulam por e-mail e grupos de mensagem, e a verificação de aprendizagem é feita em papel ou em
formulários externos, sem ligação com a conclusão. O critério de conclusão só olha a frequência;
a coluna `cursos_cursos.nota_minima` foi criada na Fase 1 justamente para esta fase e está sem
uso.

Esta mudança é a **Fase 2 — conteúdo e avaliação**: materiais do curso com liberação
programada e avaliações com banco de questões, com a nota passando a compor o critério de
conclusão e o certificado.

## What Changes

- **Materiais do curso**: o Administrador cadastra materiais no curso, opcionalmente
  vinculados a uma aula, de quatro tipos: **arquivo PDF**, **vídeo incorporado** (YouTube e
  Vimeo), **link externo** e **texto** formatado. Os materiais são ordenados e podem ser
  despublicados sem serem excluídos.
- **Liberação programada**: cada material tem uma regra de liberação relativa à turma
  (imediata, no início da aula vinculada ou N dias após o início da turma), calculada para cada
  turma sem agendamento de tarefas. Antes da liberação, o participante vê só o título e a data
  prevista.
- **Acesso protegido aos arquivos**: os PDFs ficam em disco privado e são entregues por um
  endpoint autorizado. É o primeiro arquivo do módulo que não fica no disco `public`.
- **Banco de questões por curso**: questões **objetivas** (uma alternativa correta, com
  correção automática) e **dissertativas** (corrigidas pelo instrutor), com pontuação.
  Questão já respondida não pode ser excluída, só desativada.
- **Avaliações**: o Administrador monta avaliações do curso escolhendo questões do banco, com
  peso na nota final, número máximo de tentativas, tempo limite opcional e a mesma regra de
  liberação dos materiais. O participante com inscrição confirmada responde na plataforma, e o
  gabarito nunca é enviado ao navegador antes da correção.
- **Correção pelo instrutor**: o instrutor designado (ou o Administrador) corrige as questões
  dissertativas das turmas dele, com nota por questão e comentário opcional.
- **Nota no critério de conclusão**: o curso passa a aceitar **nota mínima** (0 a 10). A nota
  final da inscrição é a média ponderada, pelo peso, da melhor tentativa em cada avaliação.
  No encerramento da turma, a conclusão exige frequência **e** nota quando o curso tiver nota
  mínima. O encerramento é recusado enquanto houver tentativa aguardando correção.
- **Nota no certificado**: novo campo dinâmico `{{nota}}` nos modelos de certificado, gravado
  no snapshot na emissão.
- **Eventos continuam sem avaliação**: curso do tipo `evento` não aceita avaliações nem nota
  mínima (regra da Fase 1 mantida).
- **Frontend (`apps/web-client`)**: abas de Materiais, Questões e Avaliações no detalhe do
  curso, tela de correção para o instrutor, e na área do participante os materiais liberados,
  as avaliações disponíveis, a tela de responder e as notas.

Fora desta mudança:
- Registro de "material visto" e progresso por material. Pode entrar depois sem mudar o
  modelo.
- Sorteio de questões, questões de múltiplas respostas corretas e embaralhamento de
  alternativas.
- Upload de vídeo para a plataforma. Os vídeos são só incorporados de provedores externos.
- Tudo o que é da Fase 3 (participante externo, página pública de inscrição, e-mail,
  relatórios).

## Capabilities

### New Capabilities

(nenhuma. Materiais e avaliações fazem parte da capacidade `cursos`.)

### Modified Capabilities

- `cursos`: novos requisitos de materiais com liberação programada, banco de questões,
  avaliações com tentativas e correção de dissertativas. Mudam os requisitos de isolamento por
  tenant (novas entidades), perfis (o instrutor corrige), cadastro do curso (nota mínima),
  evento (sem avaliação), encerramento e apuração (nota), modelo de certificado (campo
  `{{nota}}`), área do participante (materiais, avaliações e notas) e auditoria/eventos de
  domínio.

## Impact

- **Backend**: novas migrations `cursos_materiais`, `cursos_questoes`,
  `cursos_questao_alternativas`, `cursos_avaliacoes`, `cursos_avaliacao_questoes`,
  `cursos_tentativas` e `cursos_respostas`, e a coluna `nota_apurada` em `cursos_inscricoes`.
  Models `TenantAware`, services, policies e rotas em `api/cursos`. Mudam o
  `ApuracaoConclusaoService` (checagem de nota, prevista no design D4 da Fase 1), o
  `EncerramentoService` (bloqueio por correção pendente) e o `CertificadoService` (campo
  `{{nota}}`).
- **Storage**: PDFs dos materiais no disco privado `local`, em
  `cursos/{tenant_id}/materiais/`, nunca expostos por URL pública.
- **Configuração do PHP**: a imagem da API (`php:8.4-cli`, sem `php.ini`) aceita hoje uploads
  de até 2 MB. O `Dockerfile` passa a definir `upload_max_filesize` e `post_max_size` para o
  limite dos materiais.
- **Código compartilhado**: o `HtmlSanitizer` do Licita é promovido para `app/Support`, como o
  design D9 da Fase 1 já previa, e passa a sanitizar os materiais de texto e os enunciados.
- **Frontend**: novas telas em `apps/web-client/src/modules/cursos`, usando o
  `RichTextEditor` que já existe em `@sysgov/ui`. Contrato novo em
  `packages/sdk/src/modules/cursos`.
- **Auditoria/Outbox**: mutações registradas via `AuditLogger`. Novos eventos
  `cursos.TentativaEnviada` e `cursos.TentativaCorrigida` no Outbox, ainda sem consumidor (o
  consumidor é da Fase 3).
- **Dependências novas**: nenhuma.
- **Depende de**: PR #37 (Fase 1) mergeado na `main`.
