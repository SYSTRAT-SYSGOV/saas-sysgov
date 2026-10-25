# Enrollments (i-Educar legado), Tarefas de Implementação

> Sequência de tarefas executáveis para reimplementar a unit de matrículas e enturmações a partir do legado, com rastreabilidade ao código original.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- [ ] Dependências da unit listadas em `design.md` estão disponíveis: aluno, pessoa, turma, série, escola, instituição, ano letivo por módulo, módulo de avaliação, busca ativa, promoção e sequência de séries.
- [ ] Schema e migrations do banco compatíveis com as tabelas `educa_registrations` e `educa_enrollments` descritas em `_reversa_sdd/Enrollments/legacy-mapping.md`, com `tenant_id` em todas as entidades.
- [ ] Domínio de situações da matrícula unificado em um único catálogo, com rótulos e estados finais definidos, resolvendo a divergência atual entre `RegistrationStatus` e `App_Model_MatriculaSituacao`.
- [ ] Parâmetros institucionais configurados por tenant: data base de remanejamento, data base de transferência, data de fechamento e autorização de registro fora do ano letivo.
- [ ] Datas base de remanejamento e de transferência no formato mês e dia, com o ano composto pela data de enturmação, conforme o serviço legado.
- [ ] Contrato do pacote `@sysgov/sdk` definido para matrícula, enturmação, solicitação de transferência e movimentação.

