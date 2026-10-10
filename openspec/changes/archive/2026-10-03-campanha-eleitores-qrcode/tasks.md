# Tasks

> Convenções: cada tarefa cita a spec (`spec: campanha › <requisito>`) e a decisão do design (`D<n>`). Backend testado
> no container (phpunit com o ambiente de teste), frontend com typecheck e vitest, conferência no navegador. Commit por
> grupo.

## 1. Permissões, LGPD da campanha e scheduler

- [x] 1.1 Permissões `campanha.eleitores.view`, `campanha.eleitores.manage` e `campanha.demandas.manage` no
      `module.json` e no seeder (Coordenação Geral: todas; Coordenação: as três; Consulta: nenhuma) (spec: campanha ›
      Permissões e perfis do módulo Campanha); verificar com teste de Consulta recebendo 403 na lista de eleitores e
      perfis já clonados recebendo as novas
- [x] 1.2 Migration com `lgpd_termo`, `lgpd_termo_versao`, `lgpd_encarregado_nome`, `lgpd_encarregado_contato`,
      `lgpd_retencao_dias` (90) e `encerrada_em` na campanha; termo padrão; versão sobe ao mudar o texto; `encerrada_em`
      preenchida/limpa com o status (spec: campanha › Anonimização…; D4); verificar com testes de versão do termo e
      encerrar/reabrir
- [x] 1.3 Serviço `scheduler` (`php artisan schedule:work`) no `docker-compose.yml` e no `./sysgov.sh` (D5);
      verificar com `php artisan schedule:list` mostrando as rotinas e o container no ar

## 2. Links de captação e formulário público

- [x] 2.1 Migration e model `campanha_links` (código aleatório de 16 caracteres, responsável coordenador ou cabo da
      campanha, ativo), CRUD em `/links` com contagem de cadastros e `GET /links/{id}/qrcode` (SVG) (spec: campanha ›
      Links de captação de eleitores; D1, D8); verificar com testes de responsável de outra campanha (422), código
      único e QR devolvido
- [x] 2.2 Migration e model `campanha_eleitores` com campos sensíveis criptografados, `whatsapp_hash` e prova do
      consentimento (D3); verificar com teste de que o banco não guarda nome/WhatsApp em claro
- [x] 2.3 Rotas públicas `api/public/campanha` (`GET /links/{codigo}`, `POST /links/{codigo}/cadastros`) com
      `throttle` por IP, campo-armadilha e tempo mínimo; `CadastroPublicoService` define tenant e campanha pelo link;
      teste de arquitetura dos controllers públicos (spec: campanha › Cadastro público de eleitor com consentimento
      LGPD; D2, D3); verificar com testes de cadastro sem aceite (422, nada gravado), com localização, mesmo WhatsApp
      atualizando, link desativado, campanha encerrada, município fora da UF, robô (armadilha) e 429

## 3. Base de eleitores, anonimização e mapa de calor

- [x] 3.1 `GET /eleitores` (filtros, `eleitores.view`), ficha, `GET /eleitores/indicadores` (`campanha.view`),
      `GET /eleitores/exportar` (CSV, `eleitores.manage`, auditado) e `DELETE /eleitores/{id}` (exclusão definitiva,
      auditada sem dados pessoais) (spec: campanha › Base de eleitores com acesso restrito; D3); verificar com testes de
      permissão, filtros, CSV, auditoria e exclusão
- [x] 3.2 Comando `campanha:anonimizar-eleitores` agendado diariamente (spec: campanha › Anonimização…; D5); verificar
      com testes de prazo vencido (campos pessoais vazios, agregados iguais), ainda no prazo e campanha reaberta
- [x] 3.3 `GET /mapa-calor` com coordenadas arredondadas e agregadas, sem dado pessoal (spec: campanha › Camada de mapa
      de calor; D6); verificar com teste do formato da resposta
- [x] 3.4 Demandas: migration, CRUD com histórico, responsável membro, filtros e atrasadas, e
      `POST /eleitores/{id}/demanda` (spec: campanha › Demandas da campanha; D7); verificar com testes de demanda vinda
      do formulário, responsável fora da campanha (422) e isolamento
- [x] 3.5 `docs/modules/campanha.md`, suíte do módulo e PHPStan sem erros; commit do backend

## 4. Telas

- [x] 4.1 Página pública `/cadastro-apoio/:codigo` fora do AppShell, mobile-first, com termo, localização após toque e
      aceite (spec: campanha › Cadastro público…; D8); verificar com vitest (envio sem aceite bloqueado) e no navegador
      pelo celular emulado, com e sem localização
- [x] 4.2 Abas Captação (links, QR, cartão para imprimir, contagem) e Eleitores (lista, ficha, exportar, excluir;
      indicadores para quem não tem `eleitores.view`) (spec: campanha › Links…, Base de eleitores…; D8); verificar com
      vitest (Consulta sem dados pessoais) e no navegador cadastrando pelo QR e vendo o eleitor na lista
- [x] 4.3 Camada "Mapa de calor (eleitores)" com `leaflet.heat` e botão de mapa de ruas (spec: campanha › Camada de
      mapa de calor; D6); verificar no navegador com eleitores de teste e sem requisição externa com as ruas desligadas
- [x] 4.4 Aba Demandas e "transformar em demanda" na ficha do eleitor; LGPD (termo, encarregado, retenção, data
      prevista de anonimização) na aba Campanha (spec: campanha › Demandas…, Anonimização…; D4, D7); verificar no
      navegador
- [x] 4.5 Typecheck, `npm test`, `grep` sem `alert(`/`confirm(`; commit do frontend
