# Tasks

> Convenções: cada tarefa cita a spec (`spec: <capacidade> › <requisito>`) e a decisão do design (`D<n>`).
> Frontend verificado com `npx tsc --noEmit -p apps/web-client` e teste manual no navegador (usuário
> `admin@sgfiscal.com.br`, tenant SYSTRAT); backend com `./sysgov.sh testes <caminho>`. Commit por grupo.

## 1. Backend e habilitação

- [x] 1.1 Migration aditiva: `texto_introducao`, `texto_conclusao`, `assinaturas` em `pedagogico_atas` e `responsavel` em `pedagogico_ocorrencias`; model, request, service e docs atualizados (spec: pedagogico › Atas do conselho de classe, Ocorrências; D7); verificar com testes de rascunho com assinaturas, assinatura inválida (422), edição bloqueada após finalizar e responsável gravado
- [x] 1.2 Incluir `escola.view` nos perfis de Pedagógico, Formatura e Passeio (spec: escola › Leitura do cadastro pelos módulos dependentes; D8); verificar com testes de Professor e Tesouraria lendo matérias/alunos (200) e recebendo 403 ao escrever
- [x] 1.3 Habilitar o módulo Escola nos tenants SYSTRAT e RicardoPrefeito pela API de administração (D8); verificar consultando `tenant_module` e o menu retornado no login

## 2. Base comum do frontend

- [x] 2.1 `modules/escola/api.ts`, `modules/pedagogico/api.ts`, `modules/formatura/api.ts`, `modules/passeio/api.ts` com tipos da API, helpers e `erroApi` (D1); verificar com typecheck
- [x] 2.2 Hook `useArquivoAutenticado` para foto, logo e anexos (D4); verificar no navegador exibindo o logo da unidade e a foto de um aluno

## 3. Cadastro Escolar (tela própria)

- [x] 3.1 Mover `pedagogico/components/admin` para `modules/escola`, criar `EscolaModule.tsx`, apontar a aba "Administração" do Pedagógico para lá e regenerar o registry (spec: escola › Tela do Cadastro Escolar; D6); verificar que o menu "Cadastro Escolar" abre o painel
- [x] 3.2 Ligar as abas Alunos, Turmas, Matérias, Categorias, Trimestres e Sistema à API do Escola (adaptadores D2), incluindo importações CSV, foto, logo e exportação; remover o backup JSON do navegador em favor do `./sysgov.sh backup` (spec: escola › Tela do Cadastro Escolar); verificar no navegador: criar aluno/turma/matéria, recarregar a página e ver os dados persistidos

## 4. Pedagógico

- [x] 4.1 `pedagogicoService` vira fachada com cache e mutações assíncronas sobre `api.ts` (D2, D3); módulo raiz carrega os dados ao abrir, com estado de carregamento e erro; verificar com typecheck
- [x] 4.2 Painel, Notas (lançamento por trimestre via `PUT /pedagogico/notas`, média calculada a partir das notas) e Frequência diária ligados à API, com as ampliações aditivas `aulas`, consulta por período, `GET /frequencias/totais` e `GET /notas/medias` e seus testes (spec: pedagogico › Telas do módulo persistem no servidor, Frequência diária, Média anual por aluno; D9); verificar no navegador lançando notas e chamada, recarregando e conferindo
- [x] 4.3 Ocorrências (aba e ficha do aluno) com categorias do cadastro, responsável, anexo real e "Relatório Individual" (spec: pedagogico › Ocorrências; D7); verificar no navegador registrando, editando e excluindo
- [x] 4.4 Pré-conselho e Conselho & Atas (ficha, progresso, cronograma, ata com textos e assinaturas no servidor, finalizar/arquivar) sem `localStorage` (spec: pedagogico › Atas do conselho de classe; D7); verificar no navegador salvando rascunho, recarregando e finalizando
- [x] 4.5 Aba Alunos (fluxo turno → turma → ficha) e Corpo Docente com usuários + vínculos e atalho para Usuários e Acessos (spec: pedagogico › Corpo docente a partir dos usuários do órgão; D5); verificar vinculando um professor a uma turma × matéria
- [x] 4.6 Conferir que nenhum dado de negócio do Pedagógico usa `localStorage` (`grep`) e remover os dados de exemplo do serviço antigo

## 5. Formatura