---

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-01, Modelar a matrícula com tenant, aluno, escola, ano letivo, curso, série, situação, datas de matrícula e cancelamento, dependência, última matrícula e trava de situação
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_table.php:19-49`
  - Critério de pronto: tabela `educa_registrations` criada, com o domínio de situação em `ENUM` e teste de recusa de situação fora do catálogo
  - Confiança: 🟡

- [ ] T-02, Modelar a enturmação com matrícula, turma, data de entrada, data de saída, sequencial, sequencial de fechamento, turno, marcadores de encerramento e carga horária integralizada
  - Origem no legado: `database/migrations/legacy/2020_01_01_110000_create_pmieducar_matricula_turma_table.php:13-41` e `app/Models/LegacyEnrollment.php:48-71`
  - Critério de pronto: tabela `educa_enrollments` criada, com índice único por matrícula, turma e sequencial, e teste de recusa de duplicidade
  - Confiança: 🟡

- [ ] T-03, Modelar a solicitação de transferência e os catálogos de tipo de transferência e de motivo de abandono
  - Origem no legado: `app/Services/RegistrationService.php:184-195` e `database/migrations/legacy/2020_01_01_110000_create_pmieducar_transferencia_tipo_table.php`
  - Critério de pronto: tabelas `educa_transfer_requests`, `educa_transfer_types` e `educa_dropout_reasons` criadas, com teste de vínculo da solicitação à matrícula de saída
  - Confiança: 🟡

- [ ] T-04, Unificar o catálogo de situações da matrícula, com rótulos, estados finais e estados inativos em uma única fonte
  - Origem no legado: `app/Models/RegistrationStatus.php:8-71` e `ieducar/lib/App_Model/MatriculaSituacao.php:5-76`
  - Critério de pronto: um único catálogo com os quinze valores, e teste que garante que os estados finais e inativos esperados estão presentes
  - Confiança: 🟢

- [ ] T-05, Implementar a validação de vaga na enturmação, respeitando a configuração de bloqueio da rede
  - Origem no legado: `app/Services/EnrollmentService.php:193-195`
  - Critério de pronto: enturmação em turma sem vaga é recusada quando o bloqueio está ativo, e permitida quando não está, com teste para os dois casos
  - Confiança: 🟢

- [ ] T-06, Implementar a validação dos limites do ano letivo na enturmação, com a exceção de registro fora do ano letivo
  - Origem no legado: `app/Services/EnrollmentService.php:197-205`
  - Critério de pronto: data anterior ao início é aceita apenas com a autorização da instituição, e data posterior ao fim é sempre recusada
  - Confiança: 🟢

- [ ] T-07, Implementar a validação de ordem cronológica da enturmação, contra a data de matrícula e a data de saída da última enturmação
  - Origem no legado: `app/Services/EnrollmentService.php:207-217`
  - Critério de pronto: enturmação com data anterior à data de matrícula e com data anterior à última saída são recusadas, com teste para cada caso
  - Confiança: 🟢

- [ ] T-08, Implementar a validação de enturmação duplicada na mesma turma
  - Origem no legado: `app/Services/EnrollmentService.php:225-232`
  - Critério de pronto: segunda enturmação ativa na mesma turma é recusada, com teste de idempotência
  - Confiança: 🟢

- [ ] T-09, Implementar a verificação de conflito de horário, com interseção de dias da semana, sobreposição de ano letivo e sobreposição de horários
  - Origem no legado: `app/Services/SchoolClass/AvailableTimeService.php:32-68` e `:102-198`
  - Critério de pronto: enturmações sobrepostas são recusadas, com teste para turno integral, turno parcial e turmas sem dias de semana
  - Confiança: 🟢

- [ ] T-10, Implementar a exceção de AEE na verificação de conflito de horário
  - Origem no legado: `app/Services/SchoolClass/AvailableTimeService.php:102-111` e `:207-225`
  - Critério de pronto: a combinação de escolarização com AEE é sempre permitida, e as demais combinações de tipo de atendimento seguem a regra geral
  - Confiança: 🟢

- [ ] T-11, Implementar o cálculo do sequencial de fechamento com ordenação alfabética sem acento e em maiúsculas
  - Origem no legado: `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:228-267`
  - Critério de pronto: a posição do novo aluno corresponde à ordem alfabética do nome normalizado, com teste de nome com acento
  - Confiança: 🟢

- [ ] T-12, Implementar o cálculo do sequencial de fechamento com as regras de data de fechamento, data base de transferência e data base de remanejamento
  - Origem no legado: `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:42-80` e `:299-336`
  - Critério de pronto: enturmação posterior a qualquer das três datas recebe o maior sequencial mais um, com teste para cada uma das três datas
  - Confiança: 🟢

- [ ] T-13, Implementar o cálculo do sequencial de fechamento da matrícula de dependência, com deslocamento dos sequenciais posteriores
  - Origem no legado: `ieducar/intranet/include/services/matricula/SequencialEnturmacao.php:51-57` e `:141-226`
  - Critério de pronto: a matrícula de dependência recebe posição própria e os sequenciais posteriores são deslocados em um
  - Confiança: 🟢

- [ ] T-14, Implementar a composição anual da data base de remanejamento, com ajuste para 29 de fevereiro em ano bissexto
  - Origem no legado: `app/Services/RelocationDate/RelocationDateService.php:16-35`
  - Critério de pronto: a data base usa o ano da enturmação e o dia 29 de fevereiro é ajustado para o dia 28 em ano bissexto
  - Confiança: 🟢

- [ ] T-15, Implementar o cancelamento da enturmação com validação de data e reordenação condicional da turma de origem
  - Origem no legado: `app/Services/EnrollmentService.php:131-177`
  - Critério de pronto: cancelamento com data inválida é recusado, e a reordenação ocorre apenas antes da data base de remanejamento
  - Confiança: 🟢

- [ ] T-16, Implementar a renumeração da turma de origem, com atribuição de 9999 à enturmação que saiu
  - Origem no legado: `app/Services/EnrollmentService.php:374-392`
  - Critério de pronto: as chamadas da turma ficam contíguas a partir de 1 e a enturmação cancelada recebe 9999
  - Confiança: 🟢

- [ ] T-17, Implementar o remanejamento entre turmas, preservando a matrícula e marcando a enturmação anterior
  - Origem no legado: `app/Http/Controllers/EnrollmentController.php:146-199`
  - Critério de pronto: a matrícula permanece ativa, a enturmação anterior é marcada e a nova enturmação é criada, tudo em transação
  - Confiança: 🟢

- [ ] T-18, Implementar o marcador de remanejamento na mesma turma, distinto do remanejamento entre turmas
  - Origem no legado: `app/Http/Controllers/EnrollmentController.php:172-178`
  - Critério de pronto: o remanejamento para a mesma turma grava o marcador específico, com teste que distingue os dois casos
  - Confiança: 🟢

- [ ] T-19, Implementar a alteração da situação da matrícula com a ação associada a cada situação
  - Origem no legado: `app/Services/RegistrationService.php:99-131`
  - Critério de pronto: transferido cria a solicitação, e abandono, reclassificado e falecido marcam as enturmações correspondentes
  - Confiança: 🟢

- [ ] T-20, Implementar a reativação da enturmação e a limpeza da data de cancelamento na volta a uma situação de continuidade
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:722-744`
  - Critério de pronto: a enturmação de maior sequencial é reativada, os marcadores de encerramento são limpos e a data de cancelamento é nula
  - Confiança: 🟢

