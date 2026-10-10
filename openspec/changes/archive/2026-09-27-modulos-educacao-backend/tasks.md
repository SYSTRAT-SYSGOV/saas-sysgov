# Tasks

> Convenções: cada tarefa cita a spec (`spec: <capacidade> › <requisito>`) e a decisão do design (`D<n>`).
> A API só roda no Docker (PHP 8.4): testes com `../sysgov.sh testes --filter <Nome>` (SQLite em memória) a partir
> da raiz `systema/`. Commit ao fim de cada grupo, com Conventional Commits.

## 1. Módulo Escola — estrutura e cadastros base

- [x] 1.1 Gerar o módulo com `php artisan make:module Escola` no container; declarar em `module.json` título, ícone, menu, `requires: ["Admin"]` e as permissões `escola.view`, `escola.alunos.manage`, `escola.estrutura.manage` (spec: escola › Permissões e perfis; D2, D11); verificar que o teste de isolamento gerado passa e que `git diff --stat` só aponta `Modules/Escola`
- [x] 1.2 Criar `EscolaRbacSeeder` com os perfis Direção e Secretaria/Pedagogia e incluí-lo em `apps/api/docker-entrypoint.sh` (spec: escola › Permissões e perfis; D11); verificar com teste de que a Secretaria recebe 403 ao criar matéria e com `./sysgov.sh logs api` mostrando o seeder no boot
- [x] 1.3 Migrations, models `TenantAware` + soft delete, Enums e Resources de unidade, turnos, turmas, alunos, contatos, matérias, vínculo turma × matéria × professor, trimestres e categorias (D3, D4, D5); verificar com `php artisan migrate` no container e teste de estrutura listando as tabelas e os índices iniciados por `tenant_id`
- [x] 1.4 Criar o trait de erro de negócio do módulo e o `Routes/api.php` com os middlewares padrão (D12); verificar com `php artisan route:list --path=escola` e teste de 403 `MODULE_ACCESS_DENIED` com o módulo desabilitado

## 2. Módulo Escola — regras e endpoints

- [x] 2.1 Unidade (nome e logo em disco privado, MIME real, 2 MB) e rota autenticada do arquivo (spec: escola › Configuração da unidade; D8); verificar com teste que rejeita PDF renomeado para `.png` e que outro tenant recebe 404 no arquivo
- [x] 2.2 Turnos padrão e CRUD de turmas com unicidade por turno/ano, exclusão lógica que deixa alunos sem turma e duplicação com vínculos (spec: escola › Turnos e turmas, Duplicação de turma; D4, D10); verificar com testes de turma duplicada, exclusão com alunos e duplicação com 7 matérias
- [x] 2.3 CRUD de alunos com contatos, busca por nome/mãe/pai/turma, filtro, ordenação e paginação (spec: escola › Alunos e contatos); verificar com testes de CGM repetido, busca pelo nome da mãe e isolamento A/B
- [x] 2.4 Remanejamento com turma de origem e próximo número livre (spec: escola › Remanejamento de aluno); verificar com testes de destino igual à origem (422) e número 33 após 32
- [x] 2.5 Exclusão de um aluno, de vários e limpeza de turma com confirmação `EXCLUIR` (spec: escola › Exclusão de alunos); verificar com teste de limpeza sem confirmação (nada excluído) e com confirmação (todos soft-deleted)
- [x] 2.6 Importação de alunos por CSV com relatório por linha (spec: escola › Importação de alunos por CSV; D9); verificar com testes de turma inexistente, BOM + separador `,` e reimportação idempotente
- [x] 2.7 Matérias com `nome_normalizado`, vínculo turma × matéria × professor (professor precisa ser usuário do tenant), turmas por matéria, exportação e importação CSV (spec: escola › Matérias e vínculo, Importação e exportação de matérias; D5, D6); verificar com testes de "matematica" x "Matemática", professor de outro tenant e reimportação do arquivo exportado
- [x] 2.8 Trimestres com situação calculada e categorias com padrões por tenant e cor hexadecimal (spec: escola › Trimestres letivos, Categorias de ocorrência; D10); verificar com testes de trimestre repetido, situação `em_andamento` com data congelada (`Carbon::setTestNow`) e cor inválida
- [x] 2.9 Auditoria e outbox em todas as mutações do módulo (spec: escola › Auditoria do cadastro escolar; D12); verificar com teste de alteração de turma do aluno gerando `audit_logs` (antes/depois) e evento `escola.aluno.atualizado`
- [x] 2.10 Documentar os endpoints em `docs/modules/escola.md`; verificar que cada rota de `route:list --path=escola` aparece no documento

