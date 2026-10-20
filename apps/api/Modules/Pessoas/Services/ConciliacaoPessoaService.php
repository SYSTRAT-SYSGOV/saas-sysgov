<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Support\Documento;
use Modules\Pessoas\Support\RegistroConciliacao;
use Modules\Pessoas\Support\RegraNegocioException;

/**
 * Concilia as cópias de dado civil de um módulo com o cadastro central (unificar-cadastro-pessoas, D5):
 * resolve cada registro por documento (ou cria pessoa com documento pendente), vincula, completa o que está
 * vazio no cadastro e registra divergências sem nunca sobrescrever. Idempotente: reexecutar não cria pessoa,
 * não altera registro já conciliado e não duplica divergência aberta. Em `dry-run` roda a mesma lógica dentro
 * de uma transação que é desfeita, então o relatório é exatamente o que a execução real faria.
 *
 * @phpstan-type Relatorio array{
 *     modulo: string, dry_run: bool, processados: int, ja_vinculados: int, vinculados_por_documento: int,
 *     criadas_pendentes: int, campos_completados: int, divergencias_registradas: int,
 *     possiveis_duplicidades: list<array{registro_id: int, sugestoes: list<int>}>,
 *     sem_responsavel: list<int>, erros: list<array{registro_id: int, motivo: string}>
 * }
 */
final class ConciliacaoPessoaService
{
    private const CAMPOS = ['nome', 'nome_social', 'data_nascimento', 'nome_mae', 'nome_pai'];

    public function __construct(private readonly ResolucaoPessoaService $resolucao) {}

    /** @return Relatorio */
    public function conciliar(ConciliacaoModuloInterface $modulo, bool $dryRun = false): array
    {
        $relatorio = [
            'modulo' => $modulo->modulo(), 'dry_run' => $dryRun, 'processados' => 0, 'ja_vinculados' => 0,
            'vinculados_por_documento' => 0, 'criadas_pendentes' => 0, 'campos_completados' => 0,
            'divergencias_registradas' => 0, 'possiveis_duplicidades' => [], 'sem_responsavel' => [], 'erros' => [],
        ];

        DB::beginTransaction();
        try {
            foreach ($modulo->registros() as $registro) {
                $relatorio['processados']++;
                $this->conciliarRegistro($modulo, $registro, $relatorio);
            }
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
        $dryRun ? DB::rollBack() : DB::commit();

        return $relatorio;
    }

    /** @param Relatorio $relatorio */
    private function conciliarRegistro(ConciliacaoModuloInterface $modulo, RegistroConciliacao $registro, array &$relatorio): void
    {
        if ($registro->pessoaId !== null) {
            $pessoa = Pessoa::query()->find($registro->pessoaId);
            if ($pessoa === null) {
                $relatorio['erros'][] = ['registro_id' => $registro->id, 'motivo' => 'pessoa_vinculada_inexistente'];

                return;
            }
            $relatorio['ja_vinculados']++;
            $this->conciliarDados($modulo, $registro, $pessoa, $relatorio);

            return;
        }

        $digitos = Documento::somenteDigitos((string) $registro->documento);
        if ($digitos !== '') {
            $this->conciliarComDocumento($modulo, $registro, $digitos, $relatorio);

            return;
        }

        $this->conciliarSemDocumento($modulo, $registro, $relatorio);
    }

    /** @param Relatorio $relatorio */
    private function conciliarComDocumento(ConciliacaoModuloInterface $modulo, RegistroConciliacao $registro, string $digitos, array &$relatorio): void
    {
        if (! Documento::validoPorTamanho($digitos)) {
            $relatorio['erros'][] = ['registro_id' => $registro->id, 'motivo' => 'documento_invalido'];

            return;
        }

        $tipo = (string) Documento::tipoPorDigitos($digitos);
        $existente = Pessoa::withTrashed()->where('tipo', $tipo)->where('documento_hash', Documento::hash($digitos))->first();

        if ($existente !== null) {
            $existente->trashed() && $existente->restore();
            $pessoa = $existente;
            $this->conciliarDados($modulo, $registro, $pessoa, $relatorio);
        } elseif ($tipo === 'fisica') {
            $pessoa = $this->resolucao->resolverPorCpf($digitos, array_filter($registro->dadosCivis, fn ($v): bool => $v !== null && $v !== ''), $modulo->modulo());
        } else {
            // Pessoa jurídica inexistente não é criada por conciliação: exige cadastro com razão social.
            $relatorio['erros'][] = ['registro_id' => $registro->id, 'motivo' => 'pessoa_juridica_inexistente'];

            return;
        }

        $modulo->vincular($registro->id, $pessoa->id);
        $relatorio['vinculados_por_documento']++;
    }

    /** @param Relatorio $relatorio */
    private function conciliarSemDocumento(ConciliacaoModuloInterface $modulo, RegistroConciliacao $registro, array &$relatorio): void
    {
        try {
            $pessoa = $this->resolucao->resolverSemDocumento(
                array_filter($registro->dadosCivis, fn ($v): bool => $v !== null && $v !== ''),
                $modulo->modulo(),
                $registro->responsavelPessoaId,
                false,
                $registro->exigirNascimento,
            );
        } catch (RegraNegocioException $e) {
            if ($e->codigo === 'pessoa_semelhante_existente') {
                $sugestoes = [];
                foreach ((array) ($e->contexto['sugestoes'] ?? []) as $sugestao) {
                    $sugestoes[] = (int) $sugestao['id'];
                }
                $relatorio['possiveis_duplicidades'][] = ['registro_id' => $registro->id, 'sugestoes' => $sugestoes];
            } elseif ($e->codigo === 'responsavel_obrigatorio') {
                $relatorio['sem_responsavel'][] = $registro->id;
            } else {
                $relatorio['erros'][] = ['registro_id' => $registro->id, 'motivo' => $e->codigo];
            }

            return;
        }

        $modulo->vincular($registro->id, $pessoa->id);
        $relatorio['criadas_pendentes']++;
    }

    /**
     * Completa o que está vazio no cadastro central e registra divergência do que difere.
     *
     * @param Relatorio $relatorio
     */
    private function conciliarDados(ConciliacaoModuloInterface $modulo, RegistroConciliacao $registro, Pessoa $pessoa, array &$relatorio): void
    {
        $completar = [];
        foreach (self::CAMPOS as $campo) {
            $doModulo = $this->valor($campo, $registro->dadosCivis[$campo] ?? null);
            if ($doModulo === null) {
                continue;
            }
            $doMdm = $this->valor($campo, $pessoa->getAttribute($campo));
            if ($doMdm === null) {
                $completar[$campo] = $registro->dadosCivis[$campo];

                continue;
            }
            if ($this->comparavel($campo, $doModulo) === $this->comparavel($campo, $doMdm)) {
                continue;
            }
            $jaAberta = PessoaDivergencia::query()->abertas()
                ->where('tabela', $modulo->tabela())->where('registro_id', $registro->id)->where('campo', $campo)->exists();
            if (! $jaAberta) {
                PessoaDivergencia::create([
                    'pessoa_id' => $pessoa->id, 'modulo' => $modulo->modulo(), 'tabela' => $modulo->tabela(),
                    'registro_id' => $registro->id, 'campo' => $campo, 'valor_modulo' => $doModulo, 'valor_mdm' => $doMdm,
                ]);
                $relatorio['divergencias_registradas']++;
            }
        }

        if ($completar !== []) {
            $this->resolucao->completarCamposVazios($pessoa, $completar, $modulo->modulo());
            $relatorio['campos_completados'] += count($completar);
        }
    }

    /** Normaliza o valor para texto (datas em Y-m-d); vazio vira `null`. */
    private function valor(string $campo, mixed $valor): ?string
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        if ($campo === 'data_nascimento') {
            return CarbonImmutable::parse($valor instanceof \DateTimeInterface ? $valor->format('Y-m-d') : (string) $valor)->toDateString();
        }

        return trim((string) $valor);
    }

    /** Nomes são comparados sem acento, caixa e espaços repetidos; datas, exatamente. */
    private function comparavel(string $campo, string $valor): string
    {
        return $campo === 'data_nascimento' ? $valor : (string) preg_replace('/\s+/', ' ', mb_strtolower(Str::ascii($valor)));
    }
}