- [x] 5.1 Migration aditiva `turmas_ids` em `formatura_configuracoes`; `PUT /configuracao` valida turmas do tenant e do ano; formandos, pagamentos e relatório só das turmas formandas; 422 para aluno fora delas (spec: formatura › Configuração da formatura, Participação dos formandos; D10); verificar com testes de turma de outro ano/tenant (422), filtro por turma formanda e participação/pagamento de aluno fora delas (422)
- [x] 5.2 `PUT /formandos/participacao-em-lote` em transação com auditoria (spec: formatura › Participação dos formandos; D11); verificar com testes marcando e desmarcando uma turma, outras turmas intactas e Tesouraria recebendo 403
- [x] 5.3 `GET /pagamentos` do ano com período, nome e turma; `GET /relatorio` com `data_inicio`/`data_fim` e `resumo.recebido_periodo_centavos` (spec: formatura › Pagamentos, Relatório financeiro; D12, D13); verificar com testes de período, estornados fora, isolamento por tenant e situação inalterada pelo período
- [x] 5.4 `telefone` na linha do formando e no `PUT /formandos/{aluno}`, gravado por `AlunoService::definirTelefonePrincipal` do Escola (spec: formatura › Telefone do formando mantido no cadastro escolar; D14); verificar com testes preservando o segundo contato, criando o primeiro, removendo com vazio, auditoria no Escola e Tesouraria 403
- [x] 5.5 Atualizar `docs/modules/formatura.md`; rodar `./sysgov.sh testes Modules/Formatura`, `Modules/Escola` e PHPStan dos dois módulos; commit do backend
- [x] 5.6 `Tabs` em `packages/ui` (Radix + CVA, conforme README do pacote) exportado no `index.ts` (D15); verificar com typecheck e teste do pacote
- [x] 5.7 `api.ts` com as rotas novas, `services/adaptadores.ts` (centavos ↔ reais, formas, situação, chaves Pix) e `formaturaService` como fachada da API sem `SharedEscolaService` nem dados simulados (spec: formatura › Telas da Formatura persistem no servidor; D2, D3); verificar com typecheck
- [x] 5.8 Módulo raiz com seletor de ano letivo, estados de carregamento/erro/sem configuração/sem turmas formandas, abas em `Tabs` e Painel a partir do `resumo` (D15); verificar no navegador trocando o ano e vendo o aviso de configuração
- [x] 5.9 Configuração (turmas formandas com `Switch`) e Formandos & Fichas (participa, lote por turma, retirar da formatura, convidados, observações, telefone e WhatsApp) em `@sysgov/ui` (spec: formatura › Participação dos formandos, Telefone do formando; D10, D11, D14, D15); verificar no navegador marcando uma turma inteira e alterando um telefone que aparece no Cadastro Escolar
- [x] 5.10 Pagamentos (lista do ano, filtro de datas, registro e estorno com `Modal`) e Relatórios (turma na tela, período na API, recebido no período, impressão) em `@sysgov/ui` (spec: formatura › Pagamentos, Relatório financeiro; D12, D13, D15); verificar no navegador registrando R$ 150,50 (`15050` na requisição), conferindo lista, relatório e período, e estornando
- [x] 5.11 Relação de Alunos e Turmas como consulta das turmas formandas com atalho "Abrir Cadastro Escolar", removendo criar/editar/excluir, CSV e "limpar base"; botões de escrita ocultos por `useCan` (spec: formatura › Telas da Formatura persistem no servidor; D15); verificar no navegador com usuário Tesouraria
- [x] 5.12 `grep` sem `SharedEscolaService`, dados simulados, `alert(`/`confirm(` nativos no módulo; typecheck e `npm test`; commit do frontend

## 5B. Ajustes da Formatura e equipe gestora

- [x] 5B.1 Um só número de convidados: fórmulas, migration de dados e requests (D16); verificar com testes das fórmulas e da conversão
- [x] 5B.2 Configuração com campos por tipo de cálculo; ficha com prévia do devido e simulação de parcelas; "Participa" abre a ficha; "Somente participantes" ligado por padrão (D16); verificar com vitest e no navegador
- [x] 5B.3 Relação de Alunos com seletor de turma e "Participa"; Turmas com participantes por turma (D16); verificar no navegador
- [x] 5B.4 `escola_equipe` com rotas, auditoria, 1 diretor e isolamento (D17); verificar com testes de permissão, 422 e tenant
- [x] 5B.5 Aba Equipe no Cadastro Escolar, pedagogas no Corpo Docente e ata com a equipe cadastrada e seletor de pedagoga (D17); verificar com vitest e no navegador

## 6. Passeio

- [x] 6.1 Inscrição recusa transferido (422) e a da turma o ignora; `GET .../inscricoes` com `situacao` e `telefone` do Escola (spec: passeio › Inscrição respeita a situação do aluno; D18); verificar com testes de transferido individual, turma com transferido, remanejado pela turma de destino e telefone na lista
- [x] 6.2 `PUT /passeio/passeios/{passeio}/inscricoes/lote` em transação com auditoria (spec: passeio › Inscrição em lote por turma; D18); verificar com testes de marcar/desmarcar, assentos liberados, outras turmas intactas, turma de outro tenant/escola e Apoio 403
- [x] 6.3 Atualizar `docs/modules/passeio.md`; `./sysgov.sh testes Modules/Passeio` e PHPStan do módulo; commit do backend
- [x] 6.4 `api.ts` com as rotas novas, formatação (centavos ↔ reais, datas, status) com testes e hook `usePasseio` com passeio ativo; módulo raiz com `Tabs`, seletor de passeio e estados de carregamento/erro/sem passeios (D19); verificar com typecheck e vitest
- [x] 6.5 Painel e Passeios (lista, busca, status, criar/editar em `Modal`, excluir com confirmação) em `@sysgov/ui` (spec: passeio › Telas do Passeio persistem no servidor; D19); verificar no navegador criando, editando e excluindo um passeio
- [x] 6.6 Inscrições e Termos e Turmas (consulta, lote por turma, atalho "Abrir Cadastro Escolar") com `useCan` (spec: passeio › Telas do Passeio persistem no servidor, Inscrição em lote por turma; D18, D19); verificar no navegador inscrevendo uma turma, marcando termo e pago e desmarcando a turma
- [x] 6.7 Ônibus e Assentos (veículos em `Modal`, mapa clicável) e Relatórios (termo, manifesto por ônibus, demonstrativo) (spec: passeio › Telas do Passeio persistem no servidor; D19, D20); verificar no navegador marcando um assento e abrindo as três impressões
- [x] 6.8 Remover `SharedEscolaService`, `passeioService` antigo e tipos antigos; `grep` sem `localStorage`, `veiga.pro.br`, `alert(`/`confirm(` no módulo; typecheck e `npm test`; commit do frontend

## 7. Integração

- [x] 7.1 Typecheck e testes do web-client (`npm run typecheck`, `npm test` no workspace), suíte da API e PHPStan dos módulos alterados; verificar zero erros
- [x] 7.2 Atualizar `docs/modules/*.md` e o resumo em `docs/modules/reestruturacao-modulos-educacao.md`; verificar que as rotas e campos novos estão documentados
