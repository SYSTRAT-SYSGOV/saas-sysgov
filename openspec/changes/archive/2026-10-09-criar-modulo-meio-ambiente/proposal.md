# Proposal

## Why

A SYSTRAT ainda não oferece ao órgão público nenhuma solução para a gestão da Secretaria/Departamento de
Meio Ambiente: hoje o licenciamento ambiental, os autos de infração ambiental, a compensação ambiental, a
gestão de resíduos sólidos, o cadastro de áreas protegidas, o controle de queimadas, a outorga de recursos
hídricos e os relatórios obrigatórios a órgãos de controle (IBAMA/CETESB/INEA) são conduzidos fora do
SYSGOV — tipicamente em planilhas e processos físicos, sem rastreabilidade, sem alerta de prazos e sem
visão consolidada. Isso expõe o município a risco de autuação pelo próprio ente fiscalizador estadual/
federal por falta de controle de prazos (licenças vencidas, outorgas vencidas) e dificulta a prestação de
contas (relatórios obrigatórios, indicadores de política ambiental). O módulo Vistoria já resolve a
fiscalização de campo *genérica* (ordens de serviço, execução offline, auto de infração com assinatura em
tela, processo sancionatório), mas não conhece nenhuma regra própria do direito ambiental (cálculo de
multa pelo Decreto Federal 6.514/2008, compensação ambiental, outorga de água, licenciamento por fases).
Criar o módulo de Meio Ambiente agora consolida esse domínio dentro do SYSGOV reaproveitando a infraestrutura
de fiscalização já validada (Vistoria), de identidade (Pessoas) e de estrutura organizacional (OrgChart),
em vez de duplicá-la.

## What Changes

- Novo módulo `MeioAmbiente` (`apps/api/Modules/MeioAmbiente` + `apps/web-client/src/modules/meio-ambiente`),
  seguindo o padrão `nwidart/laravel-modules` já usado por Vistoria/Capd/Cemiterios.
- Cadastro de empreendimentos sujeitos a licenciamento (pessoa física ou jurídica, atividade, porte,
  georreferenciamento, responsável técnico com CREA/CRBio) como cadastro mestre reaproveitado por
  licenciamento, fiscalização, compensação e outorgas hídricas.
- Processo de licenciamento ambiental por fases (LP, LI, LO, renovação, correção) com controle de prazo de
  validade, condicionantes, documentos exigidos (EIA/RIMA), vistorias técnicas e alertas de vencimento.
- Emissão de auto de infração ambiental com cálculo automático de multa (base legal inicial: Decreto
  Federal 6.514/2008), controle de reincidência, parcelamento e recursos — reaproveitando o fluxo de
  execução de vistoria, assinatura em tela e processo sancionatório já existente no módulo Vistoria em vez
  de duplicá-lo.
- Cálculo e controle de compensação ambiental (percentual sobre o valor do empreendimento), com
  acompanhamento de pagamentos, saldo devedor e destinação dos recursos (fundo municipal, unidade de
  conservação).
- Gestão de resíduos sólidos: cadastro de geradores (domiciliar/comercial/industrial), registro de
  coleta regular/seletiva por volume e destinação, e controle de pontos de logística reversa.
- Cadastro georreferenciado de Áreas de Preservação Permanente (APP), reservas legais e unidades de
  conservação municipal, com consulta em mapa interativo e sobreposição com imóveis.
- Registro de ocorrências de queimada (foco, área queimada, responsável quando identificado) com abertura
  automática de auto de infração ambiental e espaço para cruzamento futuro com imagem de satélite.
- Gestão de recursos hídricos: outorgas de uso da água (poço/captação superficial) e licenças de
  lançamento de efluentes, com alerta de vencimento.
- Relatórios ambientais obrigatórios (ex.: inventário de emissões de GEE, relatório anual de resíduos
  sólidos) gerados e exportados no formato esperado pelo órgão de controle.
- Painel de indicadores ambientais (licenças emitidas, multas aplicadas x arrecadadas, evolução de área
  queimada, cobertura de coleta seletiva) com mapas e gráficos.
- Interoperabilidade: API REST/JSON documentada (mesmo padrão OpenAPI estático do módulo Vistoria) e
  integração M2M para envio/exportação de dados a órgãos estaduais/federais (IBAMA, INEA, CETESB).
- Trilha de auditoria completa (via `AuditLogger`, já usado por todos os módulos) de licenciamento, autos
  de infração, condicionantes, compensações e outorgas, com endpoint de consulta consolidada.

