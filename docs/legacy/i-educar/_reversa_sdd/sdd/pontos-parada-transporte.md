# Spec: Pontos de Parada de Transporte Escolar

**Versão:** 1.0
**Status:** Em Revisão
**Autor:** Reversa (Time de Descoberta + Code New Project)
**Data:** 2026-10-20
**Reviewers:** N/A

> Todos os itens desta spec carregam o selo 🟡 PLANEJADO. Fatos extraídos do legado estão referenciados no Apêndice com a identificação da origem.

---

## 1. Resumo

🟡 O componente de pontos de parada registra os locais de embarque e desembarque de estudantes, com coordenadas geográficas, endereço de referência e ponto de referência visual. No SYSGOV, ele substitui `modules.ponto_transporte_escolar` por `educa_transport_stops`, com coordenadas numéricas, e serve de base para a ordenação do itinerário das rotas e para a visualização em mapa.

---

## 2. Contexto e Motivação

**Problema:**
No i-Educar, o ponto de transporte escolar é encontrado por busca simples e tem endereço e coordenadas gravadas como texto, o que impede plotagem em mapa e verificação de consistência geográfica. O ponto também não tem ciclo de vida próprio: ele é desativado apenas por exclusão, e a ligação com a rota depende da busca por nome, o que multiplica pontos homônimos e dificulta a auditoria de itinerário.

**Evidências:**
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 2.4, que descreve `educa_transport_stops` com `latitude` e `longitude` como `NUMERIC(10, 7)` e a regra de transformação `Cast seguro para coordenada numérica` para o legado varchar.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 4.3, que prevê o endpoint `GET /api/v1/educa/transport/stops` com saída compatível com GeoJSON.
- `_reversa_sdd/Transport/legacy-mapping.md`, seção 6, que prevê a renderização de marcadores ordenados sobre mapa interativo.
- Legado: `modules.ponto_transporte_escolar` e `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Ponto.js`.

**Por que agora:**
A rota do SYSGOV exige ordem determinística de paradas, e a ordenação por texto de nome do legado não garante determinismo quando existem pontos homônimos. A chave geométrica e o identificador estável precisam existir antes da primeira rota criada no alvo.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Registrar pontos de parada com nome, coordenadas numéricas e endereço de referência.
- [ ] 🟡 G-02: Garantir que todo ponto vinculado a uma rota tenha coordenada válida, para permitir a plotagem do itinerário.
- [ ] 🟡 G-03: Permitir a desativação de ponto com motivo, bloqueando novas alocações e preservando o histórico.
- [ ] 🟡 G-04: Disponibilizar a listagem de pontos em formato geográfico compatível com consumo por mapa.
- [ ] 🟡 G-05: Garantir 100% de fidelidade na migração dos pontos do i-Educar, com marcação dos pontos sem coordenada válida.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Pontos migrados com nome preservado | 0% | 100% | Fim do cutover |
| Pontos migrados sem coordenada válida, sinalizados | 0% | 100% | Fim do cutover |
| Pontos em rota ativa sem coordenada | Sem medição | 0% | 60 dias após o cutover |
| Tempo de resposta P95 da listagem de pontos | Sem medição | < 300 ms | 30 dias após o cutover |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: Não haverá roteirização automática de caminho ótimo entre pontos, nem cálculo de distância real por malha viária; a extensão da rota é declarada pelo gestor.
- NG-02: Não haverá captura de coordenada por dispositivo do usuário nem por geolocalização do navegador.
- NG-03: Não haverá integração com serviço externo de geocodificação reversa para descobrir o endereço a partir da coordenada.
- NG-04: Não haverá cadastro de pontos fora do tenant, nem compartilhamento de pontos entre municípios.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 Técnico de transporte, que cadastra os pontos de embarque e desembarque de cada rota, com apoio das famílias que informam a referência do local.

**Usuário secundário:** 🟡 Família do estudante, que consulta a relação de pontos para saber onde o estudante embarca e desembarca.

**Jornada atual (sem a feature):**
1. O técnico busca o ponto pelo nome usando a busca simples.
2. O sistema devolve homônimos sem distinção de rua ou bairro.
3. O usuário confere a coordenada em texto, sem garantia de formato.
4. Não há desenho do itinerário, e a ordem das paradas depende da ordem de digitação.

