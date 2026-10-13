# Tasks

> **Convenções:**
> - Cada tarefa cita a spec (`spec: inservivel › <requisito>`) e a decisão do design (`D<n>`).
> - Backend testado no container (`./sysgov.sh testes Modules/Inservivel`, ou phpunit com o ambiente de teste e
>   `APP_CONFIG_CACHE`/`APP_ROUTES_CACHE`).
> - Frontend testado com `npx tsc --noEmit -p apps/web-client` e `vitest`, e conferido no navegador.
> - Um commit por grupo, no branch `feat/inservivel`.

## 1. Fundação do módulo

- [x] 1.1 Apagar os arquivos manuais de `Modules/Inservivel` e rodar `php artisan make:module Inservivel`.
      O `module.json` deve ter `requires: ["Admin", "OrgChart", "Pessoas"]`, as 10 permissões e o menu
      "Inservível & Doações" (`inservivel.acesso`).
      (spec: inservivel › Permissões e perfis; D1)
      Verificar: o teste de isolamento gerado passa e o módulo aparece no catálogo.
- [x] 1.2 Criar o `InservivelRbacSeeder` com os perfis Gestor do Patrimônio, Servidor de Secretaria e Entidade
      (Inservível) e registrá-lo no `docker-entrypoint.sh`.
      (spec: inservivel › Permissões e perfis; D1)
      Verificar: tenant sem o módulo recebe 403.

## 2. Parâmetros, configurações e bens

- [x] 2.1 Migrations e models de categorias, situações (com `papel`) e estados de conservação; enum `PapelSituacao`;
      `SituacaoService::garantirPadroes()`.
      (spec: inservivel › Parâmetros e situações por papel; D2)
      Verificar com testes:
      - padrões idempotentes;
      - renomear situação de sistema;
      - excluir situação com papel ou em uso (422).
- [x] 2.2 Rotas de parâmetros: CRUD das três listas e "substituir em massa", com auditoria.
      (spec: inservivel › Parâmetros e situações por papel; D2)
      Verificar: quantidade de bens alterados e 403 sem `configuracao.manage`.
- [x] 2.3 Criar `inservivel_configuracoes` e o `ConfiguracaoService::vigente()` com os padrões (doador vazio,
      legislação vazia, os 6 documentos do PHP), e as rotas GET/PUT.
      (spec: inservivel › Configurações e importação; D10)
      Verificar: chave de documento imutável.
- [x] 2.4 Criar `LotacaoService::secretariaDoUsuario`.
      (D3)
      Verificar com testes:
      - lotação em setor sobe até a secretaria;
      - sem lotação devolve null.
- [x] 2.5 Migrations `inservivel_bens` (FKs de situação, estado, secretaria e setor; centavos; único
      `tenant_id + numero_patrimonial`) e `inservivel_bem_fotos`; model; `BemPolicy`; controller com listagem,
      filtros, criar, ver e editar, sem exclusão.
      (spec: inservivel › Cadastro de bens; D3, D4)
      Verificar com testes:
      - patrimônio repetido (422);
      - setor fora da secretaria (422);
      - troca manual para `em_lote` (422);
      - filtros.
- [x] 2.6 Fotos do bem: envio, definir principal, remover e servir pelo objeto, em disco privado.
      (spec: inservivel › Cadastro de bens, Arquivos privados; D12)
      Verificar: MIME inválido (422) e foto de bem de outro tenant (404).

## 3. Lotes

- [x] 3.1 Migrations `inservivel_lotes`, `inservivel_lote_bens` e `inservivel_lote_documentos`; model; `LotePolicy`
      por criador ou gestão; `LoteService` (criar com número completado, editar, adicionar e retirar bens com lock,
      transições de status, exclusão com senha).
      (spec: inservivel › Lotes; D4, D5)
      Verificar com testes:
      - bem fora de `inservivel` (422);
      - "007" vira "007/2026";
      - lote alheio para o Servidor (403);
      - lote Publicado não recebe bem;
      - entregar leva os bens a `doado`;
      - baixar leva os bens a `baixado`;
      - senha errada (422);
      - excluir devolve os bens.
