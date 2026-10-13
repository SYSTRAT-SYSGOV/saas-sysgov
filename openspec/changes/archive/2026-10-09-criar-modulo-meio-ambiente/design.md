# Design

## Context

Ver `proposal.md` (Why) para a motivação. Este design assume o monorepo modular do SYSGOV descrito no
`CLAUDE.md` raiz: `apps/api/Modules/{Name}` (nwidart/laravel-modules), multi-tenant por `tenant_id` +
trait `TenantAware`, `AuditLogger` para toda mutação, `App\Support\Money` para valores monetários e
`App\Support\OutboxPublisher` para toda chamada externa assíncrona.

Módulos já existentes relevantes, inspecionados antes deste design:
- **Vistoria** (`apps/api/Modules/Vistoria`): já implementa o pipeline completo de fiscalização de campo
  — `LocalFiscalizavel` (local georreferenciado + proprietário `Pessoa`), `OrdemServico` →
  `ExecucaoVistoria` (offline-first) → `Documento` (auto de infração/notificação, numerado, com PDF) →
  `Assinatura` (assinatura em tela) → `ProcessoSancionatorio` (máquina de estados de defesa/julgamento/
  recurso). `ProcessoSancionatorio.penalidade_centavos` é hoje um valor livre informado manualmente pelo
  julgador — não existe nenhum cálculo automático de multa.
- **Pessoas** (`apps/api/Modules/Pessoas`): Cadastro Único Centralizado, mas **apenas pessoa física**
  (`Pessoa.cpf` criptografado). Não existe cadastro de pessoa jurídica em nenhum módulo do monorepo — o
  único CNPJ existente é o do próprio tenant (`App\Models\Tenant`), usado para provisionamento, não para
  cadastrar terceiros.
- **OrgChart**: hierarquia organizacional, consumida por outros módulos para escopo de dados (ABAC) e
  permissões por unidade.
- **Finance**: usa `App\Support\Money`; referência de padrão monetário, não de domínio ambiental.

Não existe hoje, em nenhum módulo, cadastro de pessoa jurídica, georreferenciamento de polígono (apenas
ponto lat/long em `LocalFiscalizavel`), nem módulo de "Gestão de Frota" (citado no requisito de resíduos
sólidos como integração desejável).

## Goals / Non-Goals

**Goals:**
- Cobrir as 13 capacidades do `proposal.md` com um módulo novo, autocontido, seguindo rigorosamente a
  convenção de módulo do repositório (`Config/Database/Http/Models/Policies/Providers/Routes/Services/
  Events/Listeners/Tests/module.json`).
- Reaproveitar ao máximo a infraestrutura já validada por Vistoria (execução de campo, documento com
  assinatura, processo sancionatório) para a fiscalização ambiental, em vez de duplicá-la.
- Introduzir, pela primeira vez no monorepo, um cadastro leve de pessoa jurídica — mas escopado ao próprio
  módulo de Meio Ambiente (não como extensão de `Modules/Pessoas`), evitando acoplar uma mudança estrutural
  grande (PF vs. PJ) em um módulo de identidade compartilhado por todo o sistema.

**Non-Goals:**
- Não implementar, nesta mudança, um cadastro de pessoa jurídica genérico e reutilizável por todo o
  SYSGOV (isso seria uma mudança própria em `Modules/Pessoas`, fora de escopo aqui).
- Não implementar o módulo de "Gestão de Frota" citado no requisito de resíduos sólidos — a integração
  com frota é registrada como ponto de extensão futuro (ver Open Questions), não bloqueando este módulo.
- Não implementar de fato o cruzamento com imagens de satélite para queimadas — apenas o campo de
  referência para quando essa capacidade existir.
- Não implementar clientes reais de IBAMA/INEA/CETESB (cada órgão tem seu próprio contrato técnico,
  frequentemente não documentado publicamente) — apenas o mecanismo de exportação/API documentada e o
  ponto de extensão via Outbox, como já feito para PNCP/Siconfi/TCE em outros módulos.

## Decisions

### D1 — Módulo novo `MeioAmbiente`, dependente de Admin, Pessoas, OrgChart e Vistoria
Criado via `php artisan make:module MeioAmbiente` (scaffold padrão, já inclui teste de isolamento
multi-tenant). `module.json`:
```json
{
    "name": "MeioAmbiente",
    "alias": "meio_ambiente",
    "priority": 55,
    "requires": ["Admin", "Pessoas", "OrgChart", "Vistoria"],
    "menu": { "group": "GESTÃO & FISCALIZAÇÃO", "label": "Meio Ambiente", "icon": "Leaf", "order": 55, "permission": "meio_ambiente.view" }
}
```
**Alternativa considerada**: estender o módulo Vistoria em vez de criar um módulo novo. Rejeitada — o
domínio ambiental (licenciamento, compensação, resíduos, outorgas, APPs/UCs, relatórios regulatórios) é
muito maior que fiscalização de campo e tem dono funcional distinto (Secretaria de Meio Ambiente vs.
Secretaria de Agricultura); misturar os dois violaria a convenção de módulo autocontido por domínio do
`CLAUDE.md`.

