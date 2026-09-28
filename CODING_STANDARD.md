SYSTRAT GOVERNANÇA PÚBLICA · SYSGOV
CODING STANDARD — SYSGOV
Guia Canônico de Padrões de Arquitetura, Engenharia e Escrita de Código
26 de setembro de 2026
1. Visão Geral
O SYSGOV é uma plataforma SaaS multi-tenant desenvolvida pela SYSTRAT, voltada à governança, transparência e gestão da administração pública municipal e estadual. O ecossistema contempla planejamento orçamentário e fiscal, execução financeira, compras governamentais, gestão patrimonial e cemiterial, recursos humanos e organograma institucional, operando integrações diretas com sistemas estruturantes como o Portal Nacional de Contratações Públicas (PNCP), a Secretaria do Tesouro Nacional (Siconfi) e os Tribunais de Contas dos Estados (TCEs).
O repositório é unificado sob uma arquitetura de monorepo utilizando npm workspaces, estruturado nos seguintes pacotes e aplicações:
apps/api: Monólito modular em Laravel 13 e PHP 8.4 gerenciado via nwidart/laravel-modules, exposto por padrão na porta 8000.
apps/web: Painel Administrativo Corporativo SYSTRAT, implementado em React 19, TypeScript e Tailwind CSS v4, na porta 5173 (identidade visual ancorada na paleta navy escura).
apps/web-client: Painel Operacional do Ente Federativo/Cliente Público, desenvolvido em React 19, TypeScript e Tailwind CSS v4, na porta 5174 (identidade visual pautada no Padrão Digital de Governo GOV.BR azul).
packages/ui (@sysgov/ui): Biblioteca compartilhada de componentes de interface construída sobre Tailwind CSS v4, Radix UI primitivos e Class Variance Authority (CVA), derivada do ecossistema shadcn/ui.
packages/sdk (@sysgov/sdk): Pacote contendo clientes tipados de API, interfaces de domínio e definições canônicas de transporte de dados TypeScript consumidas pelas aplicações front-end.
Atenção: Este documento possui autoridade normativa sobre a estilística, semântica e estruturação do código-fonte. Atua de maneira estritamente complementar ao AGENTS.md (contrato primário do repositório), ao DESIGN_SYSTEM.md e aos manuais PADRÃO SYSGOV — ... e PADRÃO VISUAL SYSGOV — .... É vedado inventar convenções, abstrações não consolidadas, variantes de cores ou componentes sem homologação prévia nesses contratos canônicos.
2. Princípios Gerais de Engenharia
O desenvolvimento no SYSGOV obedece aos pilares fundamentais da engenharia de software corporativa:
SOLID e Coesão: Responsabilidade única estrita por classe e função. Baixo acoplamento entre módulos de domínio com dependências orquestradas por injeção e inversão de controle.
DRY Consciente: Reutilização de código de infraestrutura e regras genéricas através de packages e serviços, evitando abstrações precoces que sacrifiquem a legibilidade do código de negócio.
Configuração Desacoplada e Ambiente: Nenhuma credencial ou URL sensível fixada em código. Respeito irrestrito ao padrão Twelve-Factor App com parametrização via arquivos .env e carregamento de configurações pelo ecossistema nativo do framework.
Operações de Banco e Consultas Eficientes: Migrations aditivas e retrocompatíveis, criação mandatória de índices compostos guiados por predicados de consulta e prevenção intransigente a problemas de N+1 queries via carregamento antecipado (eager loading).
Multi-tenant como Requisito de Segurança: O isolamento de dados entre clientes não constitui uma funcionalidade de negócio, mas uma salvaguarda primária de infraestrutura e segurança da informação. O vazamento de contexto entre tenants acarreta violação severa de conformidade.
Segurança Ofensiva e Defensiva: Validação rigorosa de todos os dados de entrada na camada de transporte, higienização de saídas, aplicação de cabeçalhos de CORS restritivos, controle estrito de limites de requisição (rate limiting), proteção contra falsificação de requisições e armazenamento de arquivos restrito a discos seguros com nomes aleatórios e checagem de MIME type real.
Convenção Linguística de Nomenclatura:
Domínio de Negócio em Português (pt-BR): Variáveis que expressam regras públicas, rótulos de tela, nomes de tabelas operacionais, status de processos, campos de banco e comentários técnicos devem ser redigidos em português claro (exemplo: concessao, falecido_id, valor_recolhido_centavos, modoVisao).
Código Técnico e Arquitetural em Inglês (en-US): Classes estruturais, interfaces de engenharia, métodos nativos de framework, handlers e design patterns seguem as convenções globais de engenharia (exemplo: FinanceServiceProvider, TenantContextInterface, AuditLogger, OutboxPublisher).
3. Backend — Laravel 13 / PHP 8.4
3.1 Cabeçalho de Arquivo
Todo e qualquer arquivo com extensão .php dentro da aplicação deve, obrigatoriamente, iniciar com a diretiva de tipagem estrita declarada imediatamente após a tag de abertura, seguida de uma linha em branco e do namespace canônico do módulo.
php
<?php
declare(strict_types=1);
namespace Modules\Finance\Services;
3.2 Classes e Injeção de Dependências
Para prevenir heranças indesejadas e garantir o desacoplamento, toda classe deve ser declarada como final class, salvo quando expressamente concebida como classe base abstrata. A injeção de dependências deve explorar os recursos modernos do PHP 8.4, priorizando constructor property promotion:
Services e Handlers de Negócio: Utilizam visibilidade private.
Controllers HTTP: Utilizam visibilidade private readonly.
php
namespace Modules\Finance\Services;
use App\Support\AuditLogger;use App\Support\OutboxPublisher;
final class FinanceService{    public function __construct(        private AuditLogger $audit,        private OutboxPublisher $outbox,    ) {}}
3.3 Models (Eloquent)
Todos os models representativos de entidades operacionais dos entes federativos devem incorporar obrigatoriamente a trait App\Models\Concerns\TenantAware. A declaração do array $fillable deve conter de forma expressa a chave tenant_id e todos os atributos persistíveis. Os atributos devem ser convertidos tipadamente através do array $casts, e os métodos de associação devem possuir tipos de retorno explícitos do Eloquent.
php
namespace Modules\Finance\Models;
use App\Models\Concerns\TenantAware;use Illuminate\Database\Eloquent\Model;use Illuminate\Database\Eloquent\Relations\BelongsTo;use Modules\OrgChart\Models\OrgUnit;
final class Revenue extends Model{    use TenantAware;
    /**     * @var list<string>     */    protected $fillable = [        'tenant_id',        'org_unit_id',        'description',        'amount_cents',        'occurred_at',        'due_at',        'paid_at',        'status',        'contract_id',        'budget_unit_id',    ];
    /**     * @var array<string, string>     */    protected $casts = [        'tenant_id' => 'integer',        'org_unit_id' => 'integer',        'amount_cents' => 'integer',        'occurred_at' => 'date',        'due_at' => 'date',        'paid_at' => 'date',        'contract_id' => 'integer',        'budget_unit_id' => 'integer',    ];
    public function orgUnit(): BelongsTo    {        return $this->belongsTo(OrgUnit::class, 'org_unit_id');    }}
