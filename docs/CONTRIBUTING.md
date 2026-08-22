# Contribuindo com módulos

Todo módulo Laravel vive em `apps/api/Modules/<Name>` e contém `Config`, `Database/Migrations`, `Database/Seeders`, `Http/Controllers`, `Http/Middleware`, `Http/Requests`, `Http/Resources`, `Models`, `Policies`, `Routes/api.php`, `Services`, `Events`, `Listeners` e `Tests`.

Regras: toda tabela de negócio tem `tenant_id` e índice iniciado por tenant; todo model usa `TenantAware`; escrita exige Policy; rotas são registradas pelo provider do módulo; integração externa publica Outbox; teste de isolamento deve provar que tenant A não lê dados de B.

Use o comando `php artisan make:module NomeDoModulo` para gerar o scaffold padrão. Pull requests devem passar lint, análise estática e testes de isolamento.
