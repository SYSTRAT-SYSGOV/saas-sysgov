<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Listeners\EnviarEmail;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;

/** Concessões temporárias e perpétuas: outorga, renovação, expiração e aviso de término (RF-11..RF-14). */
final readonly class ConcessaoService
{
    public function __construct(
        private JazigoEstadoService $estados,
        private ParametroService $parametros,
        private GuiaService $guias,
    ) {}

    /**
     * Calcula a data de fim com base no tipo de concessão e prazo.
     */
    private function calcularDataFim(string $tipo, \Carbon\CarbonInterface $dataInicio): ?string
    {
        return $tipo === 'perpetua'
            ? null
            : $dataInicio->addYearsNoOverflow($this->parametros->vigente()->concessao_temporaria_anos)->toDateString();
    }

    /**
     * Verifica se a concessão está no período de vencimento (prestes a vencer).
     */
    private function estaVencendo(Concessao $concessao): bool
    {
        if ($concessao->tipo === 'perpetua' || $concessao->vigencia_manifestacao_dias === null) {
            return false;
        }

        $dataLimite = $concessao->data_fim->subDays($concessao->vigencia_manifestacao_dias);
        return today()->greaterThanOrEqualTo($dataLimite) && today()->lessThan($concessao->data_fim);
    }

    /** @param array{plot_id: int, holder_id: int, tipo: string, data_inicio?: string|null, lock_version: int, sujeita_taxa_anual?: bool} $dados */
    public function solicitar(array $dados): Concessao
    {
        $jazigo = Jazigo::findOrFail($dados['plot_id']);

        // A versão lida é conferida antes de tudo: dois atendentes no mesmo jazigo → um recebe 409 (RNF-06).
        if ($jazigo->lock_version !== (int) $dados['lock_version']) {
            throw new ConflitoVersaoException();
        }
        if ($jazigo->estado !== EstadoJazigo::Disponivel || $jazigo->concessaoVigente() !== null) {
            throw new RegraNegocioException('jazigo.indisponivel', 'Somente jazigo Disponível pode ser concedido.');
        }

        $dataInicio = CarbonImmutable::parse($dados['data_inicio'] ?? today());

        return DB::transaction(function () use ($dados, $jazigo, $dataInicio): Concessao {
            $ano = (int) $dataInicio->year;
            $sequencia = Concessao::withTrashed()->where('numero', 'like', "%/{$ano}")->lockForUpdate()->count() + 1;

            $concessao = Concessao::create([
                'numero' => "{$sequencia}/{$ano}",
                'plot_id' => $jazigo->id,
                'holder_id' => $dados['holder_id'],
                'tipo' => $dados['tipo'],
                'data_inicio' => $dataInicio->toDateString(),
                'data_fim' => $this->calcularDataFim($dados['tipo'], $dataInicio),
                'sujeita_taxa_anual' => $dados['sujeita_taxa_anual'] ?? true,
                'estado' => 'Solicitada',
                'lock_version' => 0, // Inicializa lock_version para novas concessões
            ]);

            $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} solicitada", (int) $dados['lock_version']);

            return $concessao;
        });
    }

    /** @return array{concessao: Concessao, guia: Guia} */
    public function aprovar(Concessao $concessao): array
    {
        if ($concessao->estado !== 'Solicitada') {
            throw new RegraNegocioException('concessao.nao_aprovavel', 'Somente concessão Solicitada pode ser aprovada.');
        }

        return DB::transaction(function () use ($concessao): array {
            $versao = $concessao->lock_version;
            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Ativa',
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            return ['concessao' => $concessao->refresh(), 'guia' => $this->guias->emitirParaConcessao($concessao, 'outorga')];
        });
    }

    /** @return array{concessao: Concessao, guia: Guia} */
    public function renovar(Concessao $concessao, ?string $processoAdministrativo = null): array
    {
        if ($concessao->tipo !== 'temporaria' || $concessao->estado !== 'Ativa') {
            throw new RegraNegocioException('concessao.nao_renovavel', 'Somente concessão temporária Ativa pode ser renovada.');
        }

        return DB::transaction(function () use ($concessao): array {
            $versao = $concessao->lock_version;
            $base = CarbonImmutable::parse(max($concessao->data_fim->toDateString(), today()->toDateString()));
            $updateData = [
                'data_fim' => $base->addYearsNoOverflow($this->parametros->vigente()->concessao_temporaria_anos)->toDateString(),
                'notificado_para_termino' => null,
                'lock_version' => $versao + 1,
            ];

            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update($updateData);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            return ['concessao' => $concessao->refresh(), 'guia' => $this->guias->emitirParaConcessao($concessao, 'renovacao')];
        });
    }

    /**
     * Extingue por renúncia voluntária do concessionário (distinta de
     * abandono e de expiração automática por decurso de prazo).
     */
    public function renunciar(Concessao $concessao, string $motivo, ?string $processoAdministrativo = null): Concessao
    {
        if ($concessao->estado !== 'Ativa') {
            throw new RegraNegocioException('concessao.nao_renunciavel', 'Somente concessão Ativa pode ser objeto de renúncia.');
        }

        return DB::transaction(function () use ($concessao, $motivo): Concessao {
            $versao = $concessao->lock_version;
            $jazigo = $concessao->jazigo()->firstOrFail();

            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Caduca',
                    'motivo_extincao' => 'renuncia',
                    'extinta_em' => today()->toDateString(),
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} renunciada: {$motivo}");

            return $concessao->refresh();
        });
    }

    /**
     * Expira concessões temporárias vencidas (idempotente). Com restos no
     * jazigo, a concessão fica com pendência de regularização (RF-14).
     */
    public function expirarVencidas(): int
    {
        $total = 0;

        Concessao::where('estado', 'Ativa')->where('tipo', 'temporaria')
            ->whereDate('data_fim', '<', today()->toDateString())
            ->each(function (Concessao $concessao) use (&$total): void {
                DB::transaction(function () use ($concessao): void {
                    $versao = $concessao->lock_version;
                    $jazigo = $concessao->jazigo()->firstOrFail();

                    $afetadas = Concessao::query()
                        ->whereKey($concessao->getKey())
                        ->where('lock_version', $versao)
                        ->update([
                            'estado' => 'Vencida',
                            'pendencia_regularizacao' => $jazigo->ocupacao > 0,
                            'lock_version' => $versao + 1,
                        ]);

                    if ($afetadas === 0) {
                        throw new ConflitoVersaoException();
                    }

                    $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} expirada");
                });
                $total++;
            });

        return $total;
    }

    /** Aviso de término com a antecedência parametrizada, uma vez por ciclo (RF-12). */
    public function notificarVencimentos(): int
    {
        $limite = today()->addDays($this->parametros->vigente()->notificacao_antecedencia_dias)->toDateString();
        $total = 0;

        Concessao::with('concessionario')->where('estado', 'Ativa')->where('tipo', 'temporaria')
            ->whereDate('data_fim', '>=', today()->toDateString())
            ->whereDate('data_fim', '<=', $limite)
            ->each(function (Concessao $concessao) use (&$total): void {
                if ($concessao->notificado_para_termino?->equalTo($concessao->data_fim)) {
                    return;
                }

                $email = $concessao->concessionario?->email;
                if ($email) {
                    EnviarEmail::agendar($email, "Concessão {$concessao->numero} vence em " . $concessao->data_fim->format('d/m/Y'),
                        "Prezado(a) {$concessao->concessionario->nome},\n\nA concessão {$concessao->numero} termina em "
                        . $concessao->data_fim->format('d/m/Y') . ". Solicite a renovação pelo portal do concessionário ou na administração do cemitério.");
                }

                DB::transaction(function () use ($concessao): void {
                    $versao = $concessao->lock_version;
                    $afetadas = Concessao::query()
                        ->whereKey($concessao->getKey())
                        ->where('lock_version', $versao)
                        ->update([
                            'notificado_para_termino' => $concessao->data_fim,
                            'lock_version' => $versao + 1,
                        ]);

                    if ($afetadas === 0) {
                        throw new ConflitoVersaoException();
                    }
                });
                $total++;
            });

        return $total;
    }

    /**
     * Move concessão para o estado Vencendo (prestes a vencer)
     */
    public function vencer(Concessao $concessao): Concessao
    {
        if ($concessao->estado !== 'Ativa') {
            throw new RegraNegocioException('concessao.nao_vencer', 'Somente concessão Ativa pode ser movida para Vencendo.');
        }

        if (!$this->estaVencendo($concessao)) {
            throw new RegraNegocioException('concessao.nao_vencer', 'A concessão não está no período de vencimento ou é perpétua.');
        }

        return DB::transaction(function () use ($concessao): Concessao {
            $versao = $concessao->lock_version;
            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Vencendo',
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            return $concessao->refresh();
        });
    }

    /**
     * Notifica sobre o período de manifestação de interesse para concessão vencendo
     */
    public function notificarManifestacao(Concessao $concessao): void
    {
        if ($concessao->estado !== 'Vencendo') {
            throw new RegraNegocioException('concessao.nao_notificar_manifestacao', 'Somente concessão Vencendo pode ter manifestação de interesse notificada.');
        }

        // Implementar lógica de notificação para manifestação de interesse
        // Por enquanto, apenas marcamos que a notificação foi feita
        DB::transaction(function () use ($concessao): void {
            $versao = $concessao->lock_version;
            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'notificado_manifestacao' => today()->toDateString(),
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }
        });
    }

    /**
     * Torna concessão caduca (abandono ou não renovação)
     */
    public function tornarCaduca(Concessao $concessao, string $motivo): Concessao
    {
        if (!in_array($concessao->estado, ['Vencida', 'Vencendo'])) {
            throw new RegraNegocioException('concessao.nao_tornar_caduca', 'Apenas concessão Vencida ou Vencendo pode ser tornada Caduca.');
        }

        return DB::transaction(function () use ($concessao, $motivo): Concessao {
            $versao = $concessao->lock_version;
            $jazigo = $concessao->jazigo()->firstOrFail();

            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Caduca',
                    'motivo_pendencia' => $motivo,
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} tornada caduca: {$motivo}");

            return $concessao->refresh();
        });
    }

    /**
     * Reverte concessão (cancelamento judicial ou administrativo)
     */
    public function reverter(Concessao $concessao, string $motivo, ?string $processoAdministrativo = null): Concessao
    {
        if (!in_array($concessao->estado, ['Solicitada', 'Ativa', 'Vencendo', 'Vencida'])) {
            throw new RegraNegocioException('concessao.nao_reverter', 'Apenas concessão Solicitada, Ativa, Vencendo ou Vencida pode ser revertida.');
        }

        return DB::transaction(function () use ($concessao, $motivo): Concessao {
            $versao = $concessao->lock_version;
            $jazigo = $concessao->jazigo()->firstOrFail();

            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Revertida',
                    'motivo_extincao' => 'reversao',
                    'extinta_em' => today()->toDateString(),
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            $this->estados->recalcular($jazigo, "Concessão {$concessao->numero} revertida: {$motivo}");

            return $concessao->refresh();
        });
    }

    /**
     * Processa sucessão hereditária
     */
    public function suceder(Concessao $concessao, array $herdeirosData, ?string $processoAdministrativo = null): Concessao
    {
        if ($concessao->estado !== 'Vencida') {
            throw new RegraNegocioException('concessao.nao_suceder', 'Apenas concessão Vencida pode ter sucessão processada.');
        }

        // Validar que o titular original faleceu (isso viria dos dados do herdeiro ou de outro serviço)
        // Por enquanto, assumimos que se estamos aqui, o titular faleceu

        return DB::transaction(function () use ($concessao, $herdeirosData): Concessao {
            $versao = $concessao->lock_version;

            // Primeiro, marcamos a concessão como Sucedida
            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Sucedida',
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            // Depois, criamos os registros de herdeiros
            foreach ($herdeirosData as $indice => $herdeiroDados) {
                ConcessionHerdeiro::create([
                    'tenant_id' => $concessao->tenant_id,
                    'concession_id' => $concessao->id,
                    'nome' => $herdeiroDados['nome'],
                    'parentesco' => $herdeiroDados['parentesco'],
                    'documento' => $herdeiroDados['documento'],
                    'titular_indicado' => $herdeiroDados['titular_indicado'] ?? false,
                    'ordem' => $indice + 1,
                ]);
            }

            return $concessao->refresh();
        });
    }

    /**
     * Processa transferência inter vivos
     */
    public function transferir(Concessao $concessao, int $novoHolderId, ?string $processoAdministrativo = null): Concessao
    {
        if ($concessao->estado !== 'Ativa') {
            throw new RegraNegocioException('concessao.nao_transferir', 'Apenas concessão Ativa pode ser transferida inter vivos.');
        }

        // Verificar se o novo holder existe e é um concessionário válido
        $novoHolder = Concessionario::find($novoHolderId);
        if (!$novoHolder) {
            throw new RegraNegocioException('concessao.nao_transferir', 'Novo holder não encontrado.');
        }

        return DB::transaction(function () use ($concessao, $novoHolder): Concessao {
            $versao = $concessao->lock_version;

            $afetadas = Concessao::query()
                ->whereKey($concessao->getKey())
                ->where('lock_version', $versao)
                ->update([
                    'estado' => 'Transferida',
                    'holder_id' => $novoHolder->id,
                    'lock_version' => $versao + 1,
                ]);

            if ($afetadas === 0) {
                throw new ConflitoVersaoException();
            }

            return $concessao->refresh();
        });
    }

    /**
     * Publica evento de outbox para vencimento de taxa de manutenção.
     * Este método deve ser chamado quando a taxa de manutenção vence.
     */
    public function publicarEventoVencimentoTaxaManutencao(Concessao $concessao): void
    {
        // Verificar se a concessão está sujeita à taxa anual
        if (!$concessao->sujeita_taxa_anual) {
            return;
        }

        // Verificar se a concessão está ativa e não vencida
        if (!in_array($concessao->estado, ['Ativa', 'Vencendo'])) {
            return;
        }

        // Calcular a data de vencimento da taxa (anualmente a partir do data_inicio)
        $vencimentoTaxa = CarbonImmutable::parse($concessao->data_inicio)
            ->addYearsNoOverflow($this->parametros->vigente()->concessao_temporaria_anos);

        // Se já passou do vencimento, publicar evento
        if (today()->greaterThanOrEqualTo($vencimentoTaxa)) {
            $evento = new \App\Models\OutboxEvent([
                'event_type' => 'concessao.taxa_manutencao.vencida',
                'event_version' => '1.0',
                'tenant_id' => $concessao->tenant_id,
                'payload' => [
                    'concessao_id' => $concessao->id,
                    'numero' => $concessao->numero,
                    'valor_centavos' => $concessao->taxa_manutencao_centavos,
                    'vencimento' => $vencimentoTaxa->toDateString(),
                ],
                'status' => 'pending',
                'available_at' => now(),
            ]);

            $evento->save();
        }
    }

    /**
     * CRUD methods for concession documents
     */

    /**
     * Upload de documento para concessão
     */
    public function uploadDocumento(Concessao $concessao, string $tipo, string $arquivoPath, string $hash): ConcessionDocumento
    {
        return DB::transaction(function () use ($concessao, $tipo, $arquivoPath, $hash): ConcessionDocumento {
            $documento = ConcessionDocumento::create([
                'tenant_id' => $concessao->tenant_id,
                'concession_id' => $concessao->id,
                'tipo' => $tipo,
                'arquivo' => $arquivoPath,
                'hash' => $hash,
            ]);

            return $documento;
        });
    }

    /**
     * Obter documento por ID
     */
    public function getDocumento(int $documentoId): ?ConcessionDocumento
    {
        return ConcessionDocumento::find($documentoId);
    }

    /**
     * Atualizar documento
     */
    public function atualizarDocumento(ConcessionDocumento $documento, array $dados): ConcessionDocumento
    {
        return DB::transaction(function () use ($documento, $dados): ConcessionDocumento {
            $documento->update($dados);
            return $documento->refresh();
        });
    }

    /**
     * Excluir documento
     */
    public function excluirDocumento(ConcessionDocumento $documento): void
    {
        DB::transaction(function () use ($documento): void {
            $documento->delete();
        });
    }

    /**
     * Listar documentos de uma concessão
     */
    public function listarDocumentos(Concessao $concessao): Illuminate\Database\Eloquent\Collection
    {
        return $concessao->documentos()->get();
    }

    /**
     * Métodos para gestão de herdeiros
     */

    /**
     * Adicionar herdeiro à concessão
     */
    public function adicionarHerdeiro(Concessao $concessao, array $herdeiroDados): ConcessionHerdeiro
    {
        return DB::transaction(function () use ($concessao, $herdeiroDados): ConcessionHerdeiro {
            // Verificar se a concessão está em estado válido para sucessão
            if (!in_array($concessao->estado, ['Vencida', 'Sucedida'])) {
                throw new RegraNegocioException('concessao.nao_adicionar_herdeiro', 'Apenas concessão Vencida ou Sucedida pode ter herdeiros adicionados.');
            }

            $herdeiro = ConcessionHerdeiro::create([
                'tenant_id' => $concessao->tenant_id,
                'concession_id' => $concessao->id,
                'nome' => $herdeiroDados['nome'],
                'parentesco' => $herdeiroDados['parentesco'],
                'documento' => $herdeiroDados['documento'],
                'titular_indicado' => $herdeiroDados['titular_indicado'] ?? false,
                'ordem' => $herdeiroDados['ordem'] ?? ($concessao->herdeiros()->max('ordem') ?? 0) + 1,
            ]);

            return $herdeiro;
        });
    }

    /**
     * Atualizar herdeiro
     */
    public function atualizarHerdeiro(ConcessionHerdeiro $herdeiro, array $dados): ConcessionHerdeiro
    {
        return DB::transaction(function () use ($herdeiro, $dados): ConcessionHerdeiro {
            $herdeiro->update($dados);
            return $herdeiro->refresh();
        });
    }

    /**
     * Remover herdeiro
     */
    public function removerHerdeiro(ConcessionHerdeiro $herdeiro): void
    {
        DB::transaction(function () use ($herdeiro): void {
            $herdeiro->delete();
        });
    }

    /**
     * Definir herdeiro como titular indicado
     */
    public function definirTitularIndicado(ConcessionHerdeiro $herdeiro): void
    {
        DB::transaction(function () use ($herdeiro): void {
            // Primeiro, remover o titular indicado atual dos outros herdeiros da mesma concessão
            $herdeiro->concessao()->herdeiros()->where('id', '!=', $herdeiro->id)->update(['titular_indicado' => false]);

            // Depois, definir este herdeiro como titular indicado
            $herdeiro->update(['titular_indicado' => true]);
        });
    }

    /**
     * Listar herdeiros de uma concessão
     */
    public function listarHerdeiros(Concessao $concessao): Illuminate\Database\Eloquent\Collection
    {
        return $concessao->herdeiros()->orderBy('ordem')->get();
    }
}