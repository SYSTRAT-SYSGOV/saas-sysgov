# Design

## Context

- Motivação e escopo: `proposal.md`. Requisitos: `specs/campanha/spec.md`.
- Sistema de referência: PHP em `/politica` (cópia local) e `veiga.pro.br/politica` (só consulta). Banco com 21
  tabelas, tudo por `campanha_id` e um candidato por campanha; mapa do PR desenhado em SVG a partir de um GeoJSON
  com os 399 municípios (propriedade `id` = código IBGE); camadas calculadas no servidor (`ajax/municipios.php`:
  situação; apoio do prefeito = `apoia_campanha` + `influencia`; faixas de meta configuradas na campanha). O PHP já
  sincroniza nome/região/população pela API do IBGE e importa eleitorado do TSE por CSV.
- SYSGOV: tenant = organização cliente; RBAC por perfis com permissões declaradas no `module.json` e provisionadas
  por seeder; isolamento por `tenant_id` (`TenantAware`) e, nos módulos de educação, por um segundo nível
  (`EscolaAware` + middleware `escola:{modulo}` + cabeçalho `X-Escola-ID`). Cadastro de Pessoas com CPF
  criptografado e resolução por CPF (`ResolucaoPessoaService::resolverPorCpf`). O `web-client` já tem `leaflet`,
  `react-leaflet` e `recharts`.
- Fontes abertas verificadas em 02/10/2026: IBGE localidades v1 (399 municípios do PR com meso/micro e regiões
  imediata/intermediária), SIDRA tabela 6579 variável 9324 (população estimada), IBGE malhas v3 (GeoJSON por UF com
  municípios), TSE `cdn.tse.jus.br/estatistica/sead/odsele/` (eleitorado por local de votação e candidatos/eleitos
  por ano).

## Goals / Non-Goals

**Goals:**
- Um segundo nível de isolamento (campanha) com o mesmo desenho já usado e testado para escola.
- Dados públicos carregados uma vez por UF e compartilhados, sem cadastro manual e sem misturar com os dados
  estratégicos de cada campanha.
- Mapa com zoom e base pronta para o mapa de calor da Fase 2.

**Non-Goals:**
- Migrar dados do banco do sistema PHP.
- Eleitores/QR Code/LGPD, mapa de calor, materiais, financeiro, eventos, pesquisas, demandas, documentos (Fase 2).
- Escopo geográfico por coordenador (coordenador municipal vendo só o seu município) — Fase 2; na Fase 1 o acesso é
  por campanha.
- Atualização automática agendada da base pública (o comando é executado sob demanda).

## Decisions

### D1 — Módulo `Campanha` criado por `make:module`
`php artisan make:module Campanha` (alias `campanha`, `requires: ["Admin", "Pessoas"]`), menu "Campanha Política" no
grupo de gestão. Permissões e perfis da spec em `module.json` e `CampanhaRbacSeeder` (registrado no
`docker-entrypoint.sh` como os demais). *Alternativa:* estender um módulo existente — descartada, o domínio é
próprio.

### D2 — Campanha de trabalho (segundo nível de isolamento)
Mesmo desenho da escola: `CampanhaContext`, trait `CampanhaAware` (filtro global por `campanha_id` e preenchimento
na criação, ignorando o cliente) e middleware `campanha` (cabeçalho `X-Campanha-ID`, entre `tenant` e `bindings`).
Acesso: tabela `campanha_membros (tenant_id, campanha_id, user_id)`; quem tem `campanha.gestao.manage` (Coordenação
Geral) ou é admin da plataforma acessa todas as campanhas do tenant. Campanha encerrada aceita só métodos seguros
(422 para escrita). Rotas sem campanha de trabalho: `GET/POST /campanhas`, `GET /campanhas/minhas` e a base pública.
No front, `ComCampanha` (equivalente ao `ComEscola`) escolhe/lembra a campanha e o `apiClient` envia o cabeçalho nas
rotas `/campanha/*`. *Alternativa:* uma campanha por tenant — descartada pelo usuário (vários candidatos no mesmo
cliente).

### D3 — Base territorial pública fora do tenant
Tabelas globais (sem `tenant_id`, exceção deliberada e documentada: dado público, igual para todos):
`campanha_ref_municipios` (PK `codigo_ibge`, `uf`, `nome`, `codigo_tse`, meso/micro e regiões
intermediária/imediata, `populacao` + `ano_populacao`, `eleitores`, `zonas`, `secoes` + `ano_eleitorado`,
`atualizado_em`), `campanha_ref_mandatarios` (município, cargo `prefeito|vice_prefeito|vereador`, nome, nome de urna,
partido, número, ano da eleição — eleitos do TSE), `campanha_ref_malhas` (UF, GeoJSON simplificado, fonte,
`atualizado_em`) e `campanha_ref_importacoes` (log por execução: UF, fontes, contagens, municípios não associados).
Leitura por qualquer usuário com `campanha.view`; nenhuma rota escreve nelas. *Alternativa:* copiar a base para cada
campanha (como o PHP) — descartada: duplicação e dados desatualizados.

### D4 — Importação pelas fontes abertas (comando, nunca controller)
`php artisan campanha:importar-referencia {uf} {--eleicao=2024}` (também em `./sysgov.sh`), com `Http` do Laravel,
timeout e repetição: (1) IBGE localidades → municípios e regiões; (2) SIDRA 6579/9324 último período → população;
(3) IBGE malhas v3 (`intrarregiao=municipio`, qualidade intermediária — ~660 KB para o PR, detalhe suficiente no zoom; configurável) → malha; (4) TSE
`eleitorado_locais_votacao/eleitorado_local_votacao_{ano}.zip` (o mais recente publicado; 2026 em 03/10/2026) → eleitores (soma), zonas e seções distintas por município; (5) TSE
`consulta_cand_{ano}.zip` (arquivo da UF) → prefeitos, vices e vereadores eleitos; em eleição suplementar vale a de data mais recente. Arquivos do TSE baixados para
`storage/app/tmp` em fluxo e gravados em blocos (o `sink` do cliente HTTP mantinha o corpo na memória), lidos como CSV `;` em Latin-1 e apagados no fim. Associação TSE ↔ IBGE pelo nome
normalizado (sem acento/caixa/pontuação) dentro da UF, com tabela de exceções no código para grafias divergentes; o
não associado vai para o log. Tudo `upsert` por `codigo_ibge` numa transação por fonte — nunca toca
`campanha_municipios`. Testado com respostas falsas (`Http::fake`) e ZIPs de exemplo pequenos. *Alternativa:*
importar CSV enviado pelo usuário (como o PHP) — mantida como fallback futuro, não nesta fase.

### D5 — Município na campanha com linha preguiçosa
`campanha_municipios (tenant_id, campanha_id, codigo_ibge, situacao, meta_votos, votos_anterior, coordenador_id,
potencial, historico, observacoes)`, único por `(tenant_id, campanha_id, codigo_ibge)`. A lista e o mapa fazem
*left join* da base pública com essa tabela: sem linha = "sem atuação", meta 0. A primeira alteração cria a linha
(`updateOrCreate`). Município aceito só se for da UF da campanha. *Alternativa:* criar 399 linhas ao abrir a
campanha — descartada (outras UFs, base atualizada depois).

### D6 — Endpoint único do mapa e camadas no cliente
`GET /campanha/mapa` devolve, por `codigo_ibge`: situação, meta, coordenador, relação/influência do prefeito, nome do
prefeito e vice (base pública) e contagens; `GET /campanha/referencia/{uf}/malha` devolve o GeoJSON (com `ETag`,
cache no navegador). A camada escolhida só recalcula as cores no cliente (sem nova requisição), com as cores e
faixas da configuração; após salvar na ficha, o front recarrega `/mapa`. *Alternativa:* uma rota por camada como no
PHP — descartada (mais requisições, mesma informação).

### D7 — Mapa com `react-leaflet` sem mapa de fundo
`MapContainer` + `GeoJSON` com estilo por feição, `fitBounds` na UF, zoom/arrasto, `Tooltip` com os dados da camada e
clique → ficha (`/campanha?aba=municipios&municipio=4100103`). Sem camada de *tiles* (nenhuma requisição a servidores
de mapa externos; fundo neutro do tema). Legenda e seletor de camada com `@sysgov/ui`. A Fase 2 acrescenta o mapa de
calor sobre o mesmo componente. *Alternativa:* SVG próprio como no PHP — descartado (sem zoom e sem base para o
calor).

### D8 — Pessoas: candidato obrigatório, coordenador e cabo opcionais
Candidato: CPF obrigatório → `pessoa_id` (a pessoa guarda o CPF criptografado; a API mostra `cpf_mascarado`).
Coordenador e cabo eleitoral: CPF opcional; com CPF, liga à pessoa. Dados de campanha (meta, ajuda de custo em
centavos, Pix) ficam nas tabelas do módulo, não em Pessoas.

### D9 — Prefeito: relação da campanha + dados públicos
`campanha_prefeitos (tenant_id, campanha_id, codigo_ibge único na campanha, relacao, influencia, contatos,
observacoes)`. Nome, vice e partido vêm de `campanha_ref_mandatarios` (eleição configurada). Camada Apoio de
Prefeito: `relacao` ou `sem_informacao` quando não há linha. *Diferença do PHP:* lá a cor derivava de
`apoia_campanha` + `influencia`; aqui a relação é explícita (aliado/neutro/oposição), mais clara para quem preenche.

### D10 — Vereadores com sugestão dos eleitos
`campanha_vereadores` (dados digitados) com `ref_mandatario_id` opcional: o formulário sugere os vereadores eleitos
do município (base pública) e preenche nome/partido/número; também aceita vereador não eleito (suplente,
pré-candidato).

### D11 — Configuração na própria campanha
`campanhas.cores_situacao` (JSON com as 5 cores; padrão igual ao PHP) e `campanhas.faixas_meta` (JSON: até 9
`{limite, cor}` crescentes + `cor_acima`). Validação no servidor (cores `#rrggbb`, limites crescentes).

### D12 — Telas
Módulo `modules/campanha` com `ComCampanha` e abas em `Tabs`: **Painel** (KPIs, mapa com as 3 camadas, gráficos de
situação e meta por região intermediária), **Municípios** (lista com filtros e ficha), **Coordenadores**,
**Cabos Eleitorais**, **Prefeitos**, **Vereadores** e **Campanha** (dados, candidato, membros, cores e faixas).
Botões de escrita ocultos por `useCan`; valores em centavos; números em `font-mono tabular-nums`.

## Risks / Trade-offs

- [Formatos do TSE mudam entre eleições (nomes de colunas, arquivos)] → leitura por nome de coluna, ano como
  parâmetro, testes com amostras e log de falha por fonte sem derrubar as demais.
- [Grafias diferentes entre IBGE e TSE] → normalização + tabela de exceções + relatório de não associados (o
  município fica sem eleitorado até ser corrigido).
- [Arquivos grandes do TSE (dezenas de MB)] → download em streaming e leitura linha a linha só da UF pedida; o
  comando roda fora da requisição web.
- [GeoJSON pesado no navegador] → malha intermediária do IBGE (~660 KB, comprimida na transferência), servida com `ETag`/cache.
- [Dados pessoais de candidato e equipe] → CPF só em Pessoas (criptografado) e mascarado na API; auditoria de toda
  alteração; acesso por campanha. Dados de eleitores (mais sensíveis) só na Fase 2, com a governança LGPD própria.
- [Tabelas globais fora do padrão `tenant_id`] → só dados públicos, sem rota de escrita, documentadas no
  `docs/modules/campanha.md` e cobertas por teste que garante que nenhuma rota do tenant as altera.

## Migration Plan

1. Migrations e seeder de perfis; habilitar o módulo nos tenants que vão usá-lo (API de administração).
2. Rodar `campanha:importar-referencia PR` no ambiente (Docker) e conferir o relatório (399 municípios).
3. Cadastrar as campanhas e os membros pela tela.
Rollback: desabilitar o módulo no tenant; as migrations são novas (sem alterar tabelas existentes) e reversíveis.

## Open Questions

- Ano da eleição de referência dos mandatários: 2024 (municipal) para prefeitos e vereadores; dá para trocar por
  parâmetro quando sair a eleição seguinte, sem mudar a estrutura.