## Capabilities

### New Capabilities

- `meio-ambiente/empreendimentos`: cadastro de empreendimentos sujeitos a licenciamento/outorga/
  fiscalização ambiental (atividade, porte, georreferenciamento, responsável técnico CREA/CRBio),
  reaproveitado como referência pelas demais capacidades deste módulo.
- `meio-ambiente/licenciamento`: processos de licenciamento ambiental por fases (LP/LI/LO/renovação/
  correção), prazos de validade, condicionantes, documentos exigidos (EIA/RIMA), vistorias técnicas e
  alertas de vencimento.
- `meio-ambiente/fiscalizacao-ambiental`: autos de infração ambiental com cálculo automático de multa,
  reincidência, parcelamento e recursos, integrados à execução de campo e ao processo sancionatório do
  módulo Vistoria.
- `meio-ambiente/compensacao-ambiental`: cálculo, cobrança, pagamento e destinação da compensação
  ambiental devida por empreendimentos com impacto significativo.
- `meio-ambiente/residuos-solidos`: cadastro de geradores de resíduos e controle de coleta regular/
  seletiva e de logística reversa.
- `meio-ambiente/areas-protegidas`: cadastro georreferenciado de APPs, reservas legais e unidades de
  conservação municipal, com consulta em mapa e sobreposição com imóveis.
- `meio-ambiente/queimadas`: registro de focos de queimada, autuação automática e espaço de integração
  com fiscalização/imagens de satélite.
- `meio-ambiente/recursos-hidricos`: outorgas de uso da água e licenças de lançamento de efluentes, com
  controle de vazão, finalidade, parâmetros de qualidade e alerta de vencimento.
- `meio-ambiente/relatorios-e-indicadores`: geração/exportação de relatórios ambientais obrigatórios e
  painel de indicadores ambientais (licenças, multas, queimadas, coleta seletiva).
- `meio-ambiente/integracoes-e-api`: API REST/JSON documentada do módulo e integração M2M de envio/
  exportação de dados a órgãos estaduais/federais (IBAMA, INEA, CETESB).
- `meio-ambiente/auditoria`: trilha de auditoria consolidada de todas as etapas do módulo (licenciamento,
  autuação, condicionantes, compensação, outorgas).

### Modified Capabilities

Nenhuma. Este módulo não altera o comportamento hoje especificado de `vistoria`, `pessoas` ou `orgchart` —
apenas consome essas capacidades existentes (execução de fiscalização, identidade de pessoas, estrutura
organizacional) como estão, sem mudar seus requisitos.

## Impact

- **Backend novo**: `apps/api/Modules/MeioAmbiente` completo (Config, Database/Migrations+Seeders,
  Http/{Controllers,Middleware,Requests,Resources}, Models, Policies, Providers, Routes/api.php, Services,
  Events/Listeners, Tests, `module.json`), criado via `php artisan make:module MeioAmbiente`.
- **Dependências entre módulos**: `MeioAmbiente` declara `requires: ["Admin", "Pessoas", "OrgChart",
  "Vistoria"]` em `module.json` — consome `Modules\Pessoas\Models\Pessoa` (responsável técnico/autuado
  pessoa física) e reaproveita o pipeline de execução/documento/assinatura/processo sancionatório de
  `Modules\Vistoria` para a fiscalização ambiental, sem modificar nenhum desses módulos.
- **Frontend novo**: `apps/web-client/src/modules/meio-ambiente` (painel do órgão público) com novo item
  de menu; `moduleRegistry.generated.ts` precisa ser regenerado (`npm run generate:registry`) após o
  módulo existir.
- **Design system**: todas as telas usam exclusivamente primitivas de `@sysgov/ui` (mapa interativo via
  `react-leaflet`, mesmo padrão já usado no painel gerencial de Vistoria).
- **Monetário**: todo valor de multa e de compensação ambiental usa `App\Support\Money` (inteiro em
  centavos), nunca `float`.
- **Chamadas externas**: envio de dados a IBAMA/INEA/CETESB passa pelo padrão Outbox
  (`App\Support\OutboxPublisher` / tabela `outbox_events`), nunca chamada síncrona direta de controller.
- **Auditoria**: toda mutação registrada via `App\Support\AuditLogger`, mesmo padrão de todos os módulos
  existentes.
- **Permissões novas**: um conjunto de permissões `meio_ambiente.*` análogo ao de Vistoria (ver `design.md`),
  sem alterar papéis/permissões de módulos existentes.