- [x] 3.2 Cards da listagem com valor calculado e total de bens; busca de bens aptos; adicionar pelo nº
      patrimonial; anexos do lote servidos pelo objeto.
      (spec: inservivel › Lotes, Arquivos privados; D4, D12)
      Verificar: valor usa o contábil quando o avaliado é zero.

## 4. Entidades, cadastro público e portal

- [x] 4.1 Migrations `inservivel_entidades` (com `user_id`) e `inservivel_entidade_documentos`; model;
      `EntidadePolicy`; validação de CNPJ e CPF.
      (spec: inservivel › Entidades sem fins lucrativos)
      Verificar: CNPJ repetido no tenant (422).
- [x] 4.2 Criar o `CadastroEntidadeService`: usuário, vínculo ao tenant, perfil Entidade, pessoa pelo CPF,
      entidade e documentos, tudo numa transação.
      (spec: inservivel › Cadastro público da entidade; D6)
      Verificar com testes:
      - falha no meio não deixa usuário órfão;
      - e-mail já existente é recusado com mensagem genérica.
- [x] 4.3 Rotas internas de entidades: listagem com filtros, ficha, edição, cadastro pelo Gestor, mudança de status
      com motivo e Outbox, aprovar ou reprovar documento, redefinir senha, excluir com senha e servir documento.
      (spec: inservivel › Entidades sem fins lucrativos, Auditoria e eventos; D12)
      Verificar com testes:
      - reprovar sem motivo (422);
      - evento `EntidadeReprovada` publicado;
      - excluir vencedora (422).
- [x] 4.4 Rotas públicas `api/public/inservivel/{tenantSlug}` (`formulario`, `POST entidades`) com
      `ResolveTenantPublicoInservivel`, throttle e campo isca, mais o teste de arquitetura dos controllers públicos.
      (spec: inservivel › Cadastro público da entidade; D7)
      Verificar com testes:
      - cadastro válido permite login;
      - documento obrigatório faltando (422);
      - isca descarta;
      - slug sem o módulo (404);
      - throttle (429).
- [x] 4.5 Portal `api/inservivel/portal/*` com `EntidadeAtual`: meu cadastro, editar, reenviar documento, lotes
      visíveis, participar e desistir, termos dos lotes ganhos e documentos próprios.
      (spec: inservivel › Portal da entidade, Arquivos privados; D7, D12)
      Verificar com testes:
      - entidade não habilitada participando (403);
      - lote não Publicado (422);
      - termo ou documento de outra entidade (404);
      - Entidade nas rotas internas (403).

- [x] 4.6 Criar o `ValidadeDocumentoService` (bloqueios e alertas de 30 dias), aplicá-lo à inscrição do portal e
      incluir os marcadores na ficha da entidade e nas inscritas do lote.
      (spec: inservivel › Validade dos documentos da entidade; D15)
      Verificar com testes de tempo congelado:
      - participar com documento vencido (422);
      - reenvio com validade futura tira o bloqueio;
      - alerta de vencimento em 10 dias.

## 5. Sorteio e termos

- [x] 5.1 Migrations `inservivel_interesses` (único entidade+lote) e `inservivel_sorteios`; `SorteioService` com as
      três regras, semente, retrato, hash, lock e transação.
      (spec: inservivel › Sorteio equitativo e auditável; D8)
      Verificar com testes:
      - sem inscrições (422);
      - `unica_inscrita`;
      - `menos_lotes`;
      - empate reproduzido pela semente gravada;
      - inscrita bloqueada por documento vencido fica fora e aparece no retrato;
      - todas bloqueadas (422);
      - sortear duas vezes (422);
      - auditoria com regra e semente.
- [x] 5.2 `TermoService` e as views PDF (relatório do sorteio, conferência, entrega, doação com encargo), usando as
      configurações e o white-label do tenant; rotas internas e do portal com autorização.
      (spec: inservivel › Termos do lote; D9)
      Verificar com testes:
      - termo antes do sorteio (422);
      - o PDF contém o doador configurado e não contém "Araucária";
      - falha no PDF desfaz o sorteio.

## 6. Transferência interna e dashboard

