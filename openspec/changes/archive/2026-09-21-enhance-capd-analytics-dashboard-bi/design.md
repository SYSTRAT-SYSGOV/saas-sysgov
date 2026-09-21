# Design

## Context

A aba `analytics` de `PortalRhView.tsx` já carrega, a cada render, `ciclos` (`api.capd.listCiclos`),
`metricas` (`api.capd.getMetricas(cicloId)`), `avaliacoes` (`api.capd.listAvaliacoes({ ciclo_id })`)
e `servidores` (`api.capd.listServidores`). `avaliacoes[].servidor` já vem populado com
`ApiServidor` completo (`orgao_lotacao`, `lotacao_fisica`, `data_admissao`, `org_unit_id`). Ver
proposal.md - Why para o problema (dados fictícios) e What Changes para o escopo completo.

**Correção de escala (achado durante o apply, não assumido na proposta original):** `nota_final`
(campo que `ApiAvaliacao.nota_final` expõe, gravado por `CalculadoraNotaService.calcular()` como
`Nf = (grau−1) × 2,5`) está na escala **NFD 0–10**, não 0–100. Isso é confirmado por três pontos
independentes no código: (1) `elegivel_progressao` é definido como `nota_final ≥ 7,00`
(`AvaliacaoController.php:470`, `CalculadoraNotaService.php:118`); (2) o log de auditoria da
submissão rotula esse valor como `"NFD"` (`AvaliacaoController.php:477`); (3) o próprio
`DashboardController::metricas` banda esse mesmo campo em faixas 0–10 (`0–3.99`, `4–6.99`,
`7–8.49`, `8.5–10`). O texto original da aba ("Corte: 70,00 pts", `domain={[50,100]}`) presumia
incorretamente uma escala 0–100 para esse campo — não existe hoje nenhum campo por-avaliação em
0–100 exposto pela API (a única grandeza 0–100 do domínio é a NFC trienal consolidada,
`ConsolidacaoTrienal.nfc`, calculada por um motor totalmente separado — `NotaCalculoService` — que
não está no escopo desta mudança). Todos os gráficos desta aba passam a usar `nota_final`
consistentemente como NFD 0–10, com o corte de elegibilidade em 7,00 (mesmo valor de
`elegivel_progressao`) no lugar de "70 pts".

`metricas.avaliacoes.distribuicao` já é bandado nessa mesma escala 0–10 — mas continua não sendo
reaproveitável diretamente para o gráfico de proporção de conceitos porque não agrupa por
secretaria (ver Decisão 1).

**Fora de escopo, registrado à parte:** ao rastrear a escala, foi identificado que
`CicloService::consolidarNfcTrienal()` alimenta `NotaCalculoService::calcularNfc()` (motor
pensado para valores 0–100, com corte padrão `nota_corte_nfc = 70,00`) diretamente com
`avaliacao->nota_final` (0–10) — a NFC resultante ficaria sempre ~0–10 e nunca atingiria o corte de
70,00, quebrando a elegibilidade de progressão trienal em produção. Esse bug é rastreado na
mudança separada `fix-capd-nfc-trienal-scale` e não é tocado aqui.

## Goals / Non-Goals

**Goals:**
- Eliminar todo dado estático dos 4 gráficos existentes, sem introduzir nova tabela ou migração.
- Adicionar as 4 novas visões (evolução, ranking, drill-down, top/bottom) reaproveitando ao máximo
  dados já buscados pela view, minimizando novas chamadas de rede.
- Manter a aba funcionando com estado vazio explícito quando o tenant não tem dados suficientes,
  em vez de silenciosamente cair para exemplos fictícios.

**Non-Goals:**
- Não corrigir o motor de cálculo da NFC trienal (`NotaCalculoService`/
  `CicloService::consolidarNfcTrienal`) nem qualquer lógica de elegibilidade de progressão —
  rastreado separadamente em `fix-capd-nfc-trienal-scale`. Esta mudança apenas garante que a aba
  de BI usa `nota_final` (NFD, 0–10) de forma consistente e correta em todos os seus gráficos.
- Não alterar as abas "Distribuição por Pasta & Departamento" ou "Ranking Desempate Art. 39"
  (fora do escopo desta proposta, mesmo que também contenham dados fabricados).
- Não adicionar exportação (CSV/PDF) dos novos gráficos.

## Decisions