**Jornada futura (com a feature):**
1. O técnico cadastra o ponto com nome, rua, bairro, cidade e coordenada conferida no mapa.
2. O sistema valida a faixa da coordenada e sinaliza ponto sem coordenada.
3. O ponto é associado à rota com ordem e horário estimado de passagem.
4. A família consulta a relação de pontos e a ordem de embarque na tela da rota.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve permitir cadastrar ponto de parada no tenant corrente com nome obrigatório e até 255 caracteres. | Must | Dado um payload com nome, quando o usuário enviar, então o ponto é criado com `tenant_id` do contexto e o nome normalizado sem espaços duplicados nas extremidades. |
| RF-02 | 🟡 O sistema deve gravar latitude e longitude como valores numéricos com precisão de sete casas decimais. | Must | Dado um payload com latitude `-15,793889`, quando o ponto for salvo, então o valor é gravado como `-15.7938890` e devolvido com a mesma precisão. |
| RF-03 | 🟡 O sistema deve recusar latitude fora do intervalo de menos 90 a 90 e longitude fora do intervalo de menos 180 a 180. | Must | Dado um payload com latitude `120`, quando a validação rodar, então a requisição é rejeitada com erro no campo de latitude. |
| RF-04 | 🟡 O sistema deve registrar o endereço de referência do ponto com código postal, logradouro, número, complemento, bairro, cidade e unidade federativa. | Must | Dado um payload de endereço completo, quando o ponto for salvo, então os sete campos são persistidos e exibidos no detalhe. |
| RF-05 | 🟡 O sistema deve registrar a referência visual do ponto usada por roteiros de coleta e por famílias. | Should | Dado um texto de referência, quando o ponto for salvo, então o texto é exibido na listagem de pontos da rota. |
| RF-06 | 🟡 O sistema deve sinalizar como pendência geográfica o ponto ativo sem coordenada informada. | Must | Dado um ponto sem latitude e sem longitude, quando a listagem for obtida, então o ponto recebe a marcação de pendência geográfica. |
| RF-07 | 🟡 O sistema deve listar pontos do tenant com filtros por nome, bairro, cidade e situação, com paginação. | Must | Dado um tenant com 60 pontos, quando o usuário filtrar por bairro, então a resposta traz apenas os pontos do bairro, limitado ao tamanho de página. |
| RF-08 | 🟡 O sistema deve fornecer a listagem de pontos em formato geográfico compatível com consumo por mapa, contendo identificador, nome e par de coordenadas. | Must | Dado um tenant com pontos ativos, quando a listagem geográfica for solicitada, então a resposta contém o par de coordenadas de cada ponto com latitude e longitude. |
| RF-09 | 🟡 O sistema deve permitir desativar ponto com motivo obrigatório, bloqueando novas alocações de estudantes e preservando as alocações existentes. | Must | Dado um ponto ativo, quando o usuário informar o motivo, então `is_active` passa a `false` e a criação de nova alocação com esse ponto é recusada. |
| RF-10 | 🟡 O sistema deve expor o ponto em contrato TypeScript `TransportStop` no pacote `@sysgov/sdk`. | Should | Dado o pacote publicado, quando o cliente tipar o retorno do endpoint de pontos, então os campos de coordenada são reconhecidos pelo compilador. |

### 6.2 Fluxo Principal (Happy Path)

1. O técnico autorizado abre a tela de pontos de parada e inicia um novo cadastro.
2. O usuário informa o nome do ponto, o endereço de referência e a coordenada conferida no mapa.
3. O sistema valida a faixa da coordenada, normaliza o nome e grava o ponto ativo.
4. O usuário vincula o ponto a uma rota, informando a ordem de passagem e o horário estimado.
5. O sistema exibe a confirmação com o identificador do ponto e a situação da coordenada.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A — Ponto rural sem endereço formal:**
1. O técnico cadastra o ponto com nome, bairro e referência visual, sem logradouro e sem coordenada.
2. O sistema grava o ponto com a marcação de pendência geográfica.
3. O ponto continua utilizável na rota, e a pendência aparece na lista de conferência.

**Fluxo Alternativo B — Reajuste de ponto:**
1. O técnico corrige a coordenada de um ponto já vinculado a rotas.
2. O sistema atualiza a coordenada e mantém a auditoria com o valor anterior.
3. O desenho do itinerário passa a refletir a nova coordenada.

**Fluxo Alternativo C — Desativação de ponto com alocações vigentes:**
1. O técnico desativa o ponto e informa o motivo.
2. O sistema bloqueia novas alocações com o ponto e sinaliza as alocações existentes para revisão.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | Performance | P95 < 300 ms na listagem paginada e < 500 ms na listagem geográfica | Índice por `tenant_id` e por bairro |
| RNF-02 | Isolamento multi-tenant | 100% das consultas filtradas por `tenant_id` | Pontos não são compartilháveis entre tenants |
| RNF-03 | Segurança | Permissões `transport.stops.read` e `transport.stops.write` | RBAC unificado do SYSGOV |
| RNF-04 | Auditoria | Ator, data e valores anteriores e posteriores em toda alteração | Inclui desativação e correção de coordenada |
| RNF-05 | Precisão geográfica | Coordenada armazenada com sete casas decimais | Compatível com datum WGS84 |
| RNF-06 | Integridade | Exclusão física vedada; desativação lógica com `deleted_at` | Preserva vínculos com rotas e alocações |

---

## 8. Design e Interface

**Componentes afetados:** tela de listagem de pontos, formulário de ponto, seletor de ponto na rota, camada de mapa com marcadores ordenados.

**Comportamento esperado:**
🟡 O formulário exibe o nome, o bloco de endereço de referência, a referência visual e o par de coordenadas. A coordenada aceita digitação com ponto decimal ou vírgula, com normalização para o padrão numérico do sistema. O mapa mostra os pontos do tenant com marcador numerado conforme a ordem do itinerário da rota selecionada. A pendência geográfica aparece como rótulo textual `Sem coordenada` ao lado do nome do ponto. A ação de desativar exige preenchimento do motivo e pede confirmação.

