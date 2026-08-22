Você é um arquiteto e desenvolvedor full stack sênior especializado em React/TypeScript (frontend), Laravel (backend) e MySQL (persistência). Sua tarefa é criar, do zero, o sistema SYSGOV — 
um ecossistema SaaS de Gestão Governamental da empresa SYSTRAT — composto por um painel administrador central e uma estrutura modular que permita criar qualquer novo módulo ou sistema a partir dele, 
com a melhor arquitetura para expansão contínua.

# CONTEXTO DE NEGÓCIO
A SYSTRAT é uma empresa de Inteligência em Gestão Estratégica e Tecnologia, focada em Gestão Governamental. O SYSGOV é a plataforma SaaS que unifica múltiplas aplicações de gestão pública 
(financeiro, contratos, licitações, documentos, etc.) em um único ecossistema. Múltiplos desenvolvedores criarão módulos dentro desta estrutura, possivelmente com auxílio de IA. Por isso, 
o padrão de código e de design DEVE ser rígido, documentado e replicável.

# ARQUITETURA GERAL (OBRIGATÓRIA)
1. Monólito modular Laravel como unidade de implantação, usando o pacote nwidart/laravel-modules. Cada aplicação de negócio é um MÓDULO com fronteiras explícitas.
2. Frontend React + TypeScript + Tailwind CSS, organizado como App Shell que carrega módulos de UI sob demanda (lazy loading).
3. MySQL como fonte transacional. Redis para cache e filas. Storage de objetos para documentos.
4. Eventos assíncronos via padrão Outbox para integrações (PNCP, bancos, notificações) — nunca chamadas externas diretas em controllers.
5. Microserviços NÃO devem ser criados agora; a estrutura modular deve permitir extração futura por módulo quando houver necessidade comprovada.
6. Estrutura de pastas: monorepo com apps/api (Laravel), apps/web (React), packages/ui (design system), packages/sdk (SDK TypeScript), infra, docs.

# MULTI-TENANT (OBRIGATÓRIO)
1. Cada prefeitura/cliente é um TENANT. Isolamento de dados é requisito de segurança, não opção.
2. Modelo: pool com isolamento lógico forte — tabelas compartilhadas com coluna tenant_id OBRIGATÓRIA, índices compostos iniciando por tenant, unicidade composta (tenant_id, codigo).
3. Criar um TenantContext (singleton) resolvido no login/sessão, NUNCA aceito do frontend. Middleware ResolveTenant valida a associação usuário↔tenant em toda requisição.
4. Criar trait TenantAware (global scope + auto-set de tenant_id no creating) para todos os models de negócio.
5. Permitir evolução bridge: tenants específicos podem migrar para schema/banco dedicado sem mudar o domínio.
6. Hierarquia interna do tenant: órgãos, secretarias, unidades gestoras, unidades orçamentárias.

# CONTROLE DE ACESSO E SEGURANÇA (OBRIGATÓRIO)
1. Autenticação: Laravel Sanctum + suporte a OpenID Connect (federação com IdP do cliente). MFA para operações sensíveis.
2. Autorização: RBAC (roles) + ABAC (atributos por tenant, órgão, unidade, exercício, faixa de valor). Gates para ações gerais e Policies por recurso.
3. Segregação de funções: quem solicita não aprova; quem liquida não paga; quem administra identidade não altera lançamentos.
4. Auditoria: trilha imutável (tabela audit_logs) registrando tenant_id, user_id, módulo, ação, recurso, before/after, IP, user_agent, timestamp.
5. Autorização SEMPRE validada no backend, mesmo que o frontend esconda menu/botão. Autorizar o OBJETO, não só a rota (prevenir OWASP API1 Broken Object Level Authorization).
6. Valores monetários em representação exata (classe Money com centavos inteiros), NUNCA float.

# PAINEL ADMINISTRADOR DO SAAS (MÓDULO Admin — OBRIGATÓRIO)
Criar o módulo Admin completo, que é o coração operacional da SYSTRAT:
1. Gestão de Tenants (clientes/prefeituras): cadastro, slug, CNPJ, tipo (prefeitura/parceiro/interno), status (active/suspended/trial), settings JSON para personalização.
2. Gestão de Usuários: CRUD, vínculo com tenants, roles, flag is_platform_admin.
3. Gestão de Roles e Permissões: RBAC completo, permissões granulares por tenant, módulo e funcionalidade.
4. Gestão de Módulos: catálogo de módulos disponíveis, ativação/desativação por tenant (feature flags), settings por tenant.
5. Gestão de Contratos: ciclo de vida contratual com clientes/prefeituras, vigências, renovações, reajustes, anexos, histórico.
6. Módulo Financeiro da SYSTRAT: receitas, despesas, faturamento, repasses, conciliação, integração com contratos e clientes.
7. Monitoramento: métricas, logs, filas, erros, uso por tenant.
8. Auditoria: consulta e exportação da trilha imutável.

# CONTRATO DE MÓDULO (OBRIGATÓRIO — PARA EXPANSÃO)
Todo módulo de negócio DEVE seguir exatamente esta estrutura e estas regras:
1. Estrutura de pastas: Config/, Database/Migrations/, Database/Seeders/, Http/Controllers/, Http/Middleware/, Http/Requests/, Http/Resources/, Models/, Policies/, Routes/api.php, Services/, 
Events/, Listeners/, Tests/, module.json.
2. module.json com: name, alias, description, priority, providers, requires (dependências), e metadados de menu (label, icon, order, permission).
3. Toda migration tem tenant_id obrigatório + índice composto iniciando por tenant.
4. Todo model de negócio usa a trait TenantAware.
5. Toda ação de escrita tem Policy server-side.
6. Nenhuma chamada externa direta em controller — sempre via Integration Hub/Outbox.
7. Rotas registradas via RouteServiceProvider do módulo, nunca no web.php global.
8. Eventos de domínio publicados na Outbox para efeitos assíncronos.
9. Teste de isolamento obrigatório: mesmo cenário com tenant A e tenant B não cruza dados.
10. Criar um comando Artisan make:module customizado que gera todo o scaffold tenant-aware com testes de isolamento.

# DESIGN SYSTEM (OBRIGATÓRIO — PADRÃO VISUAL SYSGOV)
Todo módulo DEVE seguir exatamente este padrão visual (derivado do SGF Araucária). Consistência é obrigatória.
1. Stack: React + TypeScript + Tailwind CSS. Ícones lucide-react (nunca emojis/SVGs soltos). Componentes base Shadcn/UI ou Radix UI.
2. Tipografia: JetBrains Mono (font-mono) OBRIGATÓRIA para dados numéricos (valores R$, %, datas, CNPJ, CPF, limites LRF, métricas de tabelas). Inter/Roboto (font-sans) para texto institucional.
3. Paleta:
   - Fundo Master Admin/Dark: bg-slate-950, bg-slate-900, bg-slate-800/80.
   - Destaque primário: Emerald #10b981 (text-emerald-400, bg-emerald-600).
   - Secundários: Indigo #6366f1, Cyan #06b6d4, Amber #f59e0b.
   - Azul institucional governo: #0c326f, #1351b4, #071d41.
   - Semáforo fiscal: Regular #168821 (emerald), Alerta #ffcd07 (amber), Crítico #e52207 (rose), Informativo sky/slate.
4. Layout: sidebar esquerda escura com grupos em MAIÚSCULAS e atalhos de teclado; top bar branca com filtros de contexto (ano, cidade) e ações à direita (Sincronizar, Exportar); área de conteúdo em 
grid modular com cards rounded-lg + shadow-sm.
5. Componentes: cards de KPI (valor em destaque font-mono + rodapé secundário), cards de alerta semânticos (crítico/atenção com ícone e botão "Ver Alerta"), badges/tags, botões ghost (secundário) e 
solid (primário, alinhados à direita), cards de dados (fundo branco, border-gray-200, título text-sm font-semibold).
6. White-label: suporte a customPrimaryColor, customLogoUrl, título/subtítulo por tenant, ocultação da assinatura do fornecedor. Ler configurações do tenant, nunca hard-coded.

# ESTRUTURA DE BANCO DE DADOS (OBRIGATÓRIA)
Criar migrations para:
1. Núcleo: tenants, users, roles, permissions, role_user, tenant_user (com role_id), modules, tenant_module (com enabled/settings), audit_logs, outbox_events.
2. Admin: contratos (com tenant_id, vigências, status, valor em centavos, renewal_rule), anexos de contrato, aditivos, histórico.
3. Financeiro SYSTRAT: receitas, despesas, faturamento, repasses, conciliação.
4. Tabela outbox_events: event_id (uuid), event_type, event_version, tenant_id, payload, status (pending/processing/done/failed), attempts, available_at, processed_at, error.

# ENTREGA ESPERADA
1. Backend Laravel completo com nwidart/laravel-modules, núcleo (TenantContext, TenantAware, ResolveTenant, AuditLogger, Outbox, Money), módulo Admin completo e um módulo exemplo (Contracts) seguindo 
o contrato.
2. Frontend React App Shell com registro de módulos, sidebar escura com grupos, top bar branca, e as telas do painel admin (tenants, users, roles, modules, contracts, finance, monitoring, audit) 
seguindo o design system.
3. Docker Compose (api + mysql + redis), .env.example, .env.ci.
4. CI/CD (.github/workflows/ci.yml) com lint, testes, análise estática e teste de isolamento de tenant.
5. Documentação: docs/CONTRIBUTING.md (contrato de módulo), docs/adr/ (decisões arquiteturais), DESIGN_SYSTEM.md (padrão visual).
6. Comando Artisan make:module que gera o scaffold tenant-aware completo.

Gere código completo, pronto para uso, com imports, types, validações e comentários objetivos sobre decisões não óbvias. Siga princípios SOLID, baixo acoplamento e DRY sem abstrações excessivas. 
Valide entrada, proteja dados, use configuração por ambiente e prepare tudo para testes.