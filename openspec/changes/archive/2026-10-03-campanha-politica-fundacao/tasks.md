# Tasks

> Convenções: cada tarefa cita a spec (`spec: campanha › <requisito>`) e a decisão do design (`D<n>`). Backend testado
> no container (`./sysgov.sh testes Modules/Campanha` ou phpunit com o ambiente de teste); frontend com
> `npx tsc --noEmit -p apps/web-client` e `vitest`; conferência visual no navegador. Commit por grupo.

## 1. Fundação do módulo

- [x] 1.1 `php artisan make:module Campanha`; `module.json` com `requires: ["Admin", "Pessoas"]`, as quatro
      permissões e o menu "Campanha Política" (spec: campanha › Permissões e perfis do módulo Campanha; D1); verificar
      que o teste de isolamento gerado passa e que o módulo aparece no catálogo
- [x] 1.2 `CampanhaRbacSeeder` com os perfis Coordenação Geral de Campanha, Coordenação de Campanha e Consulta de
      Campanha, registrado no `docker-entrypoint.sh` (spec: campanha › Permissões e perfis; D1); verificar com testes
      de perfil Consulta recebendo 403 na escrita e tenant sem o módulo recebendo 403

## 2. Campanhas, candidato e campanha de trabalho

- [x] 2.1 Migrations `campanha_campanhas` (nome, ano, cargo, UF, meta global, status, `cores_situacao`,
      `faixas_meta`), `campanha_membros` e `campanha_candidatos` (`pessoa_id`, dados de urna, contatos, redes,
      biografia, eleição anterior); models `TenantAware` (spec: campanha › Campanhas e candidato; D2, D8, D11);
      verificar com teste de estrutura (índices começando por `tenant_id`)
- [x] 2.2 `CampanhaContext`, trait `CampanhaAware` e middleware `campanha` (`X-Campanha-ID`, acesso por membro ou
      `campanha.gestao.manage`, encerrada só leitura) (spec: campanha › Campanha de trabalho e acesso por membro; D2);
      verificar com testes de membro × não membro (403), campanha de outro tenant (inexistente) e escrita em campanha
      encerrada (422)
- [x] 2.3 Rotas e serviço: `GET /campanhas/minhas`, CRUD de campanhas, membros (usuários do tenant) e candidato
      (CPF → Pessoa por `resolverPorCpf`, `cpf_mascarado` na resposta), com auditoria e Outbox (spec: campanha ›
      Campanhas e candidato; D2, D8); verificar com testes de dois candidatos no tenant, CPF inválido (422), CPF nunca
      completo na resposta e auditoria registrada

## 3. Base territorial pública (IBGE e TSE)

- [x] 3.1 Migrations globais `campanha_ref_municipios`, `campanha_ref_mandatarios`, `campanha_ref_malhas` e
      `campanha_ref_importacoes`; rotas só de leitura `GET /referencia/{uf}/municipios` e `/malha` (com `ETag`)
      (spec: campanha › Base territorial pública por UF; D3); verificar com testes de leitura por quem tem
      `campanha.view` e de que nenhuma rota do tenant escreve nas tabelas
- [x] 3.2 Importadores IBGE (localidades, SIDRA população, malhas) com `Http` (timeout, repetição) e `upsert` por
      `codigo_ibge` (spec: campanha › Base territorial pública por UF; D4); verificar com `Http::fake` (municípios,
      população com ano e malha gravados; reimportação atualiza sem duplicar)
- [x] 3.3 Importadores TSE (eleitorado por local de votação → eleitores/zonas/seções; candidatos → prefeitos, vices e
      vereadores eleitos) em streaming, CSV Latin-1, associação por nome normalizado + exceções, log de não
      associados (spec: campanha › Base territorial pública por UF; D4); verificar com ZIPs de amostra (soma de
      eleitores, zonas e seções distintas, eleitos por cargo, município sem correspondência no relatório)
- [x] 3.4 Comando `campanha:importar-referencia {uf} {--eleicao=2024}` (e atalho no `./sysgov.sh`), com o log em
      `campanha_ref_importacoes`; rodar para o PR no Docker (spec: campanha › Base territorial pública por UF; D4);
      verificar 399 municípios com população, eleitorado e malha, os eleitos de 2024 e o relatório de não associados;
      reimportar e conferir que dados de campanha não mudam (teste de preservação)

