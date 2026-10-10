#!/bin/sh
set -e

# Configura e ativa OPcache para PHP CLI (acelera drasticamente o Laravel no Docker em Windows)
if [ -d "/usr/local/etc/php/conf.d" ]; then
  mkdir -p /tmp/opcache && chmod 777 /tmp/opcache
  cat << 'EOF' > /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini
zend_extension=opcache.so
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=50000
opcache.revalidate_freq=60
opcache.validate_timestamps=1
opcache.file_cache=/tmp/opcache
opcache.file_cache_fallback=1
opcache.fast_shutdown=1
opcache.jit=tracing
opcache.jit_buffer_size=64M
realpath_cache_size=4096K
realpath_cache_ttl=600
EOF
fi

export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-10}"

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

# module:register lê o module.json de cada módulo (Modules/{Nome}/module.json)
# e grava/atualiza catálogo de plataforma, permissões e menus (updateOrCreate,
# idempotente). Sem isso, um módulo novo (ex.: Capd) roda normalmente por trás
# (migrations, rotas, controllers) mas não aparece pra habilitar por tenant no
# Admin Suite, porque a tela lê a tabela `modules` — não o filesystem. Rodar
# pra todo módulo a cada boot evita depender de alguém lembrar do passo manual
# sempre que um módulo novo entrar no repositório.
for module_json in Modules/*/module.json; do
  [ -f "$module_json" ] || continue
  module_name=$(basename "$(dirname "$module_json")")
  echo "Registrando módulo: ${module_name}..."
  php artisan module:register "$module_name" || echo "  aviso: falha ao registrar ${module_name} (seguindo o boot)"
done

# Perfis-template do módulo Cursos (Administrador, Instrutor, Participante) no
# tenant SYSTRAT — o ModuleRoleProvisioner os clona para cada tenant que
# habilitar o módulo. Idempotente (updateOrCreate).
php artisan db:seed --class='Modules\Cursos\Database\Seeders\CursosRbacSeeder' --force
php artisan db:seed --class='Modules\Escola\Database\Seeders\EscolaRbacSeeder' --force
php artisan db:seed --class='Modules\Pedagogico\Database\Seeders\PedagogicoRbacSeeder' --force
php artisan db:seed --class='Modules\Formatura\Database\Seeders\FormaturaRbacSeeder' --force
php artisan db:seed --class='Modules\Passeio\Database\Seeders\PasseioRbacSeeder' --force
php artisan db:seed --class='Modules\Portfolio\Database\Seeders\PortfolioRbacSeeder' --force
php artisan db:seed --class='Modules\Campanha\Database\Seeders\CampanhaRbacSeeder' --force
php artisan db:seed --class='Modules\Inservivel\Database\Seeders\InservivelRbacSeeder' --force

# Perfis-template do módulo Requerimentos (Administrador, Autor, Tramitador) e
# tipos padrão de proposições (Requerimento, Indicação, etc.). Idempotente.
php artisan db:seed --class='Modules\Requerimentos\Database\Seeders\RequerimentosRbacSeeder' --force
php artisan db:seed --class='Modules\Requerimentos\Database\Seeders\TiposInstrumentoDefaultSeeder' --force

# Libera todos os módulos no tenant SYSTRAT num banco novo — sem isso o
# Painel do Cliente dá "Acesso Negado" até alguém habilitar os módulos no
# Admin Suite. Precisa vir depois do module:register (senão capd/client/admin
# ainda não existem) e só age se o SYSTRAT não tiver nenhum módulo vinculado.
php artisan db:seed --class='Database\Seeders\SystratModulesSeeder' --force

# sysgov:seed-menus é um comando artisan avulso (não um Seeder de
# database/Seeders), então não entra no db:seed acima — precisa ser
# chamado à parte. Também idempotente (updateOrCreate por slug/route).
# Sem isso, o menu do admin fica vazio-ish (só os grupos registrados
# via module:register aparecem) até alguém rodar isso na mão.
php artisan sysgov:seed-menus

# Link storage/app/public -> public/storage — sem isso, arquivos enviados
# via Storage::disk('public') (ex.: logo do tenant) ficam salvos mas
# inacessíveis por URL (404). Idempotente: o comando já detecta e pula
# se o link existir.
php artisan storage:link || true

# Pré-compila configurações e rotas para máxima velocidade no Docker (elimina I/O repetido no Windows)
php artisan config:cache
php artisan route:cache

exec "$@"
