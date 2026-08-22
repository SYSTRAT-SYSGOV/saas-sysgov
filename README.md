# SYSGOV

Plataforma SaaS de gestão governamental da SYSTRAT, organizada como monorepo modular.

## Começar

```bash
npm install
npm run dev
```

O painel web fica em `apps/web`. A API Laravel fica em `apps/api` e requer PHP 8.2+, MySQL 8.4 e Redis 7.

Para executar a stack com Docker, use `docker compose up --build`. O painel web continua sendo iniciado separadamente com `npm run dev`.

A primeira entrega inclui o App Shell administrativo, dashboard operacional, base de multi-tenancy, contrato do módulo Contracts, migration de núcleo e documentação de contribuição. Dados do dashboard são fixtures de apresentação até a API ser conectada.
