# PADRÃO SYSGOV — Arquitetura, Contrato de Módulo e Design System

Todo desenvolvimento no ecossistema SYSGOV (plataforma SaaS de Gestão Governamental da SYSTRAT) DEVE seguir exatamente este padrão. Aplicar em qualquer módulo novo, sistema novo ou correção, 
seja por IA ou por desenvolvedor humano. Não inventar arquitetura, estilos, cores ou regras fora deste contrato.

## 1. Arquitetura Geral (Obrigatória)
- Monólito modular Laravel como unidade de implantação, usando o pacote nwidart/laravel-modules. Cada aplicação de negócio é um MÓDULO com fronteiras explícitas.
- Frontend React + TypeScript + Tailwind CSS, organizado como App Shell que carrega módulos de UI sob demanda (lazy loading).
- MySQL como fonte transacional. Redis para cache e filas. Storage de objetos para documentos.
- Eventos assíncronos via padrão Outbox para integrações (PNCP, bancos, notificações). NUNCA chamadas externas diretas em controllers.
- Microserviços NÃO devem ser criados. A estrutura modular deve permitir extração futura por módulo apenas com necessidade comprovada.
- Estrutura monorepo: apps/api (Laravel), apps/web (React), packages/ui (design system), packages/sdk (SDK TypeScript), infra, docs.

## 2. Multi-Tenant (Obrigatório — Requisito de Segurança)
- Cada prefeitura/cliente é um TENANT. Isolamento de dados é segurança, não opção.
- Modelo pool com isolamento lógico forte: tabelas compartilhadas com coluna tenant_id OBRIGATÓRIA, índices compostos iniciando por tenant, unicidade composta (tenant_id, codigo).
- TenantContext (singleton) resolvido no login/sessão, NUNCA aceito do frontend. Middleware ResolveTenant valida a associação usuário↔tenant em toda requisição.
- Trait TenantAware (global scope + auto-set de tenant_id no creating) em TODOS os models de negócio.
- Hierarquia interna do tenant: órgãos, secretarias, unidades gestoras, unidades orçamentárias.

## 3. Controle de Acesso e Segurança (Obrigatório)
- Autenticação: Laravel Sanctum + suporte OpenID Connect (federação com IdP do cliente). MFA para operações sensíveis.
- Autorização: RBAC (roles) + ABAC (atributos por tenant, órgão, unidade, exercício, faixa de valor). Gates para ações gerais, Policies por recurso.
- Segregação de funções: quem solicita não aprova; quem liquida não paga; quem administra identidade não altera lançamentos.
- Auditoria: trilha imutável (tabela audit_logs) com tenant_id, user_id, módulo, ação, recurso, before/after, IP, user_agent, timestamp.
- Autorização SEMPRE validada no backend, mesmo que o frontend esconda menu/botão. Autorizar o OBJETO, não só a rota (prevenir OWASP API1 Broken Object Level Authorization).
- Valores monetários em representação exata (classe Money com centavos inteiros). NUNCA float.

## 4. Contrato de Módulo (Obrigatório — Para Expansão)
Todo módulo de negócio DEVE seguir exatamente esta estrutura e regras:
1. Estrutura de pastas: Config/, Database/Migrations/, Database/Seeders/, Http/Controllers/, Http/Middleware/, Http/Requests/, Http/Resources/, Models/, Policies/, Routes/api.php, Services/, Events/, 
Listeners/, Tests/, module.json.
2. module.json com: name, alias, description, priority, providers, requires (dependências), metadados de menu (label, icon, order, permission).
3. Toda migration tem tenant_id obrigatório + índice composto iniciando por tenant.
4. Todo model de negócio usa a trait TenantAware.
5. Toda ação de escrita tem Policy server-side.
6. Nenhuma chamada externa direta em controller — sempre via Integration Hub/Outbox.
7. Rotas registradas via RouteServiceProvider do módulo, nunca no web.php global.
8. Eventos de domínio publicados na Outbox para efeitos assíncronos.
9. Teste de isolamento obrigatório: mesmo cenário com tenant A e tenant B não cruza dados.
10. Usar o comando Artisan make:module customizado (scaffold tenant-aware com testes de isolamento).

## 5. Design System (Obrigatório — Padrão Visual SYSGOV, derivado do SGF Araucária)
1. Stack: React + TypeScript + Tailwind CSS. Ícones lucide-react (nunca emojis/SVGs soltos). Componentes base Shadcn/UI ou Radix UI. NUNCA CSS inline.
2. Tipografia: JetBrains Mono (font-mono) OBRIGATÓRIA para dados numéricos (valores R$, %, datas, CNPJ, CPF, limites LRF, métricas de tabelas). Inter/Roboto (font-sans) para texto institucional.
3. Paleta:
   - Fundo Master Admin/Dark: bg-slate-950, bg-slate-900, bg-slate-800/80.
   - Destaque primário: Emerald #10b981 (text-emerald-400, bg-emerald-600).
   - Secundários: Indigo #6366f1, Cyan #06b6d4, Amber #f59e0b.
   - Azul institucional governo: #0c326f, #1351b4, #071d41.
   - Semáforo fiscal: Regular #168821 (emerald-400, bg-emerald-950/60, border-emerald-700/50); Alerta #ffcd07 (amber-400, bg-amber-950/60, border-amber-700/50); Crítico #e52207 (rose-400, bg-rose-950/60,
   border-rose-700/50); Informativo sky-400/slate-300/bg-slate-800.
4. Layout: sidebar esquerda escura com grupos em MAIÚSCULAS e atalhos de teclado; top bar branca com filtros de contexto (ano, cidade) e ações à direita (Sincronizar, Exportar); área de conteúdo em grid 
modular com cards rounded-lg + shadow-sm.
5. Componentes: cards de KPI (valor em destaque font-mono + rodapé secundário), cards de alerta semânticos (crítico/atenção com ícone e botão "Ver Alerta"), badges/tags (fundo leve + texto colorido),
 botões ghost (secundário) e solid (primário, alinhados à direita), cards de dados (fundo branco, border-gray-200, título text-sm font-semibold).
6. White-label: suporte a customPrimaryColor, customLogoUrl, título/subtítulo por tenant, ocultação da assinatura do fornecedor. Ler configurações do tenant, nunca hard-coded.

## 6. Regras de Qualidade
- Responsivo e acessível (contraste, foco visível, aria-labels).
- Validação de entrada, proteção de dados, gestão segura de segredos, rate limiting, CORS por allowlist.
- Código SOLID, baixo acoplamento, DRY sem abstrações excessivas, configuração por ambiente.
- Consistência é obrigatória: TODOS os módulos seguem o mesmo padrão arquitetural e visual.
- Ao criar novo módulo: seguir o contrato do item 4, aplicar o design system do item 5 e respeitar multi-tenant/segurança dos itens 2 e 3.