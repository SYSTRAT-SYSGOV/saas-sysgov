<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaMenu;
use Modules\Educa\Models\EducaMenuItem;

/**
 * Motor de Cálculo Nutricional e Homologação Técnica PNAE / FNDE.
 */
final class NutritionCalculationService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     status?: string|null,
     *     etapa_ensino?: string|null,
     *     tipo_refeicao?: string|null,
     *     data_inicio?: string|null,
     *     data_fim?: string|null,
     *     school_id?: string|null
     * } $filtros
     * @return Collection<int, EducaMenu>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaMenu::query()
            ->with(['items', 'school'])
            ->orderByDesc('vigencia_inicio');

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['etapa_ensino'])) {
            $query->where('etapa_ensino', $filtros['etapa_ensino']);
        }

        if (! empty($filtros['tipo_refeicao'])) {
            $query->where('tipo_refeicao', $filtros['tipo_refeicao']);
        }

        if (! empty($filtros['school_id'])) {
            $query->where(function ($q) use ($filtros) {
                $q->where('school_id', $filtros['school_id'])
                    ->orWhereNull('school_id');
            });
        }

        if (! empty($filtros['data_inicio']) && ! empty($filtros['data_fim'])) {
            $query->where('vigencia_inicio', '<=', $filtros['data_fim'])
                ->where('vigencia_fim', '>=', $filtros['data_inicio']);
        }

        return $query->get();
    }

    public function obter(string $menuId): EducaMenu
    {
        return EducaMenu::query()
            ->with(['items', 'school'])
            ->findOrFail($menuId);
    }

    /**
     * Cria um cardápio preliminar no status rascunho.
     *
     * @param array{
     *     nome: string,
     *     descricao?: string|null,
     *     etapa_ensino: string,
     *     tipo_refeicao: string,
     *     periodo: string,
     *     vigencia_inicio: string,
     *     vigencia_fim: string,
     *     school_id?: string|null,
     *     itens?: array<int, array{
     *         dia_semana: int,
     *         nome_preparacao: string,
     *         ingredientes?: string|null,
     *         medida_caseira?: string|null,
     *         porcao_gramas: float|int,
     *         calorias_kcal: float|int,
     *         carboidratos_g: float|int,
     *         proteinas_g: float|int,
     *         lipidios_g: float|int,
     *         fibras_g?: float|int|null,
     *         sodio_mg?: float|int|null,
     *         alergenos?: array<string>|null
     *     }>
     * } $dados
     */
    public function criarCardapio(array $dados, int $tenantId, int $userId): EducaMenu
    {
        return DB::transaction(function () use ($dados, $tenantId, $userId): EducaMenu {
            $menu = EducaMenu::create([
                'tenant_id' => $tenantId,
                'nome' => $dados['nome'],
                'descricao' => $dados['descricao'] ?? null,
                'etapa_ensino' => $dados['etapa_ensino'],
                'tipo_refeicao' => $dados['tipo_refeicao'],
                'periodo' => $dados['periodo'],
                'vigencia_inicio' => $dados['vigencia_inicio'],
                'vigencia_fim' => $dados['vigencia_fim'],
                'school_id' => $dados['school_id'] ?? null,
                'status' => 'rascunho',
                'created_by' => $userId,
            ]);

            if (! empty($dados['itens']) && is_array($dados['itens'])) {
                foreach ($dados['itens'] as $itemData) {
                    $menu->items()->create([
                        'tenant_id' => $tenantId,
                        'dia_semana' => $itemData['dia_semana'],
                        'nome_preparacao' => $itemData['nome_preparacao'],
                        'ingredientes' => $itemData['ingredientes'] ?? null,
                        'medida_caseira' => $itemData['medida_caseira'] ?? null,
                        'porcao_gramas' => $itemData['porcao_gramas'],
                        'calorias_kcal' => $itemData['calorias_kcal'],
                        'carboidratos_g' => $itemData['carboidratos_g'],
                        'proteinas_g' => $itemData['proteinas_g'],
                        'lipidios_g' => $itemData['lipidios_g'],
                        'fibras_g' => $itemData['fibras_g'] ?? 0,
                        'sodio_mg' => $itemData['sodio_mg'] ?? 0,
                        'alergenos' => $itemData['alergenos'] ?? [],
                    ]);
                }
            }

            $this->audit->record(
                'educa',
                'create',
                "educa_menu:{$menu->id}",
                null,
                $menu->toArray()
            );

            return $menu->load('items');
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizarCardapio(string $menuId, array $dados): EducaMenu
    {
        $menu = $this->obter($menuId);

        if ($menu->status === 'homologado' && empty($dados['permitir_edicao_homologado'])) {
            throw new LogicException('Cardápios homologados não podem ser alterados diretamente. Crie uma nova versão ou revogue a homologação.');
        }

        $anterior = $menu->toArray();
        $menu->update($dados);

        $this->audit->record(
            'educa',
            'update',
            "educa_menu:{$menu->id}",
            $anterior,
            $menu->toArray()
        );

        return $menu->fresh(['items', 'school']);
    }

    /**
     * Adiciona um item/preparação a um cardápio existente.
     *
     * @param array<string, mixed> $dados
     */
    public function adicionarItem(string $menuId, array $dados): EducaMenuItem
    {
        $menu = $this->obter($menuId);

        if ($menu->status === 'homologado') {
            throw new LogicException('Não é permitido adicionar preparações a um cardápio já homologado.');
        }

        $dados['tenant_id'] = $menu->tenant_id;
        $item = $menu->items()->create($dados);

        $this->audit->record(
            'educa',
            'create',
            "educa_menu_item:{$item->id}",
            null,
            $item->toArray()
        );

        return $item;
    }

    public function removerItem(string $itemId): void
    {
        $item = EducaMenuItem::query()->with('menu')->findOrFail($itemId);

        if ($item->menu->status === 'homologado') {
            throw new LogicException('Não é permitido remover preparações de um cardápio já homologado.');
        }

        $itemDados = $item->toArray();
        $item->delete();

        $this->audit->record(
            'educa',
            'delete',
            "educa_menu_item:{$itemId}",
            $itemDados,
            null
        );
    }

    /**
     * Realiza o cálculo consolidado dos macronutrientes e calorias de um cardápio.
     *
     * @return array{
     *     calorias_totais: float,
     *     carboidratos_g: float,
     *     proteinas_g: float,
     *     lipidios_g: float,
     *     fibras_g: float,
     *     sodio_mg: float,
     *     percentual_carboidratos: float,
     *     percentual_proteinas: float,
     *     percentual_lipidios: float,
     *     itens_contabilizados: int
     * }
     */
    public function calcularTotais(EducaMenu $menu): array
    {
        $items = $menu->items;

        $calorias = 0.0;
        $carboidratos = 0.0;
        $proteinas = 0.0;
        $lipidios = 0.0;
        $fibras = 0.0;
        $sodio = 0.0;

        foreach ($items as $item) {
            $calorias += (float) $item->calorias_kcal;
            $carboidratos += (float) $item->carboidratos_g;
            $proteinas += (float) $item->proteinas_g;
            $lipidios += (float) $item->lipidios_g;
            $fibras += (float) $item->fibras_g;
            $sodio += (float) $item->sodio_mg;
        }

        // 1g carboidrato = 4 kcal, 1g proteína = 4 kcal, 1g lipídio = 9 kcal
        $caloriasCarb = $carboidratos * 4;
        $caloriasProt = $proteinas * 4;
        $caloriasLip = $lipidios * 9;

        $totalCalculado = $calorias > 0 ? $calorias : ($caloriasCarb + $caloriasProt + $caloriasLip);

        $pctCarb = $totalCalculado > 0 ? round(($caloriasCarb / $totalCalculado) * 100, 2) : 0.0;
        $pctProt = $totalCalculado > 0 ? round(($caloriasProt / $totalCalculado) * 100, 2) : 0.0;
        $pctLip = $totalCalculado > 0 ? round(($caloriasLip / $totalCalculado) * 100, 2) : 0.0;

        return [
            'calorias_totais' => round($calorias, 2),
            'carboidratos_g' => round($carboidratos, 2),
            'proteinas_g' => round($proteinas, 2),
            'lipidios_g' => round($lipidios, 2),
            'fibras_g' => round($fibras, 2),
            'sodio_mg' => round($sodio, 2),
            'percentual_carboidratos' => $pctCarb,
            'percentual_proteinas' => $pctProt,
            'percentual_lipidios' => $pctLip,
            'itens_contabilizados' => $items->count(),
        ];
    }

    /**
     * Avalia a conformidade com as diretrizes nutricionais do PNAE/FNDE.
     *
     * @return array{
     *     conforme: bool,
     *     etapa_ensino: string,
     *     faixa_calorica_recomendada: array{min: int, max: int},
     *     totais: array<string, mixed>,
     *     advertencias: array<int, string>
     * }
     */
    public function verificarConformidadePnae(EducaMenu $menu): array
    {
        $totais = $this->calcularTotais($menu);
        $advertencias = [];

        // Faixas de calorias por etapa de ensino (PNAE)
        $faixas = match ($menu->etapa_ensino) {
            'creche' => ['min' => 350, 'max' => 700],
            'infantil' => ['min' => 300, 'max' => 600],
            'fundamental' => ['min' => 350, 'max' => 750],
            'medio' => ['min' => 400, 'max' => 850],
            'eja' => ['min' => 300, 'max' => 650],
            default => ['min' => 300, 'max' => 800],
        };

        if ($totais['calorias_totais'] < $faixas['min']) {
            $advertencias[] = "O valor calórico ({$totais['calorias_totais']} kcal) está abaixo do mínimo recomendado para a etapa {$menu->etapa_ensino} ({$faixas['min']} kcal).";
        } elseif ($totais['calorias_totais'] > $faixas['max']) {
            $advertencias[] = "O valor calórico ({$totais['calorias_totais']} kcal) excede o teto recomendado para a etapa {$menu->etapa_ensino} ({$faixas['max']} kcal).";
        }

        // Distribuição de macronutrientes:
        // Carboidratos: 55% a 65%
        if ($totais['percentual_carboidratos'] < 55.0 || $totais['percentual_carboidratos'] > 65.0) {
            $advertencias[] = "Percentual de carboidratos ({$totais['percentual_carboidratos']}%) fora da faixa preconizada pelo PNAE (55% a 65%).";
        }

        // Proteínas: 10% a 15%
        if ($totais['percentual_proteinas'] < 10.0 || $totais['percentual_proteinas'] > 15.0) {
            $advertencias[] = "Percentual de proteínas ({$totais['percentual_proteinas']}%) fora da faixa preconizada pelo PNAE (10% a 15%).";
        }

        // Lipídios: 15% a 30%
        if ($totais['percentual_lipidios'] < 15.0 || $totais['percentual_lipidios'] > 30.0) {
            $advertencias[] = "Percentual de lipídios ({$totais['percentual_lipidios']}%) fora da faixa preconizada pelo PNAE (15% a 30%).";
        }

        return [
            'conforme' => empty($advertencias),
            'etapa_ensino' => $menu->etapa_ensino,
            'faixa_calorica_recomendada' => $faixas,
            'totais' => $totais,
            'advertencias' => $advertencias,
        ];
    }

    /**
     * Homologação técnica por nutricionista habilitado com número de CRN.
     */
    public function homologarCardapio(
        string $menuId,
        string $responsavelNome,
        string $responsavelCrn,
        int $userId
    ): EducaMenu {
        $nomeLimpo = trim($responsavelNome);
        $crnLimpo = trim($responsavelCrn);

        if ($nomeLimpo === '' || $crnLimpo === '') {
            throw new InvalidArgumentException('O nome do nutricionista e o registro no Conselho Regional de Nutricionistas (CRN) são de preenchimento obrigatório para homologação técnica.');
        }

        $menu = $this->obter($menuId);

        if ($menu->items->isEmpty()) {
            throw new LogicException('Não é possível homologar um cardápio sem itens/preparações alimentares cadastradas.');
        }

        $anterior = $menu->toArray();

        $menu->update([
            'status' => 'homologado',
            'responsavel_tecnico_nome' => $nomeLimpo,
            'responsavel_tecnico_crn' => $crnLimpo,
            'homologado_em' => Carbon::now(),
            'homologado_por' => $userId,
        ]);

        $this->audit->record(
            'educa',
            'homologar',
            "educa_menu:{$menu->id}",
            $anterior,
            $menu->toArray()
        );

        return $menu->fresh(['items', 'school']);
    }

    /**
     * Revogação da homologação para correção ou reelaboração.
     */
    public function revogarHomologacao(string $menuId, string $motivo, int $userId): EducaMenu
    {
        $menu = $this->obter($menuId);

        if ($menu->status !== 'homologado') {
            throw new LogicException('Apenas cardápios homologados podem ter sua homologação revogada.');
        }

        $anterior = $menu->toArray();

        $menu->update([
            'status' => 'rejeitado',
            'descricao' => trim(($menu->descricao ?? '') . " [Homologação revogada em " . Carbon::now()->format('d/m/Y H:i') . ": {$motivo}]"),
        ]);

        $this->audit->record(
            'educa',
            'revogar_homologacao',
            "educa_menu:{$menu->id}",
            $anterior,
            $menu->toArray()
        );

        return $menu->fresh(['items', 'school']);
    }
}
