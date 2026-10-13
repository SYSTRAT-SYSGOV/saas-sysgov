<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Models\LinkCaptacao;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;

/**
 * Único serviço das rotas públicas de captação (D2). Acha o link pelo código sem escopo, recusa link inativo
 * ou campanha encerrada, define TenantContext e CampanhaContext a partir do link e só devolve o que o
 * formulário precisa ou o resultado do próprio envio — nunca dados de outros eleitores.
 */
final class CadastroPublicoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
        private readonly CampanhaContext $campanha,
    ) {}

    /**
     * Dados do formulário, ou null se o código não existe.
     *
     * @return array<string, mixed>|null
     */
    public function formulario(string $codigo): ?array
    {
        $link = $this->link($codigo);
        if ($link === null) {
            return null;
        }

        return $this->noContexto($link, function (Campanha $campanha) use ($link): array {
            $candidato = $campanha->candidato;
            $base = [
                'campanha' => ['nome' => $campanha->nome, 'cargo' => $campanha->cargo, 'ano' => $campanha->ano, 'uf' => $campanha->uf],
                'candidato' => $candidato !== null ? ['nome_urna' => $candidato->nome_urna, 'numero' => $candidato->getAttribute('numero'), 'partido' => $candidato->getAttribute('partido')] : null,
                'responsavel' => $link->nomeResponsavel(),
            ];
            $motivo = $this->motivoRecusa($link, $campanha);
            if ($motivo !== null) {
                return [...$base, 'ativo' => false, 'mensagem' => $motivo];
            }

            return [
                ...$base,
                'ativo' => true,
                'termo' => $campanha->termoLgpd(),
                'termo_versao' => $campanha->lgpd_termo_versao,
                'encarregado' => ['nome' => $campanha->lgpd_encarregado_nome, 'contato' => $campanha->lgpd_encarregado_contato],
                'municipios' => RefMunicipio::query()->where('uf', $campanha->uf)->orderBy('nome')->get(['codigo_ibge', 'nome']),
                'iniciado_em' => $this->assinarInicio(),
            ];
        });
    }

    /**
     * Grava o cadastro (ou atualiza o do mesmo WhatsApp na campanha). Campo-armadilha preenchido: responde
     * como sucesso sem gravar.
     *
     * @param array<string, mixed> $dados já validados pelo controller
     * @return array{ok: bool, atualizado: bool}
     */
    public function cadastrar(string $codigo, array $dados, ?string $ip, ?string $navegador): array
    {
        if (trim((string) ($dados['site'] ?? '')) !== '') {
            return ['ok' => true, 'atualizado' => false];
        }
        $link = $this->link($codigo) ?? throw new DomainException('Link de cadastro não encontrado.');
        $this->conferirInicio((string) ($dados['iniciado_em'] ?? ''));

        return $this->noContexto($link, function (Campanha $campanha) use ($link, $dados, $ip, $navegador): array {
            $motivo = $this->motivoRecusa($link, $campanha);
            if ($motivo !== null) {
                throw new DomainException($motivo);
            }
            if (!RefMunicipio::query()->where('uf', $campanha->uf)->where('codigo_ibge', (int) $dados['codigo_ibge'])->exists()) {
                throw new DomainException('Escolha um município do estado da campanha.');
            }

            $hash = Eleitor::hashWhatsapp($dados['whatsapp'] ?? null);
            $campos = [
                'nome' => trim((string) $dados['nome']),
                'codigo_ibge' => (int) $dados['codigo_ibge'],
                'bairro' => $dados['bairro'] ?? null,
                'zona' => $dados['zona'] ?? null,
                'secao' => $dados['secao'] ?? null,
                'whatsapp' => Eleitor::normalizarWhatsapp($dados['whatsapp'] ?? null),
                'whatsapp_hash' => $hash,
                'data_nascimento' => $dados['data_nascimento'] ?? null,
                'demanda' => isset($dados['demanda']) && trim((string) $dados['demanda']) !== '' ? trim((string) $dados['demanda']) : null,
                'latitude' => $dados['latitude'] ?? null,
                'longitude' => $dados['longitude'] ?? null,
                'precisao_m' => isset($dados['precisao_m']) ? (int) round((float) $dados['precisao_m']) : null,
                'consentimento_versao' => $campanha->lgpd_termo_versao,
                'consentido_em' => now(),
                'ip' => $ip,
                'user_agent' => $navegador !== null ? mb_substr($navegador, 0, 500) : null,
            ];

            return DB::transaction(function () use ($link, $campos, $hash): array {
                $existente = $hash !== null ? Eleitor::query()->where('whatsapp_hash', $hash)->lockForUpdate()->first() : null;
                if ($existente !== null) {
                    // O responsável que captou primeiro continua sendo o do cadastro.
                    $existente->update($campos);
                    $this->auditar('eleitor', 'atualizado_pelo_titular', $existente->id, null, ['codigo_ibge' => $existente->codigo_ibge, 'link_id' => $link->id]);

                    return ['ok' => true, 'atualizado' => true];
                }
                $eleitor = Eleitor::create([...$campos, 'link_id' => $link->id, 'coordenador_id' => $link->coordenador_id, 'cabo_id' => $link->cabo_id]);
                $this->auditar('eleitor', 'cadastrado', $eleitor->id, null, ['codigo_ibge' => $eleitor->codigo_ibge, 'link_id' => $link->id]);

                return ['ok' => true, 'atualizado' => false];
            });
        });
    }

    private function link(string $codigo): ?LinkCaptacao
    {
        return LinkCaptacao::query()->withoutGlobalScopes()->where('codigo', $codigo)->first();
    }

    private function motivoRecusa(LinkCaptacao $link, Campanha $campanha): ?string
    {
        return match (true) {
            $campanha->encerrada() => 'Esta campanha está encerrada e não recebe mais cadastros.',
            !$link->ativo => 'Este link de cadastro não está mais ativo.',
            default => null,
        };
    }

    /**
     * @template T
     *
     * @param callable(Campanha): T $acao
     * @return T
     */
    private function noContexto(LinkCaptacao $link, callable $acao): mixed
    {
        $this->tenant->set(Tenant::query()->findOrFail($link->tenant_id));
        try {
            $campanha = Campanha::query()->findOrFail($link->campanha_id);
            $this->campanha->set($campanha);

            return $acao($campanha);
        } finally {
            $this->campanha->clear();
            $this->tenant->clear();
        }
    }

    /** Momento em que o formulário foi aberto, assinado (tempo mínimo de preenchimento — D2). */
    private function assinarInicio(): string
    {
        $agora = (string) now()->getTimestamp();

        return $agora . '.' . hash_hmac('sha256', 'campanha-cadastro:' . $agora, (string) config('app.key'));
    }

    private function conferirInicio(string $assinado): void
    {
        [$momento, $assinatura] = array_pad(explode('.', $assinado, 2), 2, '');
        $valido = ctype_digit($momento) && hash_equals(hash_hmac('sha256', 'campanha-cadastro:' . $momento, (string) config('app.key')), $assinatura);
        $decorrido = now()->getTimestamp() - (int) $momento;
        if (!$valido || $decorrido > (int) config('campanha.cadastro_validade_horas') * 3600) {
            throw new DomainException('O formulário expirou. Abra o link de novo.');
        }
        if ($decorrido < (int) config('campanha.cadastro_tempo_minimo_segundos')) {
            throw new DomainException('Envio rápido demais. Confira os dados e envie de novo.');
        }
    }
}