**1. Clusters/média/proporção de conceitos: agregação 100% client-side, sem novo endpoint.**
`avaliacoes` já carrega `nota_final` e `servidor.orgao_lotacao` para o ciclo selecionado. As três
transformações hoje hardcoded (`stackedBarData`, `composedData`, `pieData`) passam a ser
`useMemo` derivados de `avaliacoes`, agrupando por `orgao_lotacao` e bandando por `nota_final`
(escala NFD 0–10) nos limiares: ≥9,0 Excelente, 8,0–8,99 Bom, 7,0–7,99 Regular, <7,0 Risco/PMD —
o último limiar (7,0) é o mesmo valor já usado por `elegivel_progressao`, então o gráfico de
proporção de conceitos pode usar `av.elegivel_progressao` diretamente para separar "Risco/PMD" do
resto, sem duplicar o limiar. Alternativa descartada: reaproveitar `metricas.avaliacoes.distribuicao`
do backend — rejeitada porque não agrupa por secretaria (o endpoint não fornece esse dado), mesmo
estando na mesma escala 0–10.

**2. Tempo de serviço real: `data_admissao` no lugar do índice fabricado.**
`dias_servico = diffDays(hoje, parseISO(servidor.data_admissao))`, com fallback para omitir o
ponto do gráfico (não para um valor fabricado) quando `data_admissao` for nula.

**3. Evolução entre ciclos: novo endpoint agregado, não N chamadas ao `metricas` existente.**
Adiciona `GET /capd/dashboard/evolucao-ciclos` em `DashboardController`, delegando a um novo
método em `PainelGerencialService` (ou service dedicado) que roda uma única query agrupada por
`ciclo_id` sobre `Avaliacao` (média de `nota_final`, contagem concluída/total), joinada com
`CicloAvaliacao` para `ano_referencia`. Alternativa descartada: o frontend chamar
`api.capd.getMetricas(cicloId)` uma vez por ciclo em `ciclos` — rejeitada por gerar N chamadas HTTP
que crescem com o histórico do tenant (potencialmente 10+ ciclos ao longo dos anos) para um dado
que uma única query agregada resolve. O novo endpoint é protegido pela mesma permissão de
`capd.dashboard.view` já usada por `metricas`, e o resultado é escopado por tenant automaticamente
via `TenantAware` nos models `Avaliacao`/`CicloAvaliacao` (nenhuma chamada externa, sem Outbox
necessário — é leitura pura).

**4. Ranking de secretarias e drill-down por departamento: derivados no cliente.**
Ranking é apenas `[...composedData].sort(...)` sobre o dataset já real da Decisão 1, com destaque
visual (maior média; menor distância absoluta ao corte de elegibilidade 7,0). Drill-down mantém um estado local
`secretariaSelecionada`; ao ser definido, um segundo `useMemo` reagrupa o mesmo `avaliacoes`
filtrado por `orgao_lotacao === secretariaSelecionada`, desta vez por `lotacao_fisica`. Nenhuma
chamada de rede adicional.

**5. Top/Bottom individual: reaproveita `EspelhoAvaliacaoModal` já existente.**
`useMemo` ordena `avaliacoes` por `nota_final` (concluídas apenas) e recorta os 5 melhores e 5
piores. Cada linha usa o mesmo padrão já presente no arquivo
(`setAvaliacaoEmFocoId(av.id); setModalEspelhoOpen(true)`) para abrir o espelho, sem duplicar o
componente de modal.

## Risks / Trade-offs

- [Tenants com poucas avaliações concluídas produzem gráficos "pobres" ou vazios] → Mitigação: a
  Requirement "Ciclo sem avaliações concluídas" cobre esse caso com estado vazio explícito;
  gráficos com poucos pontos (ex. 1 secretaria) ainda são desenhados, só não são preenchidos com
  exemplo fictício.
- [Novo endpoint de evolução expõe uma nova superfície de API] → Mitigação: segue o mesmo padrão de
  autenticação/tenant/permission de `metricas`, sem introduzir modelo ou tabela nova; coberto por
  teste de isolamento multi-tenant como as demais rotas do módulo.
- [Reintroduzir a confusão de escala corrigida aqui, caso código futuro reaproveite estes gráficos
  como referência] → Mitigação: comentário no código apontando que `nota_final` é NFD 0–10 e que
  o corte de elegibilidade é 7,0, não 70.
- [O bug de escala na NFC trienal (fora de escopo aqui) segue afetando produção até ser corrigido
  em `fix-capd-nfc-trienal-scale`] → Mitigação: reportado explicitamente ao usuário e registrado
  como mudança separada nesta sessão; não é responsabilidade desta mudança resolvê-lo.

## Migration Plan

Sem migração de dados. Deploy é o release normal do monólito (backend + frontend); rollback é
reverter o commit, já que não há alteração de schema nem de contrato de API existente (apenas uma
rota nova, aditiva).