- [x] 6.1 Migration `inservivel_transferencias`; `TransferenciaService` (anunciar pela própria secretaria ou como
      Gestor, solicitar, aprovar, recusar com novo anúncio, cancelar) com lock e uma transferência aberta por bem.
      (spec: inservivel › Transferência interna entre secretarias; D3, D11)
      Verificar com testes:
      - pedir bem da própria secretaria (422);
      - usuário sem lotação (422);
      - aprovar move o bem para `disponivel`;
      - Servidor aprovando (403);
      - bem anunciado não entra em lote.
- [x] 6.2 Rotas de vitrine, minhas, solicitações pendentes e termo de transferência em PDF.
      (spec: inservivel › Transferência interna entre secretarias; D9)
- [x] 6.3 Endpoint do dashboard: indicadores, últimos bens com filtros e ações rápidas.
      (spec: inservivel › Dashboard)
      Verificar: entidade Pendente aparece nas ações rápidas e entidade com documento vencido aparece no alerta
      (spec: inservivel › Validade dos documentos da entidade; D15).

## 7. Importação

- [x] 7.1 `ImportacaoBensService` (separador, codificação, apelidos, centavos, casamento com o Organograma,
      pendências) e a rota de importação.
      (spec: inservivel › Configurações e importação; D3, D4, D13)
      Verificar com testes, usando fixtures pequenas baseadas no formato da planilha da SMAD sem dados reais:
      - CSV `;` em ISO-8859-1;
      - centro de custo desconhecido vira pendência;
      - reimportação atualiza;
      - "1.500,46" vira 150046.

## 8. SDK e frontend

- [x] 8.1 Contrato em `apps/web-client/src/modules/inservivel/api.ts` (tipos e chamadas), no padrão do módulo
      Campanha, e registry regenerado offline. O `scripts/generate-module-registry.js` passou a usar a permissão de
      menu do `module.json` (`inservivel.acesso`) em vez de fixar `{alias}.view`; só o Inservível muda.
      (D14)
- [x] 8.2 Shell do módulo com abas por permissão e Dashboard (KPIs, últimos bens, ações rápidas, alerta de
      documentos).
      (spec: inservivel › Dashboard; D14)
- [x] 8.3 Bens: lista com filtros, formulário de criar e editar com Organograma, visualização com galeria e
      envio de fotos.
      (spec: inservivel › Cadastro de bens)
- [x] 8.4 Lotes e Sorteio:
      - cards e criação com busca e seleção de bens;
      - tela do lote com bens, adição por patrimônio, inscritas, Sortear, resultado, documentos, termos e status;
      - exclusão com senha em `Modal`.
      (spec: inservivel › Lotes, Sorteio, Termos)
- [x] 8.5 Entidades: lista com filtros, ficha com documentos, status com motivo, senha e exclusão.
      (spec: inservivel › Entidades sem fins lucrativos)
- [x] 8.6 Transferência Interna (vitrine, anunciar, solicitar, cancelar) e Solicitações (aprovar, recusar, termo).
      (spec: inservivel › Transferência interna entre secretarias)
- [x] 8.7 Parâmetros (três listas e substituir em massa) e Configurações (doador, legislação, documentos, link
      público, importação com relatório de pendências).
      (spec: inservivel › Parâmetros, Configurações e importação)
- [x] 8.8 Página pública de cadastro `/inservivel/entidades/:tenantSlug/cadastro` e o Portal da Entidade (status,
      alerta de documento vencido ou a vencer, perfil, documentos com validade, lotes, participar e desistir,
      termos).
      (spec: inservivel › Cadastro público da entidade, Portal da entidade; D7, D14)
- [x] 8.9 Testes vitest das telas principais: abas por permissão, Portal no lugar das abas, cadastro público e
      tela do lote.

## 9. Verificação final

- [x] 9.1 Suíte do módulo no container, `phpstan` no módulo, `tsc` e `vitest` do web-client.
- [x] 9.2 Conferência no navegador com o tenant de desenvolvimento:
      - fluxo completo: bem → lote → publicar → cadastro público da entidade → habilitar → participar → sortear →
        termos → baixar;
      - transferência: anunciar → solicitar → aprovar.
      Dados de teste criados e apagados pela API.
- [x] 9.3 `openspec validate inservivel`, PR do branch `feat/inservivel`.
