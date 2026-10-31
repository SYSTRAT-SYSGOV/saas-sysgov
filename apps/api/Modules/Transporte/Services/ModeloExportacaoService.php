<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Modules\Transporte\Censo\Leiautes;
use Modules\Transporte\Models\ModeloExportacao;
use Modules\Transporte\Support\ConflitoException;

final class ModeloExportacaoService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Garante o modelo padrão do tenant (criado na primeira consulta) e devolve todos, o padrão primeiro.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, ModeloExportacao>
     */
    public function listar(): \Illuminate\Database\Eloquent\Collection
    {
        $leiaute = Leiautes::padrao();
        ModeloExportacao::query()->firstOrCreate(
            ['nome' => ModeloExportacao::NOME_PADRAO],
            ['leiaute' => $leiaute->chave(), 'campos' => SelecaoCampos::padrao($leiaute), 'padrao' => true],
        );

        return ModeloExportacao::query()->orderByDesc('padrao')->orderBy('nome')->get();
    }

    /** @param array<string, mixed> $dados */
    public function salvar(?ModeloExportacao $modelo, array $dados, ?int $usuarioId): ModeloExportacao
    {
        if ($modelo?->padrao) {
            throw new ConflitoException('O modelo padrão não pode ser alterado.');
        }
        $leiaute = Leiautes::obter($dados['leiaute'] ?? $modelo?->leiaute);
        $nome = trim((string) $dados['nome']);
        if ($nome === ModeloExportacao::NOME_PADRAO) {
            throw new ConflitoException('Esse nome é reservado ao modelo padrão.');
        }
        $duplicado = ModeloExportacao::query()->where('nome', $nome)->when($modelo, fn ($q) => $q->whereKeyNot($modelo->id))->exists();
        if ($duplicado) {
            throw new ConflitoException('Já existe um modelo com esse nome.');
        }
        // Sensíveis ficam no modelo, mas a confirmação é pedida a cada geração: o modelo guarda só as chaves.
        $resolvidos = SelecaoCampos::resolver($leiaute, array_values($dados['campos']), array_values($dados['campos']));
        if ($resolvidos['ignorados'] !== []) {
            throw new DomainException('Campos que o leiaute não tem: ' . implode(', ', $resolvidos['ignorados']) . '.');
        }

        $antes = $modelo?->toArray();
        $campos = ['nome' => $nome, 'leiaute' => $leiaute->chave(), 'campos' => $resolvidos['campos']];
        $modelo = $modelo === null ? ModeloExportacao::create([...$campos, 'criado_por' => $usuarioId]) : tap($modelo)->update($campos);
        $this->audit->record('transporte', $antes === null ? 'modelo_exportacao.criado' : 'modelo_exportacao.alterado', "modelo:{$modelo->id}", $antes, $modelo->toArray());

        return $modelo;
    }

    public function excluir(ModeloExportacao $modelo): void
    {
        if ($modelo->padrao) {
            throw new ConflitoException('O modelo padrão não pode ser excluído.');
        }
        $antes = $modelo->toArray();
        $modelo->delete();
        $this->audit->record('transporte', 'modelo_exportacao.excluido', "modelo:{$modelo->id}", $antes, null);
    }

    /**
     * Aplica o modelo ao leiaute pedido: campos que o leiaute não tem são ignorados e devolvidos para o aviso.
     *
     * @return array{campos: list<string>, ignorados: list<string>}
     */
    public function aplicar(ModeloExportacao $modelo, ?string $leiauteChave): array
    {
        $leiaute = Leiautes::obter($leiauteChave ?? $modelo->leiaute);
        $existentes = array_map(fn ($c): string => $c->chave, $leiaute->campos());
        $campos = array_values(array_intersect($modelo->campos, $existentes));

        return ['campos' => $campos, 'ignorados' => array_values(array_diff($modelo->campos, $existentes))];
    }
}
