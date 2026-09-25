<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\HerdeiroSucessao;
use Modules\Cemiterios\Models\ProcessoSucessao;
use Modules\Cemiterios\Support\Documento;
use Modules\Cemiterios\Support\RegraNegocioException;

final readonly class SucessaoService
{
    public function __construct(
        private AuditLogger $audit,
    ) {}

    /**
     * @param array{concession_id: int, numero_processo: string, tipo_documento: string, vara_ou_cartorio?: string|null} $dados
     */
    public function abrirProcesso(array $dados): ProcessoSucessao
    {
        $concessao = Concessao::findOrFail($dados['concession_id']);

        $existente = ProcessoSucessao::where('concession_id', $concessao->id)
            ->where('situacao', 'em_analise')
            ->first();

        if ($existente) {
            throw new RegraNegocioException('processo.duplicado', 'Já existe um processo de sucessão em análise para esta concessão.');
        }

        return DB::transaction(function () use ($concessao, $dados): ProcessoSucessao {
            $processo = ProcessoSucessao::create([
                'concession_id' => $concessao->id,
                'numero_processo' => $dados['numero_processo'],
                'tipo_documento' => $dados['tipo_documento'],
                'vara_ou_cartorio' => $dados['vara_ou_cartorio'] ?? null,
                'situacao' => 'em_analise',
            ]);

            $concessao->update([
                'pendencia_regularizacao' => true,
                'motivo_pendencia' => 'sucessao_hereditaria',
            ]);

            $this->audit->record(
                module: 'cemiterios',
                action: 'sucessao.aberta',
                resource: "ProcessoSucessao:{$processo->id}",
                before: null,
                after: ['numero_processo' => $processo->numero_processo, 'concessao_id' => $concessao->id]
            );

            return $processo;
        });
    }

    /**
     * @param array{nome: string, parentesco: string, documento?: string|null, telefone?: string|null, email?: string|null, titular_indicado?: bool} $dados
     */
    public function adicionarHerdeiro(ProcessoSucessao $processo, array $dados): HerdeiroSucessao
    {
        if ($processo->situacao !== 'em_analise') {
            throw new RegraNegocioException('processo.nao_editavel', 'Só é possível adicionar herdeiros em processos em análise.');
        }

        return DB::transaction(function () use ($processo, $dados): HerdeiroSucessao {
            $titularIndicado = (bool) ($dados['titular_indicado'] ?? false);

            if ($titularIndicado) {
                HerdeiroSucessao::where('process_id', $processo->id)
                    ->where('titular_indicado', true)
                    ->update(['titular_indicado' => false]);
            }

            return HerdeiroSucessao::create([
                'process_id' => $processo->id,
                'nome' => $dados['nome'],
                'parentesco' => $dados['parentesco'],
                'documento' => $dados['documento'] ?? null,
                'telefone' => $dados['telefone'] ?? null,
                'email' => $dados['email'] ?? null,
                'titular_indicado' => $titularIndicado,
            ]);
        });
    }

    /**
     * @param array{despacho_fundamentacao: string, herdeiro_id?: int|null, novo_titular_id?: int|null} $dados
     */
    public function deferir(ProcessoSucessao $processo, array $dados, ?int $userId = null): ProcessoSucessao
    {
        if ($processo->situacao !== 'em_analise') {
            throw new RegraNegocioException('processo.situacao_invalida', 'Apenas processos em análise podem ser deferidos.');
        }

        return DB::transaction(function () use ($processo, $dados, $userId): ProcessoSucessao {
            $concessao = $processo->concessao()->lockForUpdate()->firstOrFail();

            $novoTitular = null;
            if (!empty($dados['novo_titular_id'])) {
                $novoTitular = Concessionario::findOrFail($dados['novo_titular_id']);
            } elseif (!empty($dados['herdeiro_id'])) {
                $herdeiro = HerdeiroSucessao::where('process_id', $processo->id)->findOrFail($dados['herdeiro_id']);
                $docLimpo = Documento::somenteDigitos($herdeiro->documento ?? '');
                if (strlen($docLimpo) === 11 || strlen($docLimpo) === 14) {
                    $novoTitular = Concessionario::firstOrCreate(
                        ['documento_hash' => Documento::hash($docLimpo)],
                        [
                            'nome' => $herdeiro->nome,
                            'tipo_doc' => strlen($docLimpo) === 14 ? 'cnpj' : 'cpf',
                            'documento' => $docLimpo,
                            'telefone' => $herdeiro->telefone,
                            'email' => $herdeiro->email,
                            'titular_falecido' => false,
                        ]
                    );
                } else {
                    $fakeDoc = '000' . str_pad((string) $herdeiro->id, 8, '0', STR_PAD_LEFT);
                    $novoTitular = Concessionario::create([
                        'nome' => $herdeiro->nome,
                        'tipo_doc' => 'cpf',
                        'documento' => $fakeDoc,
                        'documento_hash' => Documento::hash($fakeDoc),
                        'telefone' => $herdeiro->telefone,
                        'email' => $herdeiro->email,
                        'titular_falecido' => false,
                    ]);
                }
            } else {
                $herdeiroIndicado = HerdeiroSucessao::where('process_id', $processo->id)
                    ->where('titular_indicado', true)
                    ->first();

                if (!$herdeiroIndicado) {
                    throw new RegraNegocioException('herdeiro.obrigatorio', 'É necessário indicar um herdeiro como titular representante para deferir o processo.');
                }

                $docLimpo = Documento::somenteDigitos($herdeiroIndicado->documento ?? '');
                $docFinal = (strlen($docLimpo) === 11 || strlen($docLimpo) === 14)
                    ? $docLimpo
                    : ('000' . str_pad((string) $herdeiroIndicado->id, 8, '0', STR_PAD_LEFT));

                $novoTitular = Concessionario::firstOrCreate(
                    ['documento_hash' => Documento::hash($docFinal)],
                    [
                        'nome' => $herdeiroIndicado->nome,
                        'tipo_doc' => strlen($docFinal) === 14 ? 'cnpj' : 'cpf',
                        'documento' => $docFinal,
                        'telefone' => $herdeiroIndicado->telefone,
                        'email' => $herdeiroIndicado->email,
                        'titular_falecido' => false,
                    ]
                );
            }

            $ano = now()->year;
            $termoNumero = "TERMO-SUC-{$ano}-" . str_pad((string) $processo->id, 5, '0', STR_PAD_LEFT);

            $processo->update([
                'situacao' => 'deferido',
                'despacho_fundamentacao' => $dados['despacho_fundamentacao'],
                'novo_titular_id' => $novoTitular->id,
                'termo_numero' => $termoNumero,
                'deferido_em' => now(),
                'deferido_por_id' => $userId,
            ]);

            // Atualiza a concessão transferindo a titularidade e destravando sepultamentos
            $antigoTitularId = $concessao->holder_id;
            $concessao->update([
                'holder_id' => $novoTitular->id,
                'pendencia_regularizacao' => false,
                'motivo_pendencia' => null,
            ]);

            $this->audit->record(
                module: 'cemiterios',
                action: 'sucessao.deferida',
                resource: "ProcessoSucessao:{$processo->id}",
                before: ['holder_id' => $antigoTitularId, 'pendencia' => true],
                after: ['holder_id' => $novoTitular->id, 'termo' => $termoNumero, 'pendencia' => false]
            );

            return $processo->fresh(['concessao', 'herdeiros', 'novoTitular', 'deferidoPor']);
        });
    }

    public function indeferir(ProcessoSucessao $processo, string $motivo, ?int $userId = null): ProcessoSucessao
    {
        if ($processo->situacao !== 'em_analise') {
            throw new RegraNegocioException('processo.situacao_invalida', 'Apenas processos em análise podem ser indeferidos.');
        }

        $processo->update([
            'situacao' => 'indeferido',
            'despacho_fundamentacao' => $motivo,
            'deferido_em' => now(),
            'deferido_por_id' => $userId,
        ]);

        $this->audit->record(
            module: 'cemiterios',
            action: 'sucessao.indeferida',
            resource: "ProcessoSucessao:{$processo->id}",
            before: ['situacao' => 'em_analise'],
            after: ['situacao' => 'indeferido', 'motivo' => $motivo]
        );

        return $processo;
    }
}
