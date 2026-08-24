# SYSGOV

Plataforma SaaS de governança e gestão pública da SYSTRAT, organizada como monorepo modular.

---

## 🏛️ Estrutura do Monorepo

```text
sysgov/
├── apps/
│   ├── api/          # Backend Laravel Modular (MySQL 8.4, Redis 7) - Porta 8000
│   ├── web/          # Painel Administrativo SYSTRAT (React 19) - Porta 5173
│   └── web-client/   # Painel do Cliente / Órgão Público (React 19) - Porta 5174
├── packages/
│   ├── ui/           # Design System Gov.br + Paleta SYSGOV (@sysgov/ui)
│   └── sdk/          # SDK TypeScript e tipos de contrato (@sysgov/sdk)
├── docs/             # Documentação técnica e guias de módulo
└── package.json      # Workspaces globais
```

---

## 🚀 Como Executar

### 1. Instalação de Dependências:
```bash
npm install
```

### 2. Backend Laravel:
```bash
cd apps/api
php artisan serve --port=8000
```

### 3. Frontends:
```bash
# Executar apenas o Painel do Cliente (porta 5174):
npm run dev:client

# Executar apenas o Painel Admin (porta 5173):
npm run dev:admin

# Executar ambos simultaneamente:
npm run dev:all
```

---

## 🧪 Testes e Validação

```bash
# Executar todos os testes do monorepo:
npm test

# Checagem de tipos (TypeScript):
npm run typecheck

# Build de produção:
npm run build
```

Para mais detalhes sobre a arquitetura do cliente, consulte [`docs/web-client.md`](file:///c:/laragon/www/saas-sysgov/docs/web-client.md).
