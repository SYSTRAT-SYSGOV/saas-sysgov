---
Padrão completo do SYSGOV: arquitetura, módulos, segurança e design.# PADRÃO SYSGOV — Arquitetura, Contrato de Módulo, Design System e Scaffolding

Todo desenvolvimento no ecossistema SYSGOV (plataforma SaaS de Gestão Governamental da SYSTRAT) DEVE seguir exatamente este padrão. Aplicar em qualquer módulo novo, sistema novo ou correção, seja por IA ou por desenvolvedor humano. Não inventar arquitetura, estilos, cores ou regras fora deste contrato.

## 1. Arquitetura Geral (Obrigatória)
- Monólito modular Laravel como unidade de implantação, usando o pacote nwidart/laravel-modules. Cada aplicação de negócio é um MÓDULO em apps/api/Modules/{Nome} com fronteiras explícitas.
- Frontend React + TypeScript + Tailwind CSS, organizado como App Shell que carrega módulos de UI sob demanda (lazy loading).
- MySQL como fonte transacional. Redis para cache e filas. Storage de objetos para documentos.
- Eventos assíncronos via padrão Outbox para integrações (PNCP, bancos, Siconfi, notificações). NUNCA chamadas externas diretas em controllers.
- Microserviços NÃO devem ser criados agora. A estrutura modular deve permitir EXTRAÇÃO SELETIVA futura por módulo apenas com necessidade comprovada (ex.: módulo Pedagógico com milhões de registros). Manter o monólito modular como núcleo mesmo a médio prazo.
- Estrutura monorepo: apps/api (Laravel), apps/web-admin (React — painel SYSTRAT), apps/web-client (React — painel do cliente), packages/ui (design system), packages/sdk (SDK TypeScript), infra, docs.
- DOIS App Shells separados (web-admin e web-client) mas UM ÚNICO backend. O mesmo backend expõe rotas de admin (prefixo /admin) e de cliente (prefixo /api), diferenciadas por autenticação e autorização.

## 2. Multi-Tenant (Obrigatório — Requisito de Segurança)
- Cada prefeitura/cliente é um TENANT. Isolamento de dados é segurança, não opção.
- Modelo pool com isolamento lógico forte: tabelas compartilhadas com coluna tenant_id OBRIGATÓRIA, índices compostos iniciando por tenant, unicidade composta (tenant_id, codigo).
- TenantContext (singleton) resolvido no login/sessão, NUNCA aceito do frontend. Middleware ResolveTenant valida a associação usuário↔tenant em toda requisição.
- Trait TenantAware (global scope + auto-set de tenant_id no creating) em TODOS os models de negócio.
- Hierarquia interna do tenant: órgãos, secretarias, unidades gestoras, unidades orçamentárias.
- EVOLUÇÃO BRIDGE: tenants específicos podem migrar para schema/banco dedicado sem mudar o domínio (isolamento físico por contrato ou grande volume). O TenantContext abstrai a origem dos dados.
- PARTICIONAMENTO: para módulos de alto volume (ex.: Pedagógico com milhões de registros), usar particionamento por tenant no MySQL.
- Tipos de tenant expandidos: prefeitura, camara, autarquia, empresa_privada, parceiro, interno (campo type do tenants).

## 3. Controle de Acesso e Segurança (Obrigatório)
- Autenticação: Laravel Sanctum (login local) + OpenID Connect (SSO federado com IdP do cliente) — AMBOS desde o MVP. O tenant expõe config do IdP (issuer, client_id, client_secret, scopes) no settings.
- MFA (step-up) para operações sensíveis: alterar dados bancários, aprovar financeiro, exportar dados.
- Autorização: RBAC (roles) + ABAC (atributos por tenant, órgão, unidade, exercício, faixa de valor). Gates para ações gerais, Policies por recurso.
- Segregação de funções: quem solicita não aprova; quem liquida não paga; quem administra identidade não altera lançamentos.
- Auditoria: trilha imutável (tabela audit_logs) com tenant_id, user_id, módulo, ação, recurso, before/after, IP, user_agent, timestamp. Toda mutação DEVE registrar via AuditLogger.
- Autorização SEMPRE validada no backend, mesmo que o frontend esconda menu/botão. Autorizar o OBJETO, não só a rota (prevenir OWASP API1 Broken Object Level Authorization).
- Valores monetários em representação exata (classe Money com centavos inteiros). NUNCA float.

## 4. Identificação Automática do Tenant e Carregamento Dinâmico de Módulos (Obrigatório)
- No login, o backend resolve o tenant do usuário automaticamente (via tenant_user OU subdomínio/header). NUNCA aceitar tenant_id do frontend.
- Se o usuário pertence a múltiplos tenants: retornar lista de tenants + current_tenant (tenant ativo).
- Carregar no login: módulos ativos do tenant (tenant_module.enabled) + permissões do usuário (roles → permissions) + navegação dinâmica (menu_groups/menu_items filtrados por permissão).
- O frontend monta a sidebar dinamicamente a partir dessa resposta. Novos módulos entram sem deploy do shell.

## 5. Contrato de Módulo (Obrigatório — Para Expansão)
Todo módulo de negócio DEVE seguir exatamente esta estrutura e regras:
1. Estrutura de pastas: Config/, Database/Migrations/, Database/Seeders/, Http/Controllers/, Http/Middleware/, Http/Requests/, Http/Resources/, Models/, Policies/, Routes/api.php, Services/, Events/, Listeners/, Tests/, Providers/ (ServiceProvider + RouteServiceProvider), module.json.
2. module.json com: name, alias, description, priority, providers, requires (dependências), metadados de menu (label, icon, order, permission).
3. Toda migration tem tenant_id obrigatório + índice composto iniciando por tenant.
4. Todo model de negócio usa a trait TenantAware.
5. Toda ação de escrita tem Policy server-side.
6. Nenhuma chamada externa direta em controller — sempre via Integration Hub/Outbox.
7. Rotas registradas via RouteServiceProvider do módulo (api/{modulo} com auth:sanctum + resolve.tenant), nunca no web.php global.
8. Eventos de domínio publicados na Outbox para efeitos assíncronos.
9. Teste de isolamento obrigatório: mesmo cenário com tenant A e tenant B não cruza dados.
10. Usar o comando Artisan make:module customizado (scaffold tenant-aware com testes de isolamento).

## 6. Scaffolding de Novo Módulo — Passo a Passo (Obrigatório)

### Passo 1 — Executar o scaffold oficial
No diretório apps/api: `php artisan make:module {NomeDoModulo}` (ex.: Obras, Protocol). Gera a estrutura completa tenant-aware com Teste de Isolamento.

### Passo 2 — Definir a migration
```php
Schema::create('{alias}_items', function (Blueprint $table): void {
    $table->id();
    $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
    $table->string('code')->nullable();
    $table->string('title');
    $table->unsignedBigInteger('amount_cents')->default(0); // Centavos inteiros
    $table->string('status')->default('active');
    $table->json('metadata')->nullable();
    $table->timestamps();
    $table->index(['tenant_id', 'created_at']);
    $table->index(['tenant_id', 'status']);
    $table->unique(['tenant_id', 'code']); // Unicidade por município
});
```

### Passo 3 — Model com TenantAware
```php
namespace Modules\{Nome}\Models;
use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
final class {Nome}Item extends Model
{
    use TenantAware;
    protected $table = '{alias}_items';
    protected $fillable = ['tenant_id', 'code', 'title', 'amount_cents', 'status', 'metadata'];
    protected $casts = ['tenant_id' => 'integer', 'amount_cents' => 'integer', 'metadata' => 'array'];
}
```

### Passo 4 — Controller com Auditoria e Outbox
```php
final class {Nome}Controller extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:0'],
        ]);
        $item = {Nome}Item::create($validated);
        $this->audit->record('{alias}', 'item.created', "{Nome}Item #{$item->id}", null, $item->toArray());
        $this->outbox->publish('{alias}', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);
        return response()->json($item, 201);
    }
}
```

### Passo 5 — Executar teste de isolamento
`php artisan test --filter=TenantIsolationTest` — valida que (1) registros do Tenant A não aparecem no Tenant B; (2) é impossível criar sem contexto de tenant resolvido (LogicException).

### Passo 6 — Integração no frontend
1. Registrar navegação em apps/web/src/config/adminNavigation.ts no grupo correspondente.
2. Criar tela/componente em apps/web/src/components/ usando a paleta oficial.
3. Usar `<span className="font-mono tabular-nums">` para R$, %, CNPJ, CPF, datas e códigos.
4. Importar sob demanda via React.lazy no App Shell.

## 7. Exportação e Migração de Dados (Obrigatório — Requisito de Primeira Classe)
- Exportador construído DESDE O INÍCIO, não depois. O cliente pode exigir exportação a qualquer momento (self-service).
- Exportação self-service: o admin do tenant dispara a exportação pela interface (não só o admin SYSTRAT).
- Assíncrono: job em fila (ExportTenantData), com notificação quando pronto.
- Formato aberto e documentado: JSON (dados estruturados) + CSV (tabelas) + PDF (documentos) + anexos originais (object storage), empacotados em ZIP + manifest versionado (versão do schema, data, tenant).
- Manifest com versão permite evoluir o schema interno sem quebrar exportações antigas.
- Auditoria: toda exportação registrada em audit_logs (quem, quando, escopo).
- Importador genérico: lê o manifest e popula o schema do novo tenant, com validação de integridade (FKs, unicidades, valores) e relatório de divergências.
- Suporta migração para sistemas concorrentes ao fim de contrato.

## 8. Design System (Obrigatório — Padrão Visual SYSGOV, derivado do SGF Araucária)

### 8.1 Stack e Ferramentas
- React + TypeScript + Tailwind CSS. Ícones lucide-react (nunca emojis/SVGs soltos). Componentes base Shadcn/UI ou Radix UI. NUNCA CSS inline.

### 8.2 Tipografia e Fontes
- Fonte Técnica e Dados Numéricos — JetBrains Mono (font-mono tabular-nums): OBRIGATÓRIA para todos os valores monetários (R$), percentuais (%), datas, códigos IBGE, CNPJ, CPF, limites da LRF, dados de tabelas e métricas estatísticas.
- Fonte Institucional / Texto — Inter, Roboto ou padrão sans-serif do DSGov.br (font-sans).

### 8.3 Paleta de Cores e Tokens Oficiais

#### A. Cores Corporativas SaaS (Escrita.Online / SaaS Master)
- Fundo Master Admin / Dark Mode: bg-slate-950, bg-slate-900, bg-slate-800/80.
- Destaque Primário: Emerald / Esmeralda (#10b981, text-emerald-400, bg-emerald-600).
- Destaque Secundário / Acentos: Indigo (#6366f1), Cyan (#06b6d4), Amber (#f59e0b).

#### B. Cores Institucionais Governamentais (DSGov / Prefeituras Padrão)
- Azul Governo Federal: #0c326f, #1351b4, #071d41 (bg-blue-900, text-blue-400).
- Estados e Semáforos Fiscais:
  - Regular / Conforme (Verde): #168821 (text-emerald-400, bg-emerald-950/60, border-emerald-700/50).
  - Alerta / Atenção (Âmbar/Amarelo): #ffcd07 (text-amber-400, bg-amber-950/60, border-amber-700/50).
  - Crítico / Limite Prudencial Excedido (Vermelho/Rosa): #e52207 (text-rose-400, bg-rose-950/60, border-rose-700/50).
  - Informativo / Neutro (Azul / Ardósia): text-sky-400, text-slate-300, bg-slate-800.

### 8.4 Estrutura de Layout (Obrigatória)
- Sidebar esquerda: tema escuro, largura fixa, grupos com separadores e títulos em MAIÚSCULAS (ex: "GABINETE & DECISÃO ESTRATÉGICA"), ícones à esquerda e atalhos de teclado à direita (ex: [P], [G], [B]).
- Top bar: fundo branco, filtros de contexto (ano, cidade), botões de ação à direita ("Sincronizar", "Exportar PDF").
- Área de conteúdo: grid modular com cards de profundidade leve (shadow-sm) e bordas arredondadas (rounded-lg, radius ~8px).

### 8.5 Componentes
- Cards de KPI: compactos, cabeçalho, valor numérico em destaque (bold, tamanho maior, font-mono), rodapé com info secundária.
- Cards de alerta: cor semântica por prioridade (vermelho=crítico, amarelo=atenção), ícone, contagem/status e botão de ação na base ("Ver Alerta").
- Badges/Tags: fundo leve + texto colorido para categorizar status e fontes de dados.
- Botões: ghost (borda fina) para ações secundárias; solid (fundo colorido) para primárias ("Detalhar", "Exportar"). Ações primárias alinhadas à direita.
- Cards de dados: fundo branco, border-gray-200, títulos text-sm font-semibold.

### 8.6 White-Label / Personalização por Cliente
1. Pacote Básico (Standard):
   - Exibe a marca institucional "Escrita.Online — Inteligência & Análise Fiscal" no rodapé e no login.
   - Headers utilizam o padrão do município com badge "Powered by Escrita.Online".
2. Pacote 100% Personalizado (White-Label Premium):
   - Permite que o Administrador do SaaS aplique:
     - Cor primária personalizada do município (customPrimaryColor);
     - Brasão / Logomarca em alta definição (customLogoUrl);
     - Título e subtítulo do portal configurados exclusivamente para o município;
     - Ocultação da assinatura do fornecedor;
   - Aplica os custos adicionais de implantação e mensalidade nas faturas.
   - Ler essas configurações do tenant (settings JSON), NUNCA hard-coded.

## 9. Checklist de Qualidade antes de Concluir (Obrigatório)
- [ ] Migration possui coluna tenant_id obrigatório e índice composto ['tenant_id', '...']?
- [ ] Model inclui a trait TenantAware?
- [ ] Valores em dinheiro usam centavos inteiros (amount_cents), nunca float?
- [ ] Ações de mutação chamam $audit->record(...) e $outbox->publish(...)?
- [ ] Toda ação de escrita tem Policy server-side?
- [ ] Rotas registradas via RouteServiceProvider do módulo, nunca no web.php global?
- [ ] Frontend usa font-mono tabular-nums para dados técnicos?
- [ ] Teste de isolamento multi-tenant (Tenant A vs Tenant B) passou com sucesso?
- [ ] Exportação/migração de dados considerada no módulo?

## 10. Regras de Qualidade
- Responsivo e acessível (contraste, foco visível, aria-labels).
- Validação de entrada, proteção de dados, gestão segura de segredos, rate limiting, CORS por allowlist.
- Código SOLID, baixo acoplamento, DRY sem abstrações excessivas, configuração por ambiente.
- Consistência é obrigatória: TODOS os módulos seguem o mesmo padrão arquitetural e visual.
- Ao criar novo módulo: seguir o contrato do item 5 e o scaffolding do item 6, aplicar o design system do item 8, respeitar multi-tenant/segurança dos itens 2 e 3, e considerar exportação/migração do item 7.
- Equipe enxuta (3 devs + IA/lowcode): o contrato de módulo rígido e o make:module são a estratégia central para escalar sem quebrar a arquitetura. Teste de isolamento é gate de merge no CI/CD.
- CODEOWNERS: núcleo (identidade, multi-tenant, segurança) protegido por sêniores.