**Estados da UI:**
- Estado vazio: 🟡 mensagem informando que nenhum ponto foi cadastrado, com ação de cadastrar o primeiro.
- Estado de carregamento: 🟡 indicador na tabela e no mapa enquanto os dados são obtidos.
- Estado de erro: 🟡 mensagem por campo inválido no formulário e faixa de erro com ação de tentar novamente quando a API falha.
- Estado de sucesso: 🟡 confirmação com o identificador do ponto.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
educa_transport_stops {
  id: UUID                // chave primária
  tenant_id: UUID         // obrigatório
  name: string            // obrigatório, até 255 caracteres
  description: text
  latitude: numeric       // precisão de 7 casas, faixa de -90 a 90
  longitude: numeric      // precisão de 7 casas, faixa de -180 a 180
  postal_code: string     // até 9 caracteres
  street: string          // até 255 caracteres
  number: string          // até 30 caracteres
  complement: string      // até 150 caracteres
  neighborhood: string    // até 150 caracteres
  city_id: UUID           // referência a core_cities
  state_uf: string        // até 2 caracteres
  landmark: text
  is_active: boolean      // padrão true
  created_at: timestamptz
  updated_at: timestamptz
  deleted_at: timestamptz
}
```

**Migrações necessárias:** 🟡 Sim — carga inicial a partir de `modules.ponto_transporte_escolar`, com cast seguro das coordenadas de texto para numérico e marcação dos pontos cuja coordenada não é conversível.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|-------------------------|
| Cadastro de cidades (`core_cities`) | Obrigatória | A escolha de cidade fica indisponível e o endereço pode ser gravado sem cidade |
| Componente de rotas | Obrigatória | O ponto não pode ser associado a itinerário nem receber estudantes |
| Componente de alocação de estudantes | Obrigatória | Nenhum estudante pode ser alocado a um ponto deste componente |
| Auditoria do SYSGOV | Obrigatória | A escrita é recusada com erro explícito |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Coordenada fora da faixa | Latitude `120` ou longitude `200` | 🟡 A requisição é rejeitada com erro no campo correspondente e nenhum ponto é gravado |
| EC-02: Coordenada em formato não conversível | Texto `sem coordenada` no lugar do número | 🟡 A requisição é rejeitada com mensagem que orienta o preenchimento correto |
| EC-03: Ponto com latitude e sem longitude | Usuário informa apenas a latitude | 🟡 A requisição é rejeitada com mensagem que exige o par completo de coordenadas |
| EC-04: Ponto sem coordenada em rota ativa | Ponto com pendência geográfica associado a uma rota | 🟡 O vínculo é permitido e o ponto é marcado como pendência no itinerário e no relatório de conferência |
| EC-05: Homônimos com mesmo nome | Dois pontos com o mesmo nome na mesma rua | 🟡 O sistema permite o cadastro, distingue os registros pelo identificador e pelo endereço completo, e a seleção na rota ocorre por identificador |
| EC-06: Desativação de ponto com alocações vigentes | Usuário desativa ponto com estudantes alocados | 🟡 A desativação é concluída, o motivo é gravado e as alocações existentes são marcadas para revisão |
| EC-07: Falha de timeout na consulta de cidades | Serviço de cidades indisponível no preenchimento do endereço | 🟡 A requisição falha com erro 503 e mensagem de indisponibilidade, sem gravar ponto parcial |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 obrigatória, com resolução de tenant pelo contexto autenticado.
- **Autorização:** 🟡 `transport.stops.read` para consulta e `transport.stops.write` para escrita.
- **Dados sensíveis:** 🟡 a coordenada e o endereço de pontos de embarque de estudantes têm proteção de dado pessoal e de segurança no tratamento de dados do SYSGOV.
- **Auditoria:** 🟡 registro de ator, data e valores anteriores e posteriores em cadastro, edição, correção de coordenada e desativação.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 habilitação por tenant, com a carga dos pontos legados executada antes da ativação do componente de rotas.
- **Como reverter (rollback):** 🟡 desabilitar o componente no tenant e voltar a ler `modules.ponto_transporte_escolar`, preservando a tabela nova para reanálise.
- **Monitoramento pós-deploy:** 🟡 acompanhar contagem de pontos por tenant, pontos com pendência geográfica, divergência entre o total legado e o total migrado e taxa de erro no endpoint geográfico.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | ⚠️ ABERTO: A coordenada é obrigatória para a plotagem do itinerário em mapa ou o traçado pode ser feito por sequência de pontos sem coordenada? | Alto | Produto | Antes do início da implementação |
| OQ-02 | ⚠️ ABERTO: O traçado da rota entre os pontos e a escola de destino deve usar geometria calculada pelo serviço de mapas ou permanece como ligação visual por ordem? | Alto | Produto | Antes do início da implementação |
| OQ-03 | ⚠️ ABERTO: O cadastro de pontos deve ser compartilhado entre escolas do mesmo tenant ou permanece por tenant? | Médio | Produto | 30 dias |
| OQ-04 | ⚠️ ABERTO: Quais campos do endereço de referência são obrigatórios para o atendimento em área rural, em que não há logradouro formal? | Médio | Produto | 30 dias |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Coordenada numérica com validação de faixa | Manter coordenada como texto, como no legado | Só há plotagem e verificação de consistência com valor numérico validado |
| Desativação lógica com motivo e bloqueio de nova alocação | Exclusão física do ponto | Preserva o histórico de rotas e alocações já existente |
| Associação do ponto à rota por identificador | Associação por busca de nome, como no legado | Remove a ambiguidade de homônimos e garante ordem determinística |

---

## Apêndice

### Referências
- `_reversa_sdd/Transport/legacy-mapping.md` — seções 2.4, 3, 4.3 e 6.
- `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md` — isolamento por tenant.
- `_reversa_sdd/adrs/003-unified-person-identity-and-deduplication.md` — identidade única de pessoa.
- Legado: `modules.ponto_transporte_escolar`, `public/vendor/legacy/TransporteEscolar/Assets/Javascripts/Ponto.js`, `ieducar/lib/Portabilis/View/Helper/Input/Resource/SimpleSearchPonto.php`.

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-10-20 | Reversa | Criação inicial a partir do PRD e do mapeamento do módulo Transport |

---

## Relatório de Avaliação

Avaliação automática de qualidade desta spec, executada por `reversa-spec-sdd/scripts/spec_scorer.py`.

```text
============================================================
  SPEC QUALITY REPORT
  Arquivo: D:\SYSTRAT\I-Educar\_reversa_sdd\sdd\pontos-parada-transporte.md
============================================================

  SCORE TOTAL: 100.0/100  —  ⭐ Excelente — Pronta para implementação

  BREAKDOWN POR DIMENSÃO:
  Dimensão             Score      Peso     Contribuição
  --------------------------------------------------
  Completude           100%       30%     30.0/pt
  Testabilidade        100%       25%     25.0/pt
  Clareza              100%       20%     20.0/pt
  Escopo               100%       15%     15.0/pt
  Edge Cases           100%       10%     10.0/pt

  ✅ PONTOS FORTES:
     ✅ Seção 1 (Resumo) presente e preenchida
     ✅ Seção 2 (Contexto) presente e preenchida
     ✅ Seção 3 (Goals) presente e preenchida
     ✅ Seção 4 (Non-Goals) presente e preenchida
     ✅ Seção 5 (Usuários) presente e preenchida

============================================================
```
