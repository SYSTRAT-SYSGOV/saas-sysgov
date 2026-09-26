# Proposta: Fundação do módulo Gestão de Cemitérios (SIGCM) no SYSGOV

## Why

Os municípios clientes do SYSGOV administram cemitérios públicos com planilhas, livros de registro e
sistemas legados sem regra de negócio, o que gera sepultamentos em jazigos lotados, exumações fora do
prazo legal, concessões vencidas sem cobrança e ausência de trilha de auditoria. O repositório de
referência `SYSTRAT-SYSGOV/SYS_CEMITERIO` é apenas um esqueleto em PHP puro (2 commits, sem lógica), e o
DRS SIGCM v1.0 (28/07/2026) já consolidou 36 RFs, 10 RNFs e 10 RNs — é o momento de especificar o
módulo dentro da plataforma, reaproveitando multi-tenant, RBAC, auditoria encadeada e Outbox já
existentes, em vez de manter um sistema paralelo.

## What Changes

- Novo módulo de negócio `Cemiterio` em `apps/api/Modules/Cemiterio` (criado via `php artisan make:module`),
  **aditivo**: nenhuma rota, tabela ou comportamento de módulos existentes é alterado.
- Novo módulo de frontend `apps/web-client/src/modules/cemiterio` (painel do órgão) e uma área pública
  (portal do cidadão/concessionário) sem autenticação SYSGOV para a busca de falecidos.
- Inventário de cemitérios, setores/quadras e jazigos/ossuários com máquina de estados e bloqueio de
  sepultamento em capacidade máxima.
- Operações de inumação, exumação (com bloqueio por prazo legal, exceção judicial auditada e reinício de
  carência na suspensão em campo) e trasladação, com emissão de ordem de serviço, além do lançamento
  retroativo de inumações registradas em livros físicos.
- Concessões temporárias e perpétuas com expiração automática, renovação e notificação 30 dias antes do fim.
- GIS com funções espaciais nativas do MySQL 8 (geometrias, índices espaciais, validação topológica) e mapa
  interativo (Leaflet) sobre imagem de satélite do Google Maps ou provedor similar, com desenho de polígonos e
  geração de jazigos em grade — não há levantamento topográfico (premissa P01 falsa).
- Financeiro: tabela de preços parametrizável, reajuste anual automático pelo IPCA, guias próprias em PDF (em
  lote e avulsas), segunda via, baixa manual de pagamento e inadimplência. Sem integração com ERP: o município
  não tem API para DAM (premissa P03 falsa; RF-24 fora da v1).
- Portal público: busca de falecidos com correspondência aproximada, "Ver no Mapa" e rota; login Gov.br
  (OAuth2) e painel do concessionário.
- Empreiteiros e obras: cadastro, alvará anual, alvará de obra, limite de obras simultâneas, penalidades.
- Vistoria e abandono: vistoria com fotos e risco, processo administrativo de abandono, edital, extinção,
  demolição e reversão do jazigo.
- Perfis padrão do módulo (Administrador Geral, Operador Administrativo, Fiscal de Campo, Coveiro/Operacional,
  Financeiro) criados por município e geridos na gestão de perfis existente do painel do cliente.
- Parametrização por município (tenant) de todos os prazos e dimensões legais — nenhum valor legal fixo
  em código.
- 4 ADRs em `openspec/adrs/` registrando as decisões arquiteturais já tomadas.

## Capabilities

### New Capabilities
- `cemiterio/inventario`: cemitérios, setores/quadras, jazigos/ossuários, estados do jazigo e capacidade.
- `cemiterio/parametros`: parâmetros legais e operacionais por município (prazos, dimensões, limites).
- `cemiterio/operacoes`: inumação, exumação (RN-01/02/03), trasladação, registros históricos e ordens de
  serviço (RF-06..RF-10).
- `cemiterio/concessoes`: concessões temporárias/perpétuas, expiração, renovação e notificações (RF-11..RF-14).
- `cemiterio/gis`: mapa base de satélite, desenho, geração em grade, validação topológica (RN-07/08), camadas,
  busca com zoom e painel lateral (RF-15..RF-19).
- `cemiterio/financeiro`: tabela de preços, reajuste IPCA, guias próprias, lote anual, segunda via, baixa manual
  e inadimplência (RF-20..RF-23).
- `cemiterio/portal`: busca pública de falecidos, mapa e rota, Gov.br e painel do concessionário (RF-25..RF-28).
- `cemiterio/empreiteiros`: empreiteiros, alvarás, limite de obras (RN-09), penalidades (RF-29..RF-32).
- `cemiterio/vistoria-abandono`: vistoria, processo de abandono, edital (RN-10), extinção e reversão
  (RF-33..RF-36).
- `cemiterio/privacidade-auditoria`: perfis padrão, RBAC, tratamento LGPD (RN-04/05/06), acesso restrito à causa
  da morte, auditoria append-only e requisitos não funcionais transversais (RNF-01..RNF-10).

### Modified Capabilities
<!-- Nenhuma: o módulo é aditivo e não altera requisitos de capacidades existentes. -->

## Impact

- **Backend**: novo módulo `apps/api/Modules/Cemiterio` (migrations, models `TenantAware`, policies,
  Form Requests, Resources, jobs, comandos agendados). Reuso de `AuditLogger`, `OutboxPublisher`,
  `App\Support\Money`, `TenantContext`/`ResolveTenant` e do middleware `module-access`.
- **Banco**: tabelas novas com colunas `POLYGON`/`POINT` com SRID e índices espaciais — primeiro uso de
  tipos espaciais na plataforma. A suíte PHPUnit atual roda em sqlite em memória, que não suporta essas
  funções: os testes geoespaciais exigirão um grupo de testes em MySQL (ver design).
- **Frontend**: módulo novo no `apps/web-client`, novas dependências de mapa (Leaflet, react-leaflet,
  Leaflet-Geoman) e regeneração do `moduleRegistry.generated.ts`; componentes somente via `@sysgov/ui`. Perfis
  reutilizam a tela de gestão de perfis existente.
- **Integrações novas**: Gov.br (OAuth2/OIDC) para o portal, API pública do Banco Central para o IPCA e
  provedor de mapa base (Google Map Tiles API ou similar), este com chave contratada.
- **Agendamentos**: expiração de concessões, notificações D-30, reajuste anual de preços, geração de guias em
  1º de janeiro, aptidão de empreiteiros e remoções pendentes.
- **Fora de escopo (v1)**: app mobile nativo, integração RCPN, marketplace de serviços, módulo de luto,
  multilíngue, migração de dados do legado `SYS_CEMITERIO` (o módulo começa do zero), integração com ERP
  municipal/DAM (RF-24) e registro bancário de boletos.
- **Desvios do DRS**: RNF-05/RF-18 (PostgreSQL/PostGIS) substituídos por MySQL 8 espacial (ADR-001); RNF-10
  (JWT) reinterpretado como RBAC por policies com Sanctum.
- **Alternativa descartada**: reconstruir o legado `SYS_CEMITERIO` em PHP puro como sistema separado —
  duplicaria autenticação, multi-tenant, auditoria e design system, sem código de negócio aproveitável
  (ver ADR-002).
