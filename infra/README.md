# Infra — SYSGOV

Esta pasta concentra arquivos de configuração por ambiente e documentação de infraestrutura.

## Ambientes

| Ambiente | Arquivo | Uso |
| --- | --- | --- |
| Desenvolvimento local (Laragon) | `apps/api/.env` | MySQL local (`127.0.0.1`), cache em `file`, fila `database`. |
| Docker Compose | `apps/api/.env.docker` | Consumido pelo serviço `api` do `Docker-compose.yml`. Aponta para os serviços `mysql` e `redis` da rede do compose (cache/fila usam Redis via `REDIS_HOST=redis`). |
| CI (GitHub Actions) | `infra/env/.env.ci` | Referência das variáveis usadas no job `api` do workflow `.github/workflows/ci.yml`: MySQL efêmero em `127.0.0.1`, banco `sysgov_test`, cache `file`, fila `sync`. |

## Notas

- O workflow de CI injeta as variáveis diretamente no bloco `env:` do job; `.env.ci` existe como fonte de verdade documental/espelho para execução local de testes em ambiente limpo.
- `APP_KEY` de CI/Docker é um valor fixo de exemplo, apenas para ambientes descartáveis. Nunca reutilize em produção.
- Redis só é usado nos ambientes que possuem o serviço disponível (Docker). CI usa `CACHE_STORE=file` até haver um service container de Redis no workflow.

## Serviços locais (Docker Compose)

- `api`: aplicação Laravel (porta 8000), depende de `mysql` e `redis`.
- `mysql`: MySQL 8.4 (porta 3306, volume `sysgov-mysql`).
- `redis`: Redis 7 (porta 6379), usado para cache e filas quando `QUEUE_CONNECTION=redis`.

## Atualizando o ambiente local a partir do git

Depois de um `git pull` (schema novo, módulo novo no catálogo, etc.), o
fluxo padrão é só subir o compose de novo — **não precisa rodar
`migrate`/`db:seed` na mão**:

```bash
docker compose -f Docker-compose.yml up -d --build
```

O `docker-entrypoint.sh` do serviço `api` roda, nessa ordem, toda vez
que o container inicia:
1. Espera o MySQL aceitar conexões.
2. `php artisan migrate --force`.
3. `php artisan db:seed --force` (`DatabaseSeeder` chama `ModuleCatalogSeeder`
   e `RbacSeeder`).

Isso é seguro de repetir a cada subida porque os seeders usam
`updateOrCreate` — não duplicam nem resetam dados existentes (ex.: os
módulos que você já habilitou pra um tenant continuam como estavam).
Se um `git pull` trouxe uma migration nova ou um módulo novo no
catálogo, ele é aplicado automaticamente; se não trouxe, os comandos
rodam e não fazem nada (`Nothing to migrate.`).