## 3. Módulo Pedagógico

- [x] 3.1 Gerar `Pedagogico` com `make:module` (`requires: ["Admin", "Escola"]`), permissões, `PedagogicoRbacSeeder` (Direção, Pedagogia, Professor) e entrada no `docker-entrypoint.sh` (spec: pedagogico › Permissões e perfis; D1, D2, D11); verificar com teste de estrutura (dependência declarada) e 403 da Pedagogia ao lançar nota
- [x] 3.2 Migrations, models, Enums e Resources de notas, ocorrências, pré-conselhos (+ alunos avaliados), cronogramas, atas e frequências (D3, D4); verificar com migrate no container e teste de estrutura das tabelas
- [x] 3.3 Escopo do professor nas Policies e Services, com endpoint "minhas turmas" (spec: pedagogico › Escopo do professor; D6); verificar com testes de 403 em turma não vinculada e listagem só das turmas vinculadas
- [x] 3.4 Notas: lançamento unitário e em lote (substituição), escala 0–10 com uma casa, recuperação e importação CSV (spec: pedagogico › Notas trimestrais; D9); verificar com testes de 10,5 rejeitado, relançamento 6,0 → 7,5 e linha de CSV com aluno inexistente
- [x] 3.5 Ocorrências com categoria do Escola, severidade, anexo privado e total por aluno (spec: pedagogico › Ocorrências; D8); verificar com testes de categoria excluída preservada e anexo com MIME inválido
- [x] 3.6 Fichas de pré-conselho com upsert por turma × matéria × período × ano, alunos por id e progresso por turma (spec: pedagogico › Fichas de pré-conselho, Progresso do pré-conselho por turma); verificar com testes de upsert, textos no aluno certo com transferido no meio e progresso 2 de 7
- [x] 3.7 Cronograma com validação de ano, situação e período vigente (spec: pedagogico › Cronograma do pré-conselho); verificar com testes de data fora do ano e vigente = mais próximo em 27/09/2026
- [x] 3.8 Atas com estados e bloqueio de edição após finalizada; frequência diária sem datas futuras (spec: pedagogico › Atas do conselho de classe, Frequência diária); verificar com testes de edição de ata finalizada (422) e chamada de amanhã (422)
- [x] 3.9 Auditoria/outbox, teste de isolamento A/B de notas e ocorrências e documentação em `docs/modules/pedagogico.md` (spec: pedagogico › Dependência e isolamento, Auditoria; D12); verificar com testes e conferência das rotas documentadas

## 4. Módulo Formatura

- [x] 4.1 Substituir o diretório atual por `make:module Formatura` (`requires: ["Admin", "Escola"]`), reaplicando título/ícone/menu do `module.json` antigo, permissões e `FormaturaRbacSeeder` (Comissão, Tesouraria) no `docker-entrypoint.sh` (spec: formatura › Permissões e perfis; D2, D11); verificar teste de estrutura e 403 da Tesouraria ao alterar valores
- [x] 4.2 Migrations, models, Enums e Resources de configuração, participações e pagamentos, tudo em centavos (spec: formatura › Valores monetários em centavos; D3, D7); verificar teste que rejeita `150.5` e estrutura das colunas `*_centavos`
- [x] 4.3 `CalculadoraValorDevido` pura com os dois tipos de cálculo e não participante = 0 (spec: formatura › Participação dos formandos; D7); verificar com testes de unidade dos exemplos 60000 e 74000
- [x] 4.4 Configuração por ano, participações e pagamentos com validação de parcela e forma aceita (spec: formatura › Configuração da formatura, Pagamentos); verificar com testes de 30 parcelas e forma Boleto não aceita
- [x] 4.5 Situação por formando e relatório financeiro agregado no servidor (spec: formatura › Situação financeira do formando, Relatório financeiro); verificar com testes de parcial 20000/60000 e totais por forma somando 30000
- [x] 4.6 Auditoria/outbox, isolamento A/B e documentação em `docs/modules/formatura.md` (spec: formatura › Auditoria, Dependência e isolamento); verificar com testes e rotas documentadas

## 5. Módulo Passeio

- [x] 5.1 Substituir o diretório atual por `make:module Passeio` (`requires: ["Admin", "Escola"]`), reaplicando título/ícone/menu, permissões e `PasseioRbacSeeder` (Coordenação, Apoio) no `docker-entrypoint.sh` (spec: passeio › Permissões e perfis; D2, D11); verificar teste de estrutura e 403 do Apoio
- [x] 5.2 Migrations, models, Enums e Resources de passeios, inscrições, veículos e assentos, com índices únicos de assento e de aluno por passeio (D3, D4); verificar migrate e teste de estrutura dos índices
- [x] 5.3 Passeios com validação de prazo das autorizações e bloqueio de inscrição em concluído/cancelado (spec: passeio › Cadastro de passeios); verificar com testes dos dois cenários
- [x] 5.4 Inscrições individuais e da turma inteira sem duplicar, e indicadores (spec: passeio › Inscrições e autorizações, Indicadores do passeio); verificar com testes de 25 novas inscrições de 30 e arrecadado 30000 / pendente 20000
- [x] 5.5 Veículos com capacidade ≥ ocupação e mapa de assentos com unicidade de assento e de aluno (spec: passeio › Veículos, Mapa de assentos); verificar com testes de capacidade 30 < 40 ocupados, assento ocupado e aluno em dois veículos
- [x] 5.6 Auditoria/outbox, isolamento A/B e documentação em `docs/modules/passeio.md` (spec: passeio › Auditoria, Dependência e isolamento); verificar com testes e rotas documentadas

## 6. Integração

- [x] 6.1 Recriar o ambiente do zero com `./sysgov.sh resetar-banco` + `./sysgov.sh iniciar` e verificar no log que os quatro módulos são registrados e os seeders RBAC rodam sem erro
  - Nota (27/09/2026): o banco permanente já tinha dados do usuário (2 tenants, 4 usuários), então o reset não foi feito nele. A instalação do zero foi validada num banco temporário (`sysgov_verificacao`): boot completo sem erros, 23 tabelas novas, 4 módulos registrados e 4 seeders de perfis; o banco temporário foi apagado em seguida.
- [x] 6.2 Regenerar `apps/web-client/src/config/moduleRegistry.generated.ts` com `npm run generate:registry` (D13); verificar com `npm run typecheck` no web-client e que `pedagogico`, `formatura` e `passeio` continuam apontando para os componentes atuais
- [x] 6.3 Rodar a suíte completa (`./sysgov.sh testes`) e PHPStan nível 6 nos quatro módulos; verificar zero falhas e zero erros novos
  - Nota: suíte completa 766/766 (3156 asserções); PHPStan nível 6 sem erros nos quatro módulos. O `./sysgov.sh testes` passou a aplicar o ambiente do phpunit.xml (APP_ENV=testing etc.) e 2 GB de memória — com 128 MB a suíte completa morria por volta do 66º teste, também sem os módulos novos.