- [ ] T-21, Implementar a propagação da situação de falecimento para a pessoa física
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:756-794`
  - Critério de pronto: a pessoa é marcada como falecida quando alguma matrícula está com a situação de falecido, e o marcador é removido quando nenhuma está
  - Confiança: 🟢

- [ ] T-22, Implementar o desfeito do abandono, com reativação da enturmação, refazimento da promoção e retorno da busca ativa
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:520-585`
  - Critério de pronto: a matrícula volta para cursando, a enturmação é reativada e a busca ativa volta ao estado em andamento, com teste para os três efeitos
  - Confiança: 🟢

- [ ] T-23, Implementar o desfeito da reclassificação e o desfeito da saída da escola
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:587-518`
  - Critério de pronto: todas as enturmações da matrícula são reativadas, a matrícula volta para cursando e o indicador de saída é limpo
  - Confiança: 🟢

- [ ] T-24, Implementar a alteração da data de entrada e da data de saída da matrícula, com validação de formato e transação
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:605-666` e `app/Services/EnrollmentService.php:425-442`
  - Critério de pronto: data inválida é recusada sem alterar a matrícula, e a data de saída atualiza a matrícula e a última enturmação
  - Confiança: 🟢

- [ ] T-25, Implementar a busca de matrículas elegíveis para a enturmação em lote, com tratamento de turma multisseriada
  - Origem no legado: `app/Services/RegistrationService.php:47-79`
  - Critério de pronto: a listagem considera todas as séries da turma multisseriada e exclui quem já tem enturmação ativa na escola
  - Confiança: 🟢

- [ ] T-26, Implementar a enturmação e a desenturmação em lote, com resultado individual por aluno
  - Origem no legado: `app/Http/Controllers/BatchEnrollmentController.php:99-174`
  - Critério de pronto: cada matrícula é processada em bloco próprio e o resultado traz sucesso e falha indexados por identificador
  - Confiança: 🟢

- [ ] T-27, Implementar o cancelamento de matrícula em lote, com reordenação adiada e executada uma vez por turma
  - Origem no legado: `app/Http/Controllers/BatchEnrollmentController.php:221-270` e `app/Services/RegistrationService.php:339-358`
  - Critério de pronto: a reordenação ocorre uma única vez por turma ao final, e as matrículas de outras turmas não são alcançadas
  - Confiança: 🟢

- [ ] T-28, Implementar o cancelamento da matrícula, com desativação das enturmações, reflagra da última matrícula da série e reativação da transferência
  - Origem no legado: `app/Services/RegistrationService.php:305-326` e `:368-457`
  - Critério de pronto: a matrícula anterior da série passa a ser a última, a solicitação de transferência é reativada e a matrícula é desativada
  - Confiança: 🟢

- [ ] T-29, Implementar a consulta da movimentação de enturmação, com união de ativas e excluídas e filtro por instante de atualização
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:364-495`
  - Critério de pronto: a resposta traz matrícula, turma, sequencial, datas, turno e série, ordenada por instante de atualização
  - Confiança: 🟢

- [ ] T-30, Implementar o sinalizador de apresentação fora da data base de transferência e de remanejamento
  - Origem no legado: `ieducar/modules/Api/Views/MatriculaController.php:400-409`
  - Critério de pronto: a linha é marcada quando a matrícula foi transferida ou remanejada após a data base da instituição
  - Confiança: 🟢

- [ ] T-31, Implementar a manutenção da carga horária integralizada e da matrícula INEP da enturmação
  - Origem no legado: `app/Http/Controllers/EnrollmentInepController.php:25-46`
  - Critério de pronto: a carga só é gravada quando a turma a permite e o valor é numérico entre 0 e 9999, e a matrícula INEP só é gravada com valor numérico
  - Confiança: 🟢

- [ ] T-32, Implementar a trava de troca de situação por matrícula
  - Origem no legado: `app/Models/LegacyRegistration.php:109-112`
  - Critério de pronto: a alteração de situação é recusada quando a matrícula está travada, com teste de recusa e de liberação
  - Confiança: 🟢

- [ ] T-33, Implementar a autorização de acesso à turma para usuário de nível escola, em todas as operações em lote
  - Origem no legado: `app/Http/Controllers/BatchEnrollmentController.php:275-288`
  - Critério de pronto: a operação em lote é recusada com 403 quando a turma não pertence às escolas do usuário
  - Confiança: 🟢

- [ ] T-34, Implementar a API do módulo com as rotas de matrícula, enturmação, remanejamento, em lote, histórico e dados de Censo
  - Origem no legado: `routes/web.php:46-96` e `ieducar/modules/Api/Views/MatriculaController.php:1010-1049`
  - Critério de pronto: contrato OpenAPI gerado, com paginação e filtro por tenant em todas as listagens
  - Confiança: 🟡

- [ ] T-35, Implementar o contrato TypeScript da unit no pacote `@sysgov/sdk`
  - Origem no legado: `app/Models/RegistrationStatus.php:8-60` e `app/Models/LegacyEnrollment.php:48-71`
  - Critério de pronto: tipos `Registration`, `Enrollment`, `TransferRequest` e `RegistrationStatus` publicados e consumidos por um cliente de teste
  - Confiança: 🟡

- [ ] T-36, Implementar a trilha de auditoria das transições de situação, com ator, instante, situação anterior e situação posterior
  - Origem no legado: ausência de auditoria no legado, evidenciada por `app/Services/RegistrationService.php:86-94`
  - Critério de pronto: toda alteração de situação gera registro de auditoria consultável por tenant e por matrícula
  - Confiança: 🟡

- [ ] T-37, Implementar a verificação de capacidade máxima e de superlotação da turma
  - Origem no legado: ausência de verificação no legado, evidenciada por `app/Services/EnrollmentService.php:193-195`
  - Critério de pronto: a alocação que excede a capacidade é recusada, e o relatório classifica a faixa regular, de limite e de superlotação
  - Confiança: 🟡

- [ ] T-38, Implementar a portabilidade de notas, faltas e pareceres na transferência entre turmas da mesma rede
  - Origem no legado: ausência de portabilidade no legado, evidenciada por `app/Services/RegistrationService.php:104-115`
  - Critério de pronto: as notas e faltas lançadas até a data da transferência são clonadas para a matrícula destino, com teste de contagem
  - Confiança: 🟡

- [ ] T-39, Implementar a equivalência curricular e a adaptação curricular obrigatória na transferência entre estruturas divergentes
  - Origem no legado: ausência de equivalência no legado, evidenciada por `app/Services/RegistrationService.php:184-195`
  - Critério de pronto: a comparação das matrizes curriculares é feita e, em caso de divergência, a tela de equivalência é aberta para o coordenador pedagógico
  - Confiança: 🟡

---

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do fluxo principal de enturmação (ver `requirements.md`, Critérios de Aceitação)
- [ ] TT-02, Teste do caso de erro principal: enturmação em turma sem vaga é recusada
- [ ] TT-03, Teste da recusa de enturmação com data anterior à data de matrícula e com data anterior à última saída
- [ ] TT-04, Teste da recusa de enturmação duplicada na mesma turma
- [ ] TT-05, Teste da recusa de enturmação por conflito de horário, e da liberação na combinação de escolarização com AEE
- [ ] TT-06, Teste da ordenação alfabética da chamada, com nome acentuado e com nome igual
- [ ] TT-07, Teste da enturmação ao final da lista, após data de fechamento, data base de transferência e data base de remanejamento
- [ ] TT-08, Teste da reordenação da turma após cancelamento, e da não reordenação após a data base
- [ ] TT-09, Teste do remanejamento entre turmas e do remanejamento na mesma turma
- [ ] TT-10, Teste das transições de situação, com efeito sobre enturmações e sobre a nota do aluno
- [ ] TT-11, Teste do desfeito do abandono, do desfeito da reclassificação e do desfeito da saída da escola
- [ ] TT-12, Teste do cancelamento de matrícula, com reflagra da última matrícula da série de origem
- [ ] TT-13, Teste da idempotência da reordenação em lote, com uma única reordenação por turma
- [ ] TT-14, Teste da rejeição de cancelamento em lote de matrícula de outra turma
- [ ] TT-15, Teste de isolamento por tenant em todas as listagens, vínculos e operações em lote
- [ ] TT-16, Teste da rejeição de consulta de turma fora das escolas do usuário de nível escola
- [ ] TT-17, Teste da composição da data base de remanejamento em ano bissexto com 29 de fevereiro
- [ ] TT-18, Teste da atualização da data de saída com violação da regra de alteração
- [ ] TT-19, Teste da gravação da carga horária integralizada quando a turma não a permite

---

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Migrar as matrículas de `pmieducar.matricula` para `educa_registrations`, preservando a situação, as datas e a indicação de última matrícula
- [ ] TM-02, Migrar as enturmações de `pmieducar.matricula_turma` para `educa_enrollments`, preservando os dois sequenciais e os marcadores de encerramento
- [ ] TM-03, Migrar as enturmações de `pmieducar.matricula_turma_excluidos` para o histórico de enturmações, com a data de exclusão preservada
- [ ] TM-04, Migrar as solicitações de transferência de `pmieducar.transferencia_solicitacao` para `educa_transfer_requests`, com o tipo e a observação
- [ ] TM-05, Migrar os catálogos de `pmieducar.transferencia_tipo` e `pmieducar.abandono_tipo` para as tabelas de domínio do modelo novo
- [ ] TM-06, Migrar a matrícula INEP de `app/Models/EnrollmentInep.php` para o repositório de códigos INEP, vinculado à enturmação
- [ ] TM-07, Migrar os parâmetros institucionais de data base de remanejamento, data base de transferência e data de fechamento para a configuração por tenant
- [ ] TM-08, Gerar o relatório de divergências da carga, com o total de registros marcados por tipo de inconsistência
- [ ] TM-09, Recalcular os sequenciais de fechamento das turmas após a carga, com teste de conferência contra a ordem alfabética

---

## Ordem Sugerida

1. T-04, T-01, T-02 e T-03 primeiro, porque definem o esquema e o catálogo sobre os quais todas as regras operam.
2. T-05, T-06, T-07, T-08 e T-09 em seguida, porque são as validações de entrada da enturmação e precisam do esquema pronto.
3. T-10 logo após T-09, porque a exceção de AEE altera o resultado da verificação de conflito.
4. T-11, T-12, T-13 e T-14 depois, porque determinam a posição de chamada e dependem das datas base configuradas.
5. T-15, T-16, T-17 e T-18 depois do sequenciamento, porque o cancelamento e o remanejamento reordenam a chamada.
6. T-19, T-20, T-21, T-22 e T-23 em seguida, porque as transições de situação alteram as enturmações e a nota do aluno.
7. T-24, T-25, T-26, T-27 e T-28 depois, porque as operações de data e de lote operam sobre as entidades já modeladas.
8. T-29, T-30, T-31 e T-32 por último entre as de domínio, porque expõem o que já está validado.
9. T-33, T-34, T-35 e T-36 em seguida, porque adicionam autorização, contrato e auditoria sobre o restante.
10. T-37, T-38 e T-39 no fim, porque são requisitos novos, ausentes no legado, e não devem bloquear a reimplementação do comportamento existente.
11. TM-01 a TM-09 somente depois de T-34 estar em ambiente de homologação, para que a carga possa ser conferida pela API nova.
12. Bloqueios: T-10 depende de T-09; T-11, T-12 e T-13 dependem de T-14; T-15 depende de T-16 e de T-14; T-17 depende de T-15 e de T-08; T-19 depende de T-03; T-25 depende de T-01; T-28 depende de T-03; T-37 depende de T-01 e de T-02; T-38 e T-39 dependem de T-19 e do módulo de avaliação.

---

## Lacunas Pendentes (🔴)

- O serviço de sequenciamento interpola identificadores e datas diretamente no SQL, e a API de matrícula concatena o filtro de escola na consulta. Antes de migrar, é preciso decidir a estratégia de parametrização no modelo novo e verificar se a carga histórica contida nesses valores é confiável.
- A capacidade máxima da turma não existe no legado, e o bloqueio por vaga depende de um campo externo à turma. É preciso definir onde a capacidade é mantida e se o bloqueio deve ser informativo desde o primeiro dia.
- A portabilidade de notas, faltas e pareceres na transferência não existe no legado, embora o desenho do modelo novo a descreva. É preciso confirmar com a pedagogia se a cópia é automática ou exige conferência do coordenador.
- A equivalência curricular entre turmas com estruturas diferentes não existe no legado. É preciso definir a regra de adaptação curricular obrigatória e quem a valida.
- O catálogo de situações está duplicado em `app/Models/RegistrationStatus.php` e `ieducar/lib/App_Model/MatriculaSituacao.php`, com rótulos divergentes no valor 2. É preciso decidir o rótulo oficial e o processo de convergência.
- A situação da matrícula e os marcadores da enturmação podem divergir, porque são gravados por rotinas distintas. É preciso definir a fonte de verdade no modelo novo e a regra de reconciliação na carga.
- O cancelamento em lote de enturmação não exige a autorização de acesso à turma, ao contrário do cancelamento de matrícula. É preciso confirmar se essa diferença é intencional.
- Não há histórico das transições de situação nem auditoria das operações de enturmação. É preciso decidir o que é retido, por quem e por quanto tempo.
- A ordenação alfabética da chamada depende do nome da pessoa, e não de um identificador estável. É preciso definir a chave de ordenação no modelo novo, considerando a correção de nome e a ordenação de sobrenome.
- A carga horária integralizada é validada apenas por faixa numérica, sem coerência com a carga horária da turma. É preciso definir a regra de coerência.
- O sequencial de fechamento é recalculado por atualização massiva a cada enturmação. É preciso decidir se o modelo novo mantém esse comportamento ou adota ordenação materializada, e qual o custo aceitável em turmas grandes.