### D2 — `Empreendimento` é um model próprio do módulo, não uma extensão de `Modules\Pessoas`
`Empreendimento` (tabela `meio_ambiente_empreendimentos`) guarda `titular_pessoa_id` (nullable, FK para
`Modules\Pessoas\Models\Pessoa`, quando o titular é PF já cadastrada) **ou** `cnpj`/`razao_social` próprios
(quando o titular é PJ) — regra de "um dos dois é obrigatório" validada no Service, não no banco.
`responsavel_tecnico` é um model próprio (`meio_ambiente_responsaveis_tecnicos`) com
`pessoa_id` (nullable, FK Pessoas) + `nome`/`registro_profissional`/`tipo_registro` sempre preenchidos
diretamente, pelo mesmo motivo.

**Alternativa considerada**: adicionar suporte a pessoa jurídica dentro de `Modules\Pessoas`. Rejeitada
para esta mudança — alteraria a base de identidade compartilhada por todos os módulos existentes (CAPD,
Cemitérios, Cursos, Requerimentos, Vistoria) só para atender a um cadastro específico de Meio Ambiente;
fica registrada como extensão futura caso outro módulo (ex.: Licita/fornecedores) também precise de PJ.

**Alternativa considerada**: tratar `Empreendimento` como um novo `tipo` de `Vistoria\LocalFiscalizavel`.
Rejeitada — `LocalFiscalizavel` modela "local sujeito a fiscalização" (ponto lat/long + proprietário PF),
enquanto `Empreendimento` precisa de PJ, porte, atividade e é referenciado por capacidades que nada têm a
ver com fiscalização de campo (outorga de água, compensação ambiental). Acoplar os dois criaria uma
dependência de schema do módulo Vistoria sobre um conceito que é do domínio ambiental.

### D3 — Fiscalização ambiental reaproveita o pipeline do Vistoria via um model de extensão fina
`AutoInfracaoAmbiental` (tabela `meio_ambiente_autos_infracao`) tem `documento_id` (FK para
`Modules\Vistoria\Models\Documento`, 1:1) e carrega apenas o que é específico do direito ambiental:
`tipo_infracao`, `area_afetada_ha`, `reincidente`, `valor_multa_sugerido_centavos`. A emissão do documento
em si (numeração, PDF, assinatura em tela), a execução de campo (`OrdemServico`/`ExecucaoVistoria`) e a
máquina de estados de defesa/julgamento/recurso continuam inteiramente dentro de
`Modules\Vistoria\Services\DocumentoService` e `ProcessoSancionatorio` — o módulo de Meio Ambiente **não**
duplica essa lógica, apenas a invoca e anexa o cálculo automático de multa como valor sugerido.

**Alternativa considerada**: duplicar `ProcessoSancionatorio`/`Documento` dentro de Meio Ambiente com um
cálculo de multa embutido desde o início. Rejeitada — duplicaria LGPD/criptografia, numeração sequencial,
assinatura em tela e a máquina de estados já testada em Vistoria, violando DRY sem ganho real (o cálculo
de multa é a única parte genuinamente nova).

**Trade-off aceito**: `Modules\Vistoria` passa a ser uma dependência obrigatória (`requires`) de
`MeioAmbiente`. Isso é consistente com o padrão já usado por `Capd`/`Vistoria`, que dependem de `OrgChart`/
`Pessoas`.

