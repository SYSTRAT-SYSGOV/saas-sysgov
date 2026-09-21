# Proposal

## Why

A aba "Dashboard Analítico & BI" do Portal de RH e Secretaria Municipal de Gestão de Pessoas
(`PortalRhView.tsx`, dentro do módulo CAPD) exibe hoje 3 dos 4 gráficos com arrays estáticos
hardcoded (`useMemo(..., [])`) que nunca refletem o tenant logado, e o quarto gráfico usa uma
métrica de tempo de serviço fabricada por índice (`365 * ((idx % 10) + 1)`). Um painel de
Business Intelligence institucional mostrando números fixos e fictícios para qualquer prefeitura
compromete a credibilidade do processo de avaliação de desempenho que ele deveria apoiar. Além
disso, a aba hoje só mostra o ciclo avaliativo corrente, sem visão histórica, ranking, detalhamento
por departamento ou destaque de desempenho individual — reduzindo seu valor como ferramenta de
gestão para a Secretaria de Gestão de Pessoas.

## What Changes

- Substituir os 3 datasets hardcoded (clusters por secretaria, média por secretaria vs corte,
  proporção de conceitos) por agregações reais derivadas de `avaliacoes` + `servidores` +
  `metricas` já carregados pela view, usando consistentemente `nota_final` na escala real em que
  é gravado (NFD, 0–10 — ver Nota sobre escala abaixo).
- Corrigir o cálculo de tempo de serviço no gráfico de dispersão para usar `servidor.data_admissao`
  real em vez do valor fabricado por índice, e remover o fallback totalmente mockado quando não
  há avaliações concluídas no ciclo (substituir por estado vazio explícito).
- Adicionar gráfico de evolução entre ciclos: série histórica de média de notas e taxa de
  conclusão por ciclo avaliativo (não apenas o ciclo ativo).
- Adicionar ranking de secretarias: ordenação das pastas municipais por média de desempenho, com
  destaque visual para a melhor colocada e para a mais próxima do corte de elegibilidade (NFD
  7,00, mesmo critério já usado por `elegivel_progressao`).
- Adicionar drill-down por departamento: ao selecionar uma secretaria, exibir o detalhamento por
  departamento/lotação física dentro dela, reaproveitando os dados já carregados.
- Adicionar destaque de desempenho individual (top/bottom): lista dos servidores com maior e
  menor nota no ciclo selecionado, com atalho para o espelho de avaliação já existente
  (`EspelhoAvaliacaoModal`).

**Nota sobre escala de nota (achado durante o apply):** `Avaliacao.nota_final`, retornado por
`listAvaliacoes()` e usado por toda a aba, é gravado por `CalculadoraNotaService` na escala NFD
0–10 (`elegivel_progressao` = `nota_final ≥ 7,00`), não na escala 0–100 que o texto original da
tela sugeria ("Corte: 70,00 pts"). Esta mudança usa a escala real (0–10) em todos os gráficos.
Um bug relacionado — `CicloService::consolidarNfcTrienal()` alimenta o motor de NFC (pensado para
0–100) com esses mesmos valores 0–10 — foi identificado mas está fora de escopo aqui; ver mudança
separada `fix-capd-nfc-trienal-scale`.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende uma capability já existente)

### Modified Capabilities

- `capd`: adiciona requisitos de exibição de dados reais (não fictícios) e de novas visões
  analíticas (evolução histórica, ranking, drill-down, destaque individual) na aba Dashboard
  Analítico & BI do Portal de RH e Secretaria Municipal de Gestão de Pessoas.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` (aba `analytics`) —
  reescrita das transformações `useMemo` dos 4 gráficos existentes e adição de novos
  componentes/gráficos Recharts para as 4 novidades.
- Backend: `apps/api/Modules/Capd/Http/Controllers/DashboardController.php` e
  `PainelGerencialService`/`ServidorService` — provável adição de um endpoint (ou extensão de
  `metricas`) para série histórica por ciclo, evitando N+1 requisições ao frontend. Detalhes de
  design a definir em `design.md`.
- Nenhuma migração de schema é esperada (dados já existem em `capd_avaliacoes` e
  `capd_servidores`); a mudança é de agregação/apresentação.
- Sem impacto em outros módulos, tenants ou contratos de API existentes além da nova rota/response
  adicional.
