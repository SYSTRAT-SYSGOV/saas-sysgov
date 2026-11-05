<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Client\Support\Agrupadores;

/**
 * Educação como módulo de navegação (change educacao-modulo-submodulos): os itens de menu de Cadastro Escolar, Gestão
 * Pedagógica, Formatura e Eventos, Passeios, Portfólio Digital e Transporte Escolar passam a ser filhos do item
 * "Educação". Só reposiciona linhas existentes de `client_menu_items`: não apaga nem recria item que o tenant removeu,
 * mantém permissão, ícone, atalho e situação (ativo ou não), e pode rodar mais de uma vez.
 */
return new class extends Migration {
    private const AGRUPADOR = 'educacao';

    public function up(): void
    {
        if (!Schema::hasTable('client_menu_items')) {
            return;
        }

        $submodulos = Agrupadores::submodulosDaEducacao();
        $itens = DB::table('client_menu_items')->whereIn('module_alias', array_keys($submodulos))->orderBy('order')->orderBy('id')->get();
        if ($itens->isEmpty()) {
            return;
        }

        $agora = now();
        $dados = Agrupadores::dados(self::AGRUPADOR);
        $paiPorGrupo = [];
        $posicao = [];

        foreach ($itens->groupBy('menu_group_id') as $grupoId => $doGrupo) {
            $pai = DB::table('client_menu_items')->where('menu_group_id', $grupoId)->where('route', Agrupadores::rota(self::AGRUPADOR))->whereNull('parent_id')->first();
            $paiPorGrupo[$grupoId] = $pai !== null ? $pai->id : DB::table('client_menu_items')->insertGetId([
                'menu_group_id' => $grupoId, 'parent_id' => null, 'label' => $dados['label'], 'icon' => $dados['icon'],
                'route' => Agrupadores::rota(self::AGRUPADOR), 'permission' => null, 'module_alias' => null, 'shortcut' => null,
                // O agrupador ocupa o lugar do primeiro módulo movido, para o menu não mudar de posição.
                'order' => (int) $doGrupo->min('order'), 'is_active' => true, 'created_at' => $agora, 'updated_at' => $agora,
            ]);
            $posicao[$grupoId] = 0;
        }

        foreach (array_keys($submodulos) as $alias) {
            foreach ($itens->where('module_alias', $alias) as $item) {
                [$slug, $rotulo] = $submodulos[$alias];
                DB::table('client_menu_items')->where('id', $item->id)->update([
                    'parent_id' => $paiPorGrupo[$item->menu_group_id], 'label' => $rotulo,
                    'route' => Agrupadores::rotaDoSubmodulo(self::AGRUPADOR, $slug),
                    'order' => ++$posicao[$item->menu_group_id], 'updated_at' => $agora,
                ]);
            }
        }

        $this->invalidarCacheDeNavegacao();
    }

    public function down(): void
    {
        if (!Schema::hasTable('client_menu_items')) {
            return;
        }

        $submodulos = Agrupadores::submodulosDaEducacao();
        $pais = DB::table('client_menu_items')->where('route', Agrupadores::rota(self::AGRUPADOR))->whereNull('parent_id')->whereNull('module_alias')->pluck('id', 'menu_group_id');

        foreach ($submodulos as $alias => [$slug]) {
            DB::table('client_menu_items')->where('module_alias', $alias)->whereIn('parent_id', $pais->values())->update([
                'parent_id' => null, 'route' => '/' . $alias, 'updated_at' => now(),
            ]);
        }

        DB::table('client_menu_items')->whereIn('id', $pais->values())->whereNotExists(
            fn ($q) => $q->select(DB::raw(1))->from('client_menu_items as f')->whereColumn('f.parent_id', 'client_menu_items.id'),
        )->delete();

        $this->invalidarCacheDeNavegacao();
    }

    /** O menu é versionado por tenant na sessão: sem isso, quem está logado só veria a mudança no próximo login. */
    private function invalidarCacheDeNavegacao(): void
    {
        if (!Schema::hasTable('tenants')) {
            return;
        }
        foreach (DB::table('tenants')->pluck('id') as $tenantId) {
            Cache::put('nav:version:' . $tenantId, now()->timestamp, now()->addYear());
        }
    }
};
