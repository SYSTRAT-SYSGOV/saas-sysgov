<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class MakeModule extends Command
{
    protected $signature = 'make:module {name}';
    protected $description = 'Gera um módulo Laravel tenant-aware conforme o contrato SYSGOV';

    public function handle(): int
    {
        $name = preg_replace('/[^A-Za-z0-9]/', '', (string) $this->argument('name'));
        abort_if($name === '', 422, 'Nome de módulo inválido.');
        $base = base_path("Modules/{$name}");
        foreach (['Config', 'Database/Migrations', 'Database/Seeders', 'Http/Controllers', 'Http/Middleware', 'Http/Requests', 'Http/Resources', 'Models', 'Policies', 'Routes', 'Services', 'Events', 'Listeners', 'Tests'] as $directory) File::ensureDirectoryExists("{$base}/{$directory}");
        File::put("{$base}/module.json", json_encode(['name' => $name, 'alias' => strtolower($name), 'description' => '', 'priority' => 0, 'providers' => [], 'requires' => [], 'menu' => ['label' => $name, 'icon' => 'Box', 'order' => 100, 'permission' => strtolower($name) . '.view']], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->info("Módulo {$name} criado em Modules/{$name}.");
        return self::SUCCESS;
    }
}
