# Design

## Context

- Motivação: `proposal.md`. Requisitos: `specs/campanha/spec.md` (delta sobre a capacidade `campanha` da Fase 1).
- Base existente (Fase 1, `docs/modules/campanha.md`): campanha de trabalho (`CampanhaContext`, `CampanhaAware`,
  middleware `campanha`), coordenadores e cabos, base pública do IBGE/TSE, mapa `react-leaflet` sem *tiles*.
- Referência: versão no ar do CRM PHP — tela "Eleitores & QR Code" (link por tipo de responsável e responsável, QR,
  cartão, "scanner de campo"), formulário `cadastrar_eleitor.php?campanha_id&tipo&ref_id` (nome, cidade, bairro,
  zona, seção, WhatsApp, nascimento, demanda, latitude/longitude/precisão, aceite LGPD), relatório com GPS e mapa de
  calor `leaflet.heat` sobre OpenStreetMap. Lá o link é previsível (ids na URL) — aqui não.
- Padrão de rota pública do SYSGOV: Cursos (`api/public/cursos`, sem `tenant`, `throttle` por IP, controllers
  públicos restritos e teste de arquitetura).

## Goals / Non-Goals

**Goals:**
- Captação pública sem abrir caminho para ler dados (o formulário só escreve e só devolve o próprio resultado).
- Tratar o eleitor como dado sensível de ponta a ponta: consentimento provado, acesso por permissão, exportação e
  exclusão auditadas, anonimização por prazo.
- Mapa de calor sem dado pessoal no navegador.

**Non-Goals:**
- Cadastro de eleitor pela equipe no painel (todo cadastro passa pelo formulário com o aceite do próprio titular).
- Ligar eleitores ao Cadastro de Pessoas (o cliente da campanha não é dono do cadastro municipal; minimização).
- CPF do eleitor (não é coletado).
- Portal do titular para autoexclusão (o pedido vai ao encarregado, que exclui pelo painel).
- Fase 2B (materiais, financeiro, agenda, pesquisas).

## Decisions

### D1 — Link de captação com código imprevisível
`campanha_links (tenant_id, campanha_id, codigo char(16) único global, tipo coordenador|cabo, coordenador_id|cabo_id,
ativo, timestamps)`. O código é aleatório (base62, 16 caracteres) — a URL pública é `/cadastro-apoio/{codigo}` no
painel e `api/public/campanha/links/{codigo}` na API. Um responsável pode ter mais de um link (ex.: um por evento).
*Alternativa:* ids na URL como no PHP — descartada (enumerável, permite cadastrar em nome de qualquer cabo).

### D2 — Rotas públicas isoladas
Grupo `api/public/campanha` com `api` + `throttle:campanha-publico` (por IP), **sem** `tenant`/`campanha`. O
controller público só usa `CadastroPublicoService`, que: busca o link pelo código **sem** escopo de tenant, recusa
inativo/encerrado, define `TenantContext` e `CampanhaContext` a partir do link e grava; devolve apenas o que a tela
precisa (candidato, responsável, termo, municípios da UF) ou o resultado do próprio envio. Teste de arquitetura (como no
Cursos) garante que nenhum outro serviço/model é usado nesses controllers. Proteção contra robô: campo-armadilha
invisível (preenchido → resposta "ok" sem gravar) + tempo mínimo de preenchimento (`iniciado_em` assinado). Sem
captcha de terceiros (nenhum serviço externo).

### D3 — Eleitor e prova do consentimento
`campanha_eleitores (tenant_id, campanha_id, link_id, coordenador_id/cabo_id do link no momento, nome, codigo_ibge,
bairro, zona, secao, whatsapp, whatsapp_hash, data_nascimento, demanda, latitude, longitude, precisao_m,
consentimento_versao, consentido_em, ip, user_agent, anonimizado_em, timestamps)`. `nome`, `whatsapp`,
`data_nascimento`, `demanda`, `ip` e `user_agent` com cast `encrypted` (como o CPF em Pessoas); `whatsapp_hash`
(HMAC com a chave da aplicação, normalizado só dígitos) para a deduplicação por campanha
(`unique(tenant_id, campanha_id, whatsapp_hash)` quando não nulo). Sem WhatsApp não há deduplicação.
*Alternativa:* guardar em claro — descartada (dado sensível).