## 4. Municípios na campanha, mapa e ficha

- [x] 4.1 Migration `campanha_municipios` (único por campanha × município) e serviço com `updateOrCreate`, só
      municípios da UF da campanha e coordenador da mesma campanha (spec: campanha › Municípios na campanha; D5);
      verificar com testes de município sem linha (sem atuação, meta 0), município de outra UF (422), coordenador de
      outra campanha (422) e dados que não cruzam campanhas
- [x] 4.2 `GET /municipios` (filtros situação, região, coordenador, busca), `GET /municipios/{ibge}` (ficha com base
      pública, prefeito, vereadores, cabos e coordenador) e `PUT /municipios/{ibge}` com auditoria (spec: campanha ›
      Municípios na campanha, Ficha do município; D5); verificar com testes de filtros, ficha completa e Consulta 403
- [x] 4.3 `GET /mapa` (dados por município para as três camadas) e `GET /painel` (indicadores e séries por região)
      (spec: campanha › Mapa interativo da campanha, Ficha do município; D6); verificar com testes de prefeito sem
      relação = `sem_informacao` com nome do eleito, indicadores de aliados e contagem por situação

## 5. Equipes, relacionamento e configuração

- [x] 5.1 Coordenadores e cabos eleitorais: migrations, CRUD com exclusão lógica, CPF opcional → Pessoa, ajuda de
      custo em centavos, município da UF, coordenador com vínculos não sai (spec: campanha › Coordenadores e cabos
      eleitorais; D8); verificar com testes de cabo fora da UF (422), exclusão de coordenador com municípios (422) e
      registro de outra campanha pela URL (404)
- [x] 5.2 Prefeitos (relação/influência por município) e vereadores (com sugestão dos eleitos da base pública)
      (spec: campanha › Prefeitos e vereadores; D9, D10); verificar com testes de prefeito aliado contando no painel e
      na camada, vereador eleito pré-preenchido e vereador não eleito aceito
- [x] 5.3 Configuração de cores e faixas da campanha (spec: campanha › Configuração das cores e faixas; D11);
      verificar com testes de faixas fora de ordem (422), cor inválida (422) e padrões iguais aos do sistema de
      referência
- [x] 5.4 `docs/modules/campanha.md` (rotas, perfis, base pública e importação, regras); suíte do módulo e PHPStan
      sem erros; commit do backend

## 6. Painel do cliente

- [x] 6.1 `modules/campanha/api.ts`, `ComCampanha` (seletor e campanha lembrada), cabeçalho `X-Campanha-ID` no
      `apiClient` para `/campanha/*`, módulo raiz com `Tabs` e regeneração do registry (D2, D12); verificar com
      typecheck e vitest do seletor (uma campanha escolhe sozinha; várias pedem escolha)
- [x] 6.2 Painel: KPIs, mapa `react-leaflet` sem *tiles* com as camadas Situação, Apoio de Prefeito e Meta (cores e
      faixas da campanha), legenda, dica e clique abrindo a ficha; gráficos de situação e meta por região (spec:
      campanha › Mapa interativo da campanha; D6, D7); verificar com vitest das regras de cor por camada/faixa e no
      navegador trocando as camadas e clicando num município
- [x] 6.3 Municípios: lista com filtros e ficha (dados públicos só leitura, dados da campanha editáveis, prefeito,
      vereadores, cabos), mapa atualizado após salvar (spec: campanha › Municípios na campanha, Ficha do município);
      verificar no navegador mudando a situação de um município e vendo a cor no mapa
- [x] 6.4 Coordenadores, Cabos Eleitorais, Prefeitos e Vereadores em `@sysgov/ui` com `useCan` (spec: campanha ›
      Coordenadores e cabos eleitorais, Prefeitos e vereadores); verificar com vitest (Consulta sem botões de
      escrita) e no navegador cadastrando um de cada
- [x] 6.5 Aba Campanha: dados da campanha, candidato (CPF mascarado), membros, cores e faixas (spec: campanha ›
      Campanhas e candidato, Configuração das cores e faixas); verificar no navegador criando uma segunda campanha
      com outro candidato e trocando de campanha no seletor
- [x] 6.6 Typecheck, `npm test` do web-client, `grep` sem `alert(`/`confirm(` e sem chamadas a domínios externos no
      módulo; habilitar o módulo no tenant de teste; commit do frontend