### D4 — Tabela de enquadramento legal de multas é dado configurável, não código
A tabela de enquadramento (tipo de infração → valor base, critério de proporcionalidade como "por
hectare", agravante de reincidência) é armazenada em tabela própria (`meio_ambiente_tabelas_multa`),
semeada inicialmente com os valores do Decreto Federal 6.514/2008, e editável por usuário com permissão
`meio_ambiente.chefia`. **Por quê**: a legislação de referência pode mudar ou o município pode adotar
legislação estadual/municipal complementar sem precisar de deploy.

### D5 — Compensação e resíduos sólidos como sub-capacidades vinculadas, não o próprio processo de licenciamento
`CompensacaoAmbiental` e `GeradorResiduo`/`ColetaResiduo` são modeladas como entidades vinculadas
(`empreendimento_id`/`processo_licenciamento_id`), e não como campos embutidos em `ProcessoLicenciamento`,
porque compensação tem seu próprio ciclo de vida de pagamentos (potencialmente anos após a emissão da
licença) e resíduos sólidos nem sempre está ligado a um processo de licenciamento (geradores domiciliares
não passam por licenciamento).

### D6 — Áreas protegidas usam geometria de polígono (novo para o monorepo)
Nenhum módulo hoje armazena polígono — `LocalFiscalizavel` e os demais cadastros georreferenciados usam
apenas ponto (`latitude`/`longitude` decimal). `AreaProtegida.geometria` usa coluna `JSON` com GeoJSON
`Polygon`/`MultiPolygon` (mesma abordagem leve já usada por `PainelGerencialService` do Vistoria, que
monta GeoJSON em memória a partir de pontos). **Alternativa considerada**: tipo espacial nativo do MySQL
(`POLYGON`, índice `SPATIAL`). Rejeitada por ora — nenhum outro módulo usa tipos espaciais nativos, o
volume de áreas protegidas por tenant é pequeno (dezenas a centenas), e a verificação de sobreposição
(D7) pode ser feita em PHP sem índice espacial nesse volume; fica como otimização futura se o volume
crescer.

### D7 — Verificação de sobreposição é um cálculo on-demand, não uma coluna materializada
`verificarSobreposicao()` calcula a interseção geométrica em PHP (biblioteca de geometria pura, sem
dependência de extensão nativa) no momento da consulta, em vez de materializar o resultado em uma tabela
de relacionamento atualizada por job. **Por quê**: simplicidade dado o volume esperado (D6); evita ficar
com dados de sobreposição desatualizados quando uma área protegida é redesenhada.

### D8 — Integração com órgãos externos segue o padrão Outbox + M2M de `VistoriaIntegracao`
`MeioAmbienteIntegracao` replica o padrão já usado por `Modules\Vistoria\Models\VistoriaIntegracao` /
`Modules\Capd\Models\RhIntegracao`: rota própria só com middleware `api`, token mapeia para o tenant,
retorna 401 para credencial ausente ou inválida. Envio ativo (push) para órgãos que exigirem passa por
`App\Support\OutboxPublisher` (tabela `outbox_events`), nunca chamada HTTP síncrona de controller — mesmo
racional de PNCP/Siconfi/TCE.

### D9 — Permissões seguem o padrão granular de `vistoria.*`
```
meio_ambiente.view
meio_ambiente.chefia                        (administrativo integral, inclui painel e relatórios)
meio_ambiente.empreendimentos.manage
meio_ambiente.licenciamento.manage
meio_ambiente.licenciamento.vistoriar       (registrar vistoria técnica/parecer)
meio_ambiente.fiscalizacao.autuar
meio_ambiente.compensacao.manage
meio_ambiente.residuos.manage
meio_ambiente.areas_protegidas.manage
meio_ambiente.queimadas.registrar
meio_ambiente.recursos_hidricos.manage
meio_ambiente.integracoes.manage
meio_ambiente.auditoria.view
```
Julgamento/recurso do processo sancionatório ambiental usa a policy já existente de
`Modules\Vistoria\Policies\ProcessoSancionatorioPolicy` aplicada ao `Documento` subjacente — não se cria
uma permissão de julgamento duplicada.

### D10 — OpenAPI estático em `/api/meio-ambiente/docs`, mesmo padrão de `/api/docs` do Vistoria
Nenhum módulo do monorepo usa dependência de geração automática de OpenAPI — `openapi.yaml` escrito à mão
e servido via Swagger UI por CDN, fora do prefixo de rotas autenticadas do módulo (seção 14.4 de Vistoria
é o precedente direto).

## Risks / Trade-offs

- **[Risco] Acoplamento a `Modules\Vistoria`** → se o schema de `Documento`/`ProcessoSancionatorio` mudar
  no futuro, `MeioAmbiente` quebra junto. Mitigação: `AutoInfracaoAmbiental` só referencia `documento_id`
  como chave estrangeira simples e não lê campos internos de `Documento` além do necessário; testes de
  integração cobrem o contrato entre os dois módulos.
- **[Risco] Cálculo de multa por decreto federal ficar desatualizado** → valores/critérios do Decreto
  6.514/2008 podem ser atualizados por nova norma. Mitigação: tabela configurável (D4) em vez de valores
  hard-coded, editável sem deploy.
- **[Risco] Geometria em JSON sem índice espacial (D6) não escalar** → se o número de áreas protegidas por
  tenant crescer muito, `verificarSobreposicao()` em PHP pode ficar lento. Mitigação: decisão documentada
  como não-definitiva; migração para tipo espacial nativo do MySQL é um refactor isolado e não quebra a
  spec (o contrato observável — "retorna as áreas sobrepostas" — não muda).
- **[Risco] Falta de módulo de Gestão de Frota** → o requisito de resíduos sólidos pede integração com
  frota para rotas de coleta; sem esse módulo, a rota de coleta fica como campo texto livre em vez de
  referência a um recurso de frota real. Mitigação: campo `rota` modelado como string livre nesta
  primeira versão, com estrutura preparada para, no futuro, trocar por uma FK quando/se um módulo de
  Frota existir — não bloqueia a entrega do requisito observável de "registrar volume e destinação".

## Open Questions

- Confirmar com o usuário se a tabela de enquadramento legal inicial (Decreto 6.514/2008) deve já vir
  semeada com os valores reais do decreto no seeder, ou se a semente inicial pode ser um conjunto
  reduzido/exemplo a ser parametrizado pela Secretaria antes de uso em produção — não altera a spec, a
  abordagem (D4) ou a quebra de tarefas, só o conteúdo do seeder.
- Confirmar o formato de exportação esperado por cada órgão (IBAMA/INEA/CETESB) quando a integração real
  for contratada — não bloqueia esta mudança, que entrega o mecanismo de exportação genérico (D8) e pode
  ser parametrizado por órgão depois, sem mudar a spec.
