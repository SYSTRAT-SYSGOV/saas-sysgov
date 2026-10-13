# Módulo Campanha Política (`api/campanha`)

CRM de campanha política trazido do sistema PHP de referência (`/politica`). Fase 1 (change OpenSpec
`campanha-politica-fundacao`): campanhas por candidato, base territorial pública do IBGE e do TSE, municípios na
campanha, mapa interativo, ficha do município, coordenadores, cabos eleitorais, prefeitos e vereadores. Fase 2A
(change `campanha-eleitores-qrcode`): captação de eleitores por link/QR Code com consentimento LGPD, base de eleitores
com acesso restrito, anonimização por prazo, mapa de calor e demandas. Fase 2B (change `campanha-operacao`):
materiais e logística, livro-caixa com os campos da prestação de contas do TSE, agenda (eventos, reuniões e visitas)
e pesquisas eleitorais.
`requires: ["Admin", "Pessoas"]`.

## Acesso

- **Campanhas por candidato:** o tenant (partido, consultoria, mandato) tem N campanhas; cada uma com um candidato.
- **Campanha de trabalho:** as rotas de dados exigem o cabeçalho `X-Campanha-ID` (middleware `campanha`, entre
  `tenant` e `bindings`). Sem o cabeçalho, vale a campanha única do tenant; com várias → 422. Campanha de outro
  tenant → 404. Campanha **encerrada** aceita só consulta (escrita → 422).
- **Quem acessa:** admin da plataforma e quem tem `campanha.gestao.manage` acessam todas as campanhas do tenant; os
  demais, só as campanhas de que são **membros** (`PUT /campanhas/{id}/membros`, usuários do tenant).
- **Permissões:** `campanha.view`, `campanha.gestao.manage` (campanhas, candidato, membros, configuração),
  `campanha.municipios.manage` (dados do município na campanha), `campanha.equipes.manage` (coordenadores, cabos,
  prefeitos, vereadores), `campanha.eleitores.view` (dados pessoais dos eleitores), `campanha.eleitores.manage`
  (links de captação, exportação e exclusão de eleitores), `campanha.demandas.manage` (demandas),
  `campanha.materiais.manage` (materiais e remessas), `campanha.financeiro.view`/`.manage` (livro-caixa e
  comprovantes), `campanha.agenda.manage` (eventos, reuniões e visitas), `campanha.pesquisas.manage` (pesquisas).
- **Perfis:** Coordenação Geral de Campanha (todas), Coordenação de Campanha (municípios, equipes, eleitores,
  demandas, materiais, agenda e pesquisas — **sem o financeiro**), **Financeiro de Campanha** (`view` e o
  financeiro, nas campanhas de que é membro) e Consulta de Campanha (`view`, sem dados pessoais de eleitores e sem o
  financeiro).
- **Exceção ao encerramento:** a exclusão de eleitor a pedido do titular (`DELETE /eleitores/{id}`) vale também em
  campanha encerrada.
- **Isolamento:** todo dado de campanha tem `tenant_id` e `campanha_id` (`TenantAware` + `CampanhaAware`); registro de
  outra campanha → 404. Auditoria e Outbox em toda mutação (`campanha.<recurso>.<acao>`).
- **Pessoas:** candidato (CPF obrigatório), coordenador e cabo (CPF opcional) são ligados ao Cadastro de Pessoas pelo
  CPF; a API só devolve `cpf_mascarado`.

## Base territorial pública (IBGE + TSE)

Tabelas **globais** (exceção deliberada ao `tenant_id`: dado público, igual para todos, só leitura para os tenants):
`campanha_ref_municipios`, `campanha_ref_mandatarios`, `campanha_ref_malhas`, `campanha_ref_importacoes`.

```bash
./sysgov.sh dados-campanha PR                     # ou: php artisan campanha:importar-referencia PR
php artisan campanha:importar-referencia PR --eleicao=2024 --eleitorado=2026
```