### D4 — Termo e encarregado por campanha
Colunas na campanha: `lgpd_termo` (texto; padrão gerado com nome do candidato/campanha), `lgpd_termo_versao` (inteiro,
sobe a cada alteração do texto), `lgpd_encarregado_nome`, `lgpd_encarregado_contato`, `lgpd_retencao_dias`
(padrão 90) e `encerrada_em` (preenchida ao passar o status para encerrada; limpa ao reabrir). O formulário mostra o
termo vigente e grava a versão aceita.

### D5 — Anonimização por rotina agendada
Comando `campanha:anonimizar-eleitores` agendado diariamente no scheduler do Laravel (`routes/console.php`, como o
`ExpireAccess`). Hoje **nenhum container executa o scheduler** (o compose só tem API, worker da outbox e painéis — o
`ExpireAccess` agendado também não roda): esta change acrescenta o serviço `scheduler` (`php artisan schedule:work`)
ao `docker-compose.yml`. A rotina: para cada campanha encerrada com `encerrada_em + retencao_dias < hoje`, apaga
nome, WhatsApp (e hash), nascimento, demanda, IP e user-agent e arredonda latitude/longitude para 2 casas
(~1 km), marcando `anonimizado_em`. Auditoria com contagens, sem dados pessoais. Exclusão a pedido do titular é
`forceDelete` com auditoria só do id e município. Excluir a campanha (exclusão lógica) apaga de vez os eleitores
dela, com a quantidade na auditoria; a rotina também anonimiza eleitores de campanhas já excluídas (os que existiam
antes desta regra), para que nenhum dado pessoal fique órfão.

### D6 — Mapa de calor
`GET /campanha/mapa-calor` (permissão `campanha.view`) devolve `[[lat, lng, peso], …]` com coordenadas arredondadas
a 3 casas (~100 m) e agregadas por célula (peso = quantidade). No front, camada `leaflet.heat` (dependência nova,
~4 KB) dentro do `MapaCampanha`, sobre a malha do IBGE; botão "Mostrar ruas" acrescenta *tiles* do OpenStreetMap
(única requisição externa, opcional, sem dado pessoal). *Alternativa:* coroplético por eleitores/município — mantido
como dado na dica, não como camada.

### D7 — Demandas
`campanha_demandas (tenant_id, campanha_id, codigo_ibge, solicitante, eleitor_id null, categoria, prioridade,
responsavel_id null → users, prazo, status, descricao, historico json [{em, por, texto}], timestamps, softDeletes)`.
Responsável: membro da campanha ou quem tem `campanha.gestao.manage`. "Transformar em demanda" copia o texto do
eleitor (enquanto não anonimizado). Atrasada = prazo < hoje e status ≠ concluída.

### D8 — Telas
Página pública `/cadastro-apoio/:codigo` fora do AppShell (como `/validar-certificado`), mobile-first, com
`navigator.geolocation` só após o toque do usuário. No módulo: abas **Eleitores** (lista, ficha, exportar, excluir;
indicadores para quem não tem `eleitores.view`), **Captação** (links por responsável, QR gerado no servidor com a
`chillerlan/php-qrcode` já usada nos certificados — `GET /campanha/links/{id}/qrcode` em SVG —, cartão para imprimir,
contagem) e **Demandas**; camada de calor no Painel; LGPD (termo,
encarregado, retenção) na aba Campanha.

## Risks / Trade-offs

- [Formulário público atrai spam] → código imprevisível, limite por IP, campo-armadilha, tempo mínimo, deduplicação por
  WhatsApp; nada é lido de volta.
- [Coordenadas precisas identificam a casa do eleitor] → só a equipe com `eleitores.view` vê a coordenada original; o
  mapa de calor recebe pontos arredondados e agregados; após anonimização, só ~1 km.
- [Criptografia impede busca por nome/WhatsApp no banco] → filtros por município, bairro, responsável e período; busca
  por nome feita após descriptografar a página corrente (volume por campanha comporta).
- [Termo alterado depois de aceites] → versão gravada em cada aceite; o histórico do texto fica na auditoria.
- [Rotina de anonimização não roda] → o comando é idempotente e pode ser rodado à mão; aviso na aba Campanha com a data
  prevista de anonimização.

## Migration Plan

1. Migrations novas (aditivas) e permissões no seeder; perfis existentes recebem as permissões novas (o seeder já
   propaga aos clones).
2. Agendar `campanha:anonimizar-eleitores` e subir o serviço `scheduler` (`./sysgov.sh iniciar` passa a incluí-lo).
3. Sem migração de dados do PHP. Rollback: desabilitar as rotas públicas (remover o grupo) e as migrations são
   reversíveis.