3.4 Migrations
As migrations de banco de dados devem adotar a sintaxe de classe anônima com retorno tipado nas assinaturas dos métodos up() e down(). A integridade multi-tenant demanda chaves estrangeiras com ação de deleção em cascata e índices que obrigatoriamente iniciem pela coluna tenant_id.
php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration {    public function up(): void    {        Schema::create('revenues', function (Blueprint $table): void {            $table->id();            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();            $table->foreignId('org_unit_id')->nullable()->constrained('org_units')->nullOnDelete();            $table->string('description', 255);            $table->unsignedBigInteger('amount_cents');            $table->date('occurred_at');            $table->date('due_at')->nullable();            $table->date('paid_at')->nullable();            $table->string('status', 30)->default('pending');            $table->unsignedBigInteger('contract_id')->nullable();            $table->unsignedBigInteger('budget_unit_id')->nullable();            $table->timestamps();            $table->softDeletes();
            $table->index(['tenant_id', 'occurred_at']);            $table->index(['tenant_id', 'status']);        });    }
    public function down(): void    {        Schema::dropIfExists('revenues');    }};
3.5 Form Requests
Toda requisição com corpo mutável (POST, PUT, PATCH) é submetida a um Form Request específico. A autorização deve validar expressamente as Policies do módulo via $this->user()?->can(...), e as regras de validação devem ser construídas através de listas de regras (arrays estruturados), recusando concatenação de pipes textuais.
php
namespace Modules\Finance\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;use Modules\Finance\Models\Revenue;
final class StoreRevenueRequest extends FormRequest{    public function authorize(): bool    {        return $this->user()?->can('create', Revenue::class) === true;    }
    /**     * @return array<string, list<mixed>>     */    public function rules(): array    {        return [            'description' => ['required', 'string', 'max:255'],<br/>            'amount_cents' => ['required', 'integer', 'min:1'],            'occurred_at' => ['required', 'date'],            'due_at' => ['nullable', 'date', 'after_or_equal:occurred_at'],<br/>            'status' => ['sometimes', 'string', 'in:pending,paid,overdue,cancelled'],<br/>            'org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],        ];    }}
3.6 Services
A camada de serviço centraliza toda a inteligência e orquestração de transação de negócio. Operações mutacionais devem ser executadas invariavelmente sob o escopo de DB::transaction(), registrando o log de auditoria via AuditLogger e publicando eventos de mensageria assíncrona por meio do OutboxPublisher. Os retornos devem ser tipados com as instâncias dos models.
php
namespace Modules\Finance\Services;
use App\Support\AuditLogger;use App\Support\OutboxPublisher;use Illuminate\Support\Facades\DB;use Modules\Finance\Models\Revenue;
final class FinanceService{    public function __construct(        private AuditLogger $audit,        private OutboxPublisher $outbox,    ) {}
    /**     * @param array<string, mixed> $data     */    public function createRevenue(array $data): Revenue    {        $revenue = DB::transaction(fn (): Revenue => Revenue::create($data));
        $this->audit->record(            module: 'finance',<br/>            action: 'created',<br/>            resource: 'revenue:' . $revenue->getKey(),<br/>            before: null,<br/>            after: $revenue->toArray()        );
        $this->outbox->publish('finance.revenue.created', [            'revenue_id' => $revenue->getKey(),            'amount_cents' => $revenue->amount_cents,            'occurred_at' => $revenue->occurred_at->toDateString(),        ]);
        return $revenue;    }
    /**     * @param array<string, mixed> $data     */    public function updateRevenue(Revenue $revenue, array $data): Revenue    {        $before = $revenue->toArray();
        $updated = DB::transaction(function () use ($revenue, $data): Revenue {            $revenue->update($data);            return $revenue->refresh();        });
        $this->audit->record(            module: 'finance',<br/>            action: 'updated',<br/>            resource: 'revenue:' . $updated->getKey(),<br/>            before: $before,<br/>            after: $updated->toArray()        );
        $this->outbox->publish('finance.revenue.updated', [            'revenue_id' => $updated->getKey(),            'status' => $updated->status,        ]);
        return $updated;    }}
3.7 Controllers
Controllers exercem papel puramente de mediação HTTP. Eles recebem o transporte validado, invocam o Service correspondente, nunca contêm regras de persistência complexa e sempre produzem instâncias de JsonResponse. A identificação do ente é obtida exclusivamente via injeção contextual do tenant.
php
namespace Modules\Finance\Http\Controllers;
use App\Http\Controllers\Controller;use App\Support\TenantContext;use Illuminate\Http\JsonResponse;use Modules\Finance\Http\Requests\StoreRevenueRequest;use Modules\Finance\Http\Requests\UpdateRevenueRequest;use Modules\Finance\Models\Revenue;use Modules\Finance\Services\FinanceService;
final class FinanceController extends Controller{    public function __construct(        private readonly FinanceService $service,        private readonly TenantContext $tenantContext,    ) {}
    public function store(StoreRevenueRequest $request): JsonResponse    {        $payload = array_merge($request->validated(), [            'tenant_id' => $this->tenantContext->id(),        ]);
        $revenue = $this->service->createRevenue($payload);
        return response()->json($revenue, 201);    }
    public function update(UpdateRevenueRequest $request, Revenue $revenue): JsonResponse    {        $this->authorize('update', $revenue);
        $updated = $this->service->updateRevenue($revenue, $request->validated());
        return response()->json($updated, 200);    }}
3.8 Definição de Rotas
O roteamento modularizado localiza-se em Routes/api.php dentro de cada módulo. As rotas devem receber o conjunto uniforme de middlewares de segurança do sistema, manter prefixo limpo com o namespace do domínio e priorizar implicit route model binding.
php
use Illuminate\Support\Facades\Route;use Modules\Finance\Http\Controllers\FinanceController;use Modules\Finance\Http\Controllers\FinanceSummaryController;
Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:finance'])    ->prefix('api/finance')    ->group(function (): void {<br/>        Route::get('/summary', [FinanceSummaryController::class, 'summary']);<br/>        Route::get('/revenues', [FinanceController::class, 'index']);<br/>        Route::post('/revenues', [FinanceController::class, 'store']);<br/>        Route::get('/revenues/{revenue}', [FinanceController::class, 'show']);<br/>        Route::put('/revenues/{revenue}', [FinanceController::class, 'update']);<br/>        Route::delete('/revenues/{revenue}', [FinanceController::class, 'destroy']);    });
3.9 Tratamento de Moeda, Outbox e Auditoria
O tratamento monetário dentro da plataforma SYSGOV obedece aos seguintes postulados de infraestrutura:
Valores Monetários: O uso de tipos de ponto flutuante (float, double) é expressamente proibido para cálculos ou persistência financeira. Valores são expressos como inteiros em centavos (amount_cents como unsignedBigInteger) e manipulados através da classe auxiliar de suporte App\Support\Money.
Padrão Transacional Outbox: Nenhuma integração HTTP ou comunicação síncrona com entidades externas (APIs de Bancos, PNCP, Siconfi ou Tribunais de Contas) pode ocorrer no ciclo da requisição do controller. Eventos de domínio são persistidos na tabela outbox_events na mesma transação atômica dos dados via App\Support\OutboxPublisher, sendo consumidos por workers dedicados em fila de background.
Trilha Imutável de Auditoria: Qualquer mutação em tabelas de negócio exige despacho automático de evento auditável via App\Support\AuditLogger. Os registros são armazenados em audit_logs contemplando o identificador do tenant, identificador do usuário, módulo, verbo de ação, nome do recurso (tipo:id), payloads serializados de antes e depois da operação, endereço IP de origem, agente de usuário e carimbo temporal UTC.
3.10 Especificação module.json
Cada módulo Laravel deve manter na sua raiz um arquivo declarativo module.json contendo metadados completos de execução, provedores de serviço e a configuração dos itens de navegação vinculados às permissões do RBAC.
json
{  "name": "Finance",<br/>  "alias": "finance",<br/>  "description": "Módulo de Gestão Financeira, Orçamentária e Fiscal Municipal",<br/>  "priority": 30,<br/>  "providers": [    "Modules\\Finance\\Providers\\FinanceServiceProvider"  ],  "requires": [],<br/>  "menu": {<br/>    "label": "Financeiro",<br/>    "icon": "CircleDollarSign",<br/>    "order": 30,<br/>    "permission": "finance.view",<br/>    "permissions": [      "finance.view",      "finance.manage"    ]  }}
4. Frontend — React 19 + TypeScript
4.1 Ordem Canônica de Importações
Os módulos de interface devem adotar de forma consistente a seguinte ordenação hierárquica em seus arquivos TypeScript, agrupando dependências e separando blocos com uma linha em branco:
Módulos nativos do React, hooks primários e bibliotecas de ecossistema externo.
Camada de contexto do núcleo do sistema (@/core/...).
Componentes fundamentais do design system (@/components/ui ou @sysgov/ui).
Funções utilitárias e de formatação globais (@/lib/...).
Tipos estruturais de bibliotecas e componentes externos (type { ... }).
Módulos locais relativos, camadas de API e contratos do diretório (../api, ./views/...).
tsx
import React, { useState, useMemo } from 'react';
import { useTenant } from '@/core/tenant/useTenant';
import { PageHeader, Card, Button } from '@/components/ui';
import { paraDataOrdenavel } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { cemiteriosApi, erroApi, ESTADOS, type Parque } from '../api';
4.2 Componentes e Assinaturas de Interface
Todo componente visual deve ser declarado via export const com a tipagem explícita React.FC<Props>. As propriedades são descritas formalmente por meio de interfaces nomeadas.
tsx
export interface CemiteriosModuleProps {  initialCemiterioId?: number | null;<br/>  readOnly?: boolean;}
export const CemiteriosModule: React.FC<CemiteriosModuleProps> = ({  initialCemiterioId = null,  readOnly = false,}) => {  return (    <div className="flex flex-col gap-6 p-6">      <PageHeader        title="Gestão de Cemitérios"        description="Administração de necrópoles, concessões e ocupação funerária"      />    </div>  );};
4.3 Camada de Transporte e Clientes de API (api.ts)
As operações assíncronas com o backend são encapsuladas em um arquivo local api.ts. Devem utilizar helpers genéricos (get, post, put, del) parametrizados com a base da rota, retornando dados estritamente tipados e normalizando erros com funções padronizadas.
ts
import { apiClient } from '@/core/api/apiClient';import type { FeatureCollection } from 'geojson';
const base = '/cemiterios';
const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> =>  (await apiClient.get<T>(`${base}${url}`, { params })).data;
const post = async <T, B = unknown>(url: string, body: B): Promise<T> =>  (await apiClient.post<T>(`${base}${url}`, body)).data;
export const cemiteriosApi = {  obterParques: () => get<Parque[]>('/parques'),<br/>  obterCamadaGis: (camada: 'parques' | 'setores' | 'jazigos', bbox: [number, number, number, number]) =>    get<FeatureCollection>('/gis/camadas', {      camada,      bbox: bbox.map((coord) => coord.toFixed(7)).join(','),    }),  salvarGeometria: (tipo: string, id: number, geojson: object) =><br/>    post<{ sucesso: boolean }>(`/gis/geometrias/${tipo}/${id}`, geojson),};
export const erroApi = (erro: unknown): string => {  if (typeof erro === 'object' && erro !== null && 'response' in erro) {    const res = (erro as { response?: { data?: { message?: string } } }).response;    return res?.data?.message ?? 'Falha na comunicação com o servidor institucional.';  }  return 'Ocorreu um erro inesperado durante a execução da operação.';};
4.4 Gerenciamento de Estado e Ciclo de Dados
O carregamento de recursos nos componentes deve priorizar o hook padronizado useDados (ou equivalente homologado), que expõe controle de revalidação, indicadores de carregamento e captura elegante de exceções sem disparar múltiplos ciclos de renderização.
tsx
const {  dados: listaParques,<br/>  carregando: carregandoParques,<br/>  erro: erroParques,<br/>  recarregar: recarregarParques,} = useDados(() => cemiteriosApi.obterParques(), []);
4.5 Modais e Formulários Padronizados
Interfaces de inserção ou edição de registros operacionais utilizam a abstração modular FormModal com arrays declarativos de campos tipados, garantindo a uniformidade visual preconizada pelo Design System.
tsx
<FormModal  aberto={modalAberto}  titulo="Cadastrar Nova Quadra ou Setor"  aoFechar={() => setModalAberto(false)}  aoSubmeter={async (valores) => {    await cemiteriosApi.salvarSetor(valores);    recarregarSetores();  }}  campos={[    {      nome: 'codigo',<br/>      rotulo: 'Código da Quadra/Setor (ex: Q-01)',<br/>      tipo: 'texto',<br/>      obrigatorio: true,    },    {      nome: 'capacidade_jazigos',<br/>      rotulo: 'Capacidade Total Estimada',<br/>      tipo: 'numero',<br/>      obrigatorio: true,    },  ]}/>
4.6 Contexto de Domínio e Divisão Estrutural
O compartilhamento de estado dentro de um módulo de tela única ou múltiplas abas deve ser encapsulado por um Context Provider local. O objeto encapsulado no value deve utilizar useMemo estrito para evitar renderizações parasitas. Os blocos de renderização de páginas extensas devem conter marcadores textuais padronizados.
tsx
{/* ── 1. Painel Superior de Indicadores (KPI Cards no Padrão CAPD) ── */}<section className="grid grid-cols-1 md:grid-cols-4 gap-4">  <KpiCard titulo="Total de Jazigos" valor={metricas.totalJazigos} /></section>
{/* ── 2. Visualizador Cartográfico e Vetorial (GIS) ── */}<section className="h-[600px] rounded-lg border border-border overflow-hidden">  <MapaView /></section>
4.7 Tipagens e Constantes de Negócio
A tipagem estrutural segue convenções rígidas: interface é reservada para a modelagem de payloads e contratos de entidades; type é utilizado para uniões de literais, tuplas ou transformações utilitárias. Constantes semânticas de negócio (como mapeamento de estados ou etapas) são tipadas com as const.
ts
export type EstadoJazigo = 'disponivel' | 'concedido' | 'ocupado' | 'ruina';
export interface Jazigo {  id: number;<br/>  codigo: string;<br/>  estado: EstadoJazigo;<br/>  quadra_id: number;<br/>  proprietario_atual?: string | null;}
export const ESTADOS_JAZIGO: Record<EstadoJazigo, { rotulo: string; cor: string }> = {<br/>  disponivel: { rotulo: 'Disponível', cor: '#2E7D32' },<br/>  concedido: { rotulo: 'Concedido', cor: '#1565C0' },<br/>  ocupado: { rotulo: 'Ocupado', cor: '#C62828' },<br/>  ruina: { rotulo: 'Em Ruína', cor: '#757575' },} as const;
5. Segurança e Autorização (Transversal)
A infraestrutura de segurança do SYSGOV opera em profundidade, combinando garantias nas camadas de borda, transporte e aplicação:
RBAC Canônico: A verificação de permissões fundamenta-se estritamente na notação tripartida <modulo>.<recurso>.<acao>. O acesso a funcionalidades sensíveis deve ser validado no frontend via diretivas estruturais e interceptado no backend via Form Requests e Policies do Laravel (exemplo: $user->can('cemiterios.concessoes.manage')).
Gestão de Sessões e Autenticação: A aplicação client utiliza autenticação com persistência em cookies criptografados SameSite=Lax (Sanctum SPA sessions). O tráfego de Bearer Tokens baseados em JWT é restrito a rotas de webhooks e integrações externas entre máquinas (M2M).
Isolamento Absoluto de Tenants: A determinação do cliente ativo ocorre exclusivamente por meio do middleware ResolveTenant através da leitura do cabeçalho institucional X-Tenant-Slug validado contra o banco principal. Nenhum valor de tenant fornecido no corpo da requisição é aceito para identificação de escopo.
Soft Deletes e Validação Estrutural: Deleções lógicas constituem norma padrão para preservar a continuidade administrativa e a prestação de contas pública. Dados removidos devem ser desativados através de softDeletes(), ressalvadas hipóteses legais de expurgo definitivo da LGPD.
6. Qualidade, Testes e Integração Contínua
O ciclo de entrega contínua impõe critérios estritos de qualidade estática e dinâmica para viabilizar o merge de qualquer incremento:
Padrão de Criação de Módulos: Novos domínios no backend devem ser gerados unicamente via comando canônico php artisan make:module {Nome}. O executável já pré-configura a árvore de diretórios oficial, cria o module.json e instancia automaticamente a suíte de testes de isolamento de tenant.
Inspeção Estática no Backend: O analisador estático PHPStan deve rodar em conformidade mínima de Nível 6 (Level 6) com zero ocorrências de erro ou exceções suprimidas sem justificativa técnica plausível.
Cobertura Dinâmica: A suíte de testes unitários e de integração deve ser elaborada em PHPUnit/Pest, garantindo 100% de sucesso nas asserções de validação e isolamento multi-tenant.
Validação Front-end: O compilador TypeScript deve concluir a verificação através de npm run tsc --noEmit com zero erros de tipagem. A aplicação deve passar pelo empacotador de produção (Vite build) sem advertências que quebrem os carregamentos dinâmicos (lazy loading) declarados no moduleRegistry.ts.
7. Checklist de Conformidade Técnica
Antes de submeter pull requests ou sinalizar a conclusão de tarefas no monorepo, certifique-se do cumprimento integral dos seguintes itens:
 Arquivo PHP configurado com cabeçalho obrigatório declare(strict_types=1); e namespace correto.
 Classe declarada como final utilizando injeção de dependências via constructor property promotion.
 Model de negócio utilizando a trait TenantAware e $fillable com a coluna tenant_id explicitada.
 Migrations construídas em classe anônima, tipadas, contendo tenant_id com índice composto inicial.
 Colunas e atributos monetários manipulados estritamente em centavos inteiros (amount_cents), banindo tipos float.
 Mutações operacionais no Service executadas sob DB::transaction() com disparo de AuditLogger e OutboxPublisher.
 Rotas configuradas sob os middlewares ['auth:sanctum', 'tenant', 'bindings', 'module-access:{modulo}'].
 Form Request implementado com autorização atrelada à Policy e regras distribuídas em arrays fechados.
 Imports no frontend organizados rigorosamente conforme a ordem hierárquica das seis camadas.
 Componente React exportado de forma nomeada (export const) e tipado sob React.FC<Props>.
 Variáveis, estados, payloads de tela e regras descritos com semântica precisa em português (pt-BR).
 Análise de tipagem limpa sem apontamentos via npm run tsc --noEmit e suíte de testes operando em verde.
8. Referências Canônicas
Para aprofundamento das especificidades complementares a este documento, consulte a documentação normativa interna:
AGENTS.md: Contrato primário soberano com diretrizes operacionais de agentes autônomos e arquitetura corporativa.
DESIGN_SYSTEM.md: Regras de implementação de interface, densidade de tela, tokens de espaçamento e uso do @sysgov/ui.
PADRÃO SYSGOV — ... / PADRÃO VISUAL SYSGOV — ...: Manuais temáticos sobre padrões cromáticos institucionais, hierarquia tipográfica e acessibilidade visual dos painéis.
Documentação Oficial: Laravel 13 Framework Documentation, PHP 8.4 Release Notes, React 19 Standards e TypeScript Handbook.