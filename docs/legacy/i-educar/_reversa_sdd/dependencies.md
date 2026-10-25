# Inventário de Dependências — i-Educar

> Gerado pelo **Scout** (Reversa) em 2026-10-12

---

## 1. Ambiente e Runtime

| Componente | Versão / Restrição | Origem |
|------------|-------------------|--------|
| **PHP** | `>= 8.3` | `composer.json` |
| **Node.js** | `>= 20.x` | Ambiente de compilação frontend |
| **PostgreSQL** | `14+` / `16` | `docker-compose.yml` (`postgres:16`) |
| **Redis** | `7.x` | `docker-compose.yml` (`redis:alpine`) |
| **Nginx** | `alpine` | `docker-compose.yml` |

---

## 2. Dependências de Produção (PHP / Composer)

| Pacote | Versão Requerida | Descrição / Função no Sistema |
|--------|------------------|--------------------------------|
| `laravel/framework` | `^13.0` | Framework web full-stack principal |
| `laravel/horizon` | `^5.15` | Monitoramento e filas assíncronas do Redis |
| `laravel/sanctum` | `^4.0` | Autenticação via tokens de API / SPA |
| `laravel/socialite` | `^5.26` | Autenticação social / SSO |
| `laravel/ui` | `^4.2` | Scaffolding de interface legado |
| `dex/composer-plug-and-play` | `^0.26` | Sistema modular de plugins do i-Educar |
| `dex/frontier` | `^0.18.0` | Suporte a microsserviços / gateways modulares |
| `predis/predis` | `^2.3` | Cliente Redis para sessões e filas |
| `maatwebsite/excel` | `^4.0` | Exportação/Importação de planilhas |
| `phpoffice/phpspreadsheet` | `^5.8` | Manipulação de arquivos Excel/CSV |
| `league/csv` | `^9.7` | Geração de arquivos CSV e integração com Educacenso |
| `intervention/image` | `^2.6` | Processamento de fotos de alunos e documentos |
| `aws/aws-sdk-php-laravel` | `^3.11` | Integração de armazenamento em nuvem (S3) |
| `league/flysystem-aws-s3-v3` | `^3.0` | Driver Flysystem para Amazon S3 |
| `league/flysystem-sftp-v3` | `^3.0` | Driver Flysystem para SFTP |
| `guzzlehttp/guzzle` | `^7.15.2` | Cliente HTTP para integrações externas de API |
| `staudenmeir/laravel-adjacency-list` | `^1.0` | Estruturas em árvore para menus e organogramas |
| `honeybadger-io/honeybadger-laravel` | `^5.0` | Rastreamento e log de erros |
| `google/recaptcha` | `^1.2` | Proteção anti-bot em formulários públicos |

---

## 3. Dependências de Desenvolvimento e Testes (PHP / Composer)

| Pacote | Versão Requerida | Função |
|--------|------------------|--------|
| `pestphp/pest` | `^4.0` | Framework moderno de testes BDD/TDD |
| `fakerphp/faker` | `^1.23` | Gerador de dados fictícios para testes |
| `mockery/mockery` | `^1.6` | Mocking de objetos em testes unitários |
| `laravel/pint` | `^1.24` | Linter e padronizador de código PHP (PSR-12) |
| `laravel/sail` | `^1.41` | Ambiente de desenvolvimento Docker |
| `laravel/telescope` | `^5.18` | Debugger de queries, requests e exceptions |
| `spatie/laravel-ignition` | `^2.0` | Tratamento de erros e página de exceptions rica |

---

## 4. Dependências de Frontend (Node.js / npm)

| Pacote | Versão Requerida | Função |
|--------|------------------|--------|
| `vite` | `^8.0.0` | Bundler e build tool ultra-rápido |
| `laravel-vite-plugin` | `^3.1` | Integração do Vite com os templates Blade do Laravel |
| `tailwindcss` | `^4.0.0` | Framework CSS utilitário |
| `@tailwindcss/vite` | `^4.0.0` | Plugin Vite para compilação do Tailwind v4 |
| `concurrently` | `^10.0.3` | Execução simultânea de processos de dev |
