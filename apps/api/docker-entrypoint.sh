#!/bin/sh
set -e

# Espera o MySQL aceitar conexões antes de migrar — evita falhar de cara
# quando o container 'api' sobe mais rápido que o 'mysql' (comum em
# 'docker compose up' logo após um 'down'/rebuild).
echo "Aguardando o banco de dados..."
until php -r "new PDO('mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" > /dev/null 2>&1; do
  sleep 1
done
echo "Banco de dados disponível."

# migrate e os seeders da raiz (database/Seeders) usam updateOrCreate,
# então rodar sempre no start é seguro (idempotente) e mantém o schema e
# o catálogo de módulos em dia automaticamente a cada atualização do
# repositório, sem depender de alguém lembrar de rodar na mão.
php artisan migrate --force
php artisan db:seed --force

exec "$@"