| Fonte | Dado |
|---|---|
| IBGE localidades v1 | municípios, meso/microrregião, regiões intermediária e imediata |
| IBGE SIDRA 6579/9324 (último ano) | população residente estimada |
| IBGE malhas v3 (`qualidade=intermediaria`, configurável) | GeoJSON dos municípios (`codarea` = código IBGE) |
| TSE `eleitorado_locais_votacao/eleitorado_local_votacao_{ano}.zip` | eleitores, zonas e seções por município (mais recente publicado) |
| TSE `consulta_cand/consulta_cand_{eleicao}.zip` | prefeito, vice (suplementar mais recente vale) e vereadores eleitos |

- Cada fonte roda à parte (a falha de uma não derruba as outras); o resultado fica em `campanha_ref_importacoes`.
- TSE ↔ IBGE pelo nome normalizado na UF + exceções em `Config/config.php` (`MUNHOZ DE MELLO` → Munhoz de Melo).
- Reimportar atualiza a base e **nunca** altera os dados das campanhas.
- Em 03/10/2026: PR com 399 municípios, 8.609.026 eleitores (2026), 399 prefeitos/vices e 3.905 vereadores (2024).

## Rotas

Sem campanha de trabalho (`auth:sanctum`, `tenant`, `bindings`, `module-access:campanha`):

| Método | Rota | Permissão | Observação |
|---|---|---|---|
| GET | `/api/campanha/campanhas/minhas` | view | Campanhas que o usuário acessa, com o candidato |
| POST | `/api/campanha/campanhas` | gestao | `{nome, ano, cargo, uf, meta_votos_global?, status?}` |
| GET/PUT/DELETE | `/api/campanha/campanhas/{campanha}` | view / gestao | `status`: ativa \| encerrada (encerrar grava `encerrada_em`; reabrir limpa); LGPD: `lgpd_termo?` (alterar o texto sobe `lgpd_termo_versao`), `lgpd_encarregado_nome?`, `lgpd_encarregado_contato?`, `lgpd_retencao_dias?` (padrão 90). O GET traz `lgpd_termo_vigente` e `anonimizacao_prevista` |
| PUT | `/api/campanha/campanhas/{campanha}/candidato` | gestao | `{cpf (obrigatório na criação), nome_completo?, nome_urna, partido?, numero?, coligacao?, contatos, redes, biografia?, votos_ultima_eleicao?, cargo_ultima_eleicao?}` |
| GET/PUT | `/api/campanha/campanhas/{campanha}/membros` | view / gestao | `{user_ids: []}` substitui a lista (só usuários do tenant) |
| GET | `/api/campanha/campanhas/{campanha}/usuarios` | gestao | Usuários do tenant (id, nome, e-mail) para escolher os membros |
| GET | `/api/campanha/referencia/{uf}/municipios` | view | Base pública da UF + última importação |
| GET | `/api/campanha/referencia/{uf}/malha` | view | GeoJSON, com `ETag` (304 se não mudou) |

Com campanha de trabalho (`X-Campanha-ID`):

| Método | Rota | Permissão | Observação |
|---|---|---|---|
| GET | `/api/campanha/atual` | view | Campanha, candidato, `cores` e `faixas` do mapa |
| GET | `/api/campanha/municipios` | view | Todos os municípios da UF; `?situacao`, `?regiao`, `?coordenador_id`, `?busca` (sem acento) |
| GET | `/api/campanha/municipios/{ibge}` | view | Ficha: dados públicos, da campanha, prefeito, vereadores (e eleitos), cabos |
| PUT | `/api/campanha/municipios/{ibge}` | municipios | `{situacao?, meta_votos?, votos_anterior?, coordenador_id?, potencial?, historico?, observacoes?}`; outra UF → 422 |
| GET | `/api/campanha/mapa` | view | Por código IBGE: situação, meta, coordenador, prefeito/vice/partido, relação, cabos, eleitores |
| GET | `/api/campanha/painel` | view | Contagens por situação, coordenadores, cabos, aliados, metas e série por região intermediária |
| GET/POST/PUT/DELETE | `/api/campanha/coordenadores[/{id}]` | view / equipes | `{nome, tipo (estadual\|regional\|municipal), cpf?, codigo_ibge?, regiao?, meta_votos?, contatos}`; com municípios ou cabos vinculados não sai (422) |
| GET/POST/PUT/DELETE | `/api/campanha/cabos[/{id}]` | view / equipes | `{nome, codigo_ibge, cpf?, coordenador_id?, bairro?, votos_estimados?, ajuda_custo?, valor_ajuda_centavos?, pix?, …}`; exclusão lógica |
| GET | `/api/campanha/prefeitos` | view | Prefeitos eleitos da UF com a relação da campanha |
| PUT/DELETE | `/api/campanha/prefeitos/{ibge}` | equipes | `{relacao (aliado\|neutro\|oposicao), influencia?, contatos}` |
| GET/POST/PUT/DELETE | `/api/campanha/vereadores[/{id}]` | view / equipes | `{codigo_ibge, ref_mandatario_id? (eleito: preenche nome/partido/número), nome?, aliado?, votos_estimados?, dobradinha?, apoios}` |
| PUT | `/api/campanha/configuracao` | gestao | `{cores_situacao?: {situação: #rrggbb}, faixas_meta?: {faixas: [{limite, cor}] (1–9, crescentes), cor_acima}}` || GET/POST | `/api/campanha/links` | eleitores.manage | Links de captação com `url`, `responsavel` e `cadastros`; `{tipo (coordenador\|cabo), coordenador_id\|cabo_id, descricao?}` — responsável de outra campanha → 422 |
| PUT/DELETE | `/api/campanha/links/{id}` | eleitores.manage | `{ativo?, descricao?}`; link com cadastros não sai (desative) |
| GET | `/api/campanha/links/{id}/qrcode` | eleitores.manage | SVG do QR Code da URL pública |
| GET | `/api/campanha/eleitores` | eleitores.view | `?codigo_ibge`, `?bairro`, `?coordenador_id`, `?cabo_id`, `?link_id`, `?de`, `?ate`, `?busca` (nome/WhatsApp, após descriptografar), `?pagina` (50 por página) |
| GET | `/api/campanha/eleitores/{id}` | eleitores.view | Ficha |
| GET | `/api/campanha/eleitores/indicadores` | view | Total, com localização, últimos 7 dias, anonimizados, por município e por responsável (sem dado pessoal) |
| GET | `/api/campanha/eleitores/exportar` | eleitores.manage | CSV (`;`, UTF-8 com BOM), mesmos filtros; auditado com a quantidade |
| DELETE | `/api/campanha/eleitores/{id}` | eleitores.manage | Exclusão definitiva a pedido do titular; auditoria só com id e município |
| GET | `/api/campanha/mapa-calor` | view | `{pontos: [[lat, lng, peso]]}` arredondados a 3 casas (~100 m) e agregados |
| GET/POST/PUT/DELETE | `/api/campanha/demandas[/{id}]` | view / demandas | `?codigo_ibge`, `?status`, `?prioridade`, `?responsavel_id`, `?atrasadas=1`; `{codigo_ibge, solicitante, categoria, prioridade?, responsavel_id?, prazo?, status?, descricao, comentario?}` — responsável que não acessa a campanha → 422; mudança de situação e comentário entram no `historico` |
| GET | `/api/campanha/demandas/responsaveis` | view | Usuários que podem ser responsáveis (membros e gestão) |
| POST | `/api/campanha/eleitores/{id}/demanda` | demandas + eleitores.view | Transforma o pedido do eleitor em demanda pendente no município dele |
| GET/POST/PUT/DELETE | `/api/campanha/materiais[/{id}]` | view / materiais | `{tipo, nome, fornecedor?, unidade?, quantidade_produzida, valor_total_centavos?, peso_kg?, volume_m3?, observacoes?, lancar_despesa?}`; devolve `enviado` e `estoque`; `lancar_despesa` exige `financeiro.manage` (422); produzida abaixo do enviado → 422 |
| GET/POST | `/api/campanha/materiais/{id}/imagem` | materiais | Imagem do material (multipart `arquivo`) |
| GET/POST/PUT/DELETE | `/api/campanha/remessas[/{id}]` | view / materiais | `?material_id`, `?codigo_ibge`, `?pendentes=1`; `{material_id, codigo_ibge, coordenador_id?, cabo_id?, quantidade, enviada_em, transportadora?, motorista?, veiculo?, previsao_entrega?, entregue_em?, recebido_por?, observacoes?}`; acima do estoque → 422; excluir devolve ao estoque |
| GET/POST | `/api/campanha/remessas/{id}/foto` | materiais | Foto da entrega |
| GET | `/api/campanha/financeiro/opcoes` | financeiro.view | Categorias por tipo, origens, formas de pagamento e documentos fiscais |
| GET | `/api/campanha/financeiro/resumo` | financeiro.view | Receitas, despesas e saldo em centavos; por categoria, origem e município (mesmos filtros da lista) |
| GET | `/api/campanha/financeiro/exportar` | financeiro.view | CSV da prestação de contas (`;`, UTF-8 com BOM), auditado com a quantidade |
| GET/POST/PUT/DELETE | `/api/campanha/lancamentos[/{id}]` | financeiro.view / financeiro.manage | `?de`, `?ate`, `?tipo`, `?categoria`, `?origem_recurso`, `?codigo_ibge` (0 = campanha geral), `?busca` (nome ou CPF/CNPJ exato), `?pagina`; `{tipo, categoria, valor_centavos, data, forma_pagamento, codigo_ibge?, contraparte_nome?, contraparte_documento?, origem_recurso (obrigatória na receita), recibo_eleitoral? (receita), documento_fiscal_tipo?/numero? (despesa), material_id?, observacoes?}` |
| GET/POST | `/api/campanha/lancamentos/{id}/comprovante` | financeiro.view / financeiro.manage | Comprovante (PDF ou imagem, até 10 MB) |
| GET | `/api/campanha/agenda` | view | Eventos, reuniões e visitas normalizados (`tipo, id, titulo, inicio, municipio, alerta, registro`); `?de`, `?ate`, `?codigo_ibge`, `?tipo` |
| GET | `/api/campanha/agenda/proximos` | view | Próximos compromissos (até 8) |
| POST/PUT/DELETE | `/api/campanha/eventos[/{id}]` | agenda | `{nome, codigo_ibge, local, inicio, responsavel_id?, publico_estimado?, publico_presente?, observacoes?}` |
| POST/PUT/DELETE | `/api/campanha/reunioes[/{id}]` | agenda | `{titulo, codigo_ibge, local?, inicio, participantes?, ata?, pendencias?, responsavel_id?, prazo_pendencias?, pendencias_resolvidas?}`; devolve `pendencia_vencida` |
| POST/PUT/DELETE | `/api/campanha/visitas[/{id}]` | agenda | `{lideranca, codigo_ibge, bairro?, data, assunto, resultado?, encaminhamento?}` |
| POST | `/api/campanha/visitas/{id}/demanda` | agenda + demandas | Encaminhamento vira demanda pendente (uma vez só) |
| GET/POST/PUT/DELETE | `/api/campanha/pesquisas[/{id}]` | view / pesquisas | `{tipo, instituto, divulgada_em, codigo_ibge? (nulo = estadual), margem_erro_decimos?, amostra?, registro_tse?, observacoes?, resultados: [{nome, partido?, percentual_decimos, da_campanha?}]}`; soma ≤ 100% e um só da campanha |
| GET | `/api/campanha/pesquisas/evolucao` | view | Percentual do candidato da campanha por pesquisa; `?codigo_ibge` (sem = estadual) |

Públicas, sem login (`api/public/campanha`, `throttle` por IP: 30 consultas/min e 5 envios/min):

| Método | Rota | Observação |
|---|---|---|
| GET | `/api/public/campanha/links/{codigo}` | Campanha, candidato, quem indicou e, se o link estiver ativo e a campanha aberta, termo vigente, encarregado, municípios da UF e `iniciado_em` assinado; senão `ativo: false` e `mensagem`. Código inexistente → 404 |
| POST | `/api/public/campanha/links/{codigo}/cadastros` | `{nome, codigo_ibge, bairro, zona?, secao?, whatsapp?, data_nascimento?, demanda?, latitude?, longitude?, precisao_m?, aceite (obrigatório), iniciado_em, site (armadilha — deixar vazio)}` → `{ok, atualizado}`. Mesmo WhatsApp na campanha atualiza o cadastro |

Os controllers públicos (`Http/Controllers/Publico`) só dependem do `CadastroPublicoService` (teste de arquitetura).

## Eleitores e LGPD

- **Dados sensíveis:** nome, WhatsApp, nascimento, demanda, IP e navegador ficam criptografados (`encrypted`); o
  WhatsApp tem também `whatsapp_hash` (HMAC com a `APP_KEY`, só dígitos) para deduplicar por campanha.
- **Prova do consentimento:** versão do termo aceita, data e hora, IP e navegador.
- **Robôs:** campo-armadilha (`site` preenchido → responde ok sem gravar), tempo mínimo de 3 s entre abrir e enviar
  (`iniciado_em` assinado, válido por 12 h) e limite por IP.
- **Anonimização:** `campanha:anonimizar-eleitores` roda todo dia às 02:30 (serviço `scheduler` do docker-compose).
  Campanha encerrada há mais que `lgpd_retencao_dias`: apaga os campos pessoais, arredonda o ponto a 2 casas (~1 km) e
  marca `anonimizado_em`; município, bairro, zona, seção e data permanecem. Idempotente; pode rodar à mão.
- **Campanha excluída:** a exclusão da campanha (lógica) apaga de vez os eleitores dela; eleitores de campanhas
  excluídas antes dessa regra são anonimizados pela rotina.
- **Telas:** página pública `/cadastro-apoio/{codigo}` (fora do AppShell, para celular; localização só depois do
  toque); abas **Eleitores** (totais para todos; lista, ficha, exportação e exclusão conforme a permissão),
  **Captação** (links, QR Code, cartão para imprimir) e **Demandas**; camada **Mapa de calor (eleitores)** no Painel
  (`leaflet.heat`; o botão "Mostrar ruas" liga os *tiles* do OpenStreetMap, única requisição externa); cartão de
  LGPD na aba Campanha.

## Operação (Fase 2B)

- **Estoque** = quantidade produzida − soma das remessas (calculado; a remessa trava o material). O valor contábil do
  material é o **total do lote** em centavos; o unitário é só exibido.
- **Despesa automática:** ao cadastrar o material, `lancar_despesa` cria a despesa (Publicidade e gráfica) ligada a
  ele, na mesma transação.
- **Livro-caixa:** valores em centavos, somas no banco; CPF/CNPJ validado, guardado criptografado (só dígitos) com
  HMAC para busca exata, e fora da auditoria. Recibo eleitoral só na receita; documento fiscal só na despesa. Não gera
  o arquivo do SPCE.
- **Anexos:** disco privado (`local`), `campanha/{tenant}/{campanha}/{recurso}/{uuid}.ext`; trocar apaga o anterior;
  excluir o registro mantém o arquivo. Comprovante: `financeiro.view`; imagem e foto: `materiais.manage`.
- **Agenda:** reunião com pendência vencida = pendências não resolvidas com prazo passado.
- **Pesquisas:** percentuais e margem em décimos de ponto (14,5% → 145).
- **Telas:** abas **Agenda** (lista por período com os três tipos; visita → demanda), **Materiais** (estoque com
  barra, remessas, confirmação de entrega com foto; a opção de despesa automática só aparece para quem tem o
  financeiro), **Financeiro** (só com `financeiro.view`: indicadores, gráficos, extrato, lançamento com comprovante,
  planilha do TSE) e **Pesquisas** (resultados editáveis, soma conferida antes de enviar, gráfico de evolução). No
  Painel: próximos compromissos para todos e saldo do caixa só para quem tem o financeiro.

## Regras do mapa

- **Situação Política:** cor da situação (`sem_atuacao`, `em_andamento`, `consolidado`, `prioritario`, `risco`).
- **Apoio de Prefeito:** `aliado`, `neutro`, `oposicao` ou `sem_informacao` (sem relação registrada).
- **Meta de Votos:** meta 0 = sem meta; senão a primeira faixa com `meta <= limite`; acima do último limite,
  `cor_acima`. Padrões iguais aos do sistema de referência (até 100, 250, 350; acima de 350).
