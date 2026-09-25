<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\OrigemPresenca;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Presenca;

/**
 * Check-in por QR code (design D6): token HMAC sem estado, válido por 60s,
 * renovado pela tela do instrutor enquanto o QR estiver exibido.
 *
 * Formato: base64url("{agendamento_id}.{expira_em_unix}").base64url(hmac)
 */
final class CheckInService
{
    public const VALIDADE_SEGUNDOS = 60;

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * O QR já vem desenhado (SVG em data URI) com a URL de check-in do portal,
     * para a tela do instrutor só exibir.
     *
     * @return array{token: string, url: string, qr_code: string, expira_em: string, validade_segundos: int}
     */
    public function emitirToken(AulaAgendamento $agendamento): array
    {
        if (!$agendamento->turma->statusEnum()->is(StatusTurma::Aberta)) {
            throw new DomainException('A turma não está aberta.');
        }
        if (!$agendamento->emAndamento()) {
            throw new DomainException('O QR de check-in só pode ser exibido durante a aula ('
                . $agendamento->inicio->format('d/m/Y H:i') . ' a ' . $agendamento->fim->format('H:i') . ').');
        }

        $expira = now()->addSeconds(self::VALIDADE_SEGUNDOS);
        $carga = $agendamento->id . '.' . $expira->getTimestamp();

        $token = $this->b64($carga) . '.' . $this->b64($this->assinatura($carga));
        $url = config('cursos.url_portal') . '/cursos/check-in?t=' . $token;

        return [
            'token' => $token,
            'url' => $url,
            'qr_code' => (new QRCode(new QROptions(['outputInterface' => QRMarkupSVG::class, 'outputBase64' => true])))->render($url),
            'expira_em' => $expira->toIso8601String(),
            'validade_segundos' => self::VALIDADE_SEGUNDOS,
        ];
    }

    /**
     * @return array{presenca: Presenca, ja_registrada: bool}
     */
    public function registrar(string $token, User $user): array
    {
        [$agendamentoId, $expira] = $this->validarToken($token);

        if (now()->getTimestamp() > $expira) {
            throw new DomainException('Este QR code expirou. Leia o código que está sendo exibido agora.');
        }

        // TenantAware: agendamento de outro órgão não é encontrado.
        $agendamento = AulaAgendamento::query()->with('turma')->find($agendamentoId);
        if ($agendamento === null) {
            throw new DomainException('QR code inválido.');
        }
        if (!$agendamento->turma->statusEnum()->is(StatusTurma::Aberta) || !$agendamento->emAndamento()) {
            throw new DomainException('O check-in desta aula não está disponível agora.');
        }

        $participante = Participante::query()->where('user_id', $user->id)->first();
        $inscricao = $participante === null ? null : Inscricao::query()
            ->where('turma_id', $agendamento->turma_id)
            ->where('participante_id', $participante->id)
            ->where('status', StatusInscricao::Confirmada->value)
            ->first();
        if ($inscricao === null) {
            throw new DomainException('Você não tem inscrição confirmada nesta turma.');
        }

        return DB::transaction(function () use ($agendamento, $inscricao, $user): array {
            $atual = Presenca::query()->where('agendamento_id', $agendamento->id)->where('inscricao_id', $inscricao->id)->lockForUpdate()->first();
            if ($atual !== null && $atual->presente) {
                return ['presenca' => $atual, 'ja_registrada' => true];
            }

            $antes = $atual?->only(['presente', 'origem']);
            $presenca = Presenca::updateOrCreate(
                ['agendamento_id' => $agendamento->id, 'inscricao_id' => $inscricao->id],
                ['presente' => true, 'origem' => OrigemPresenca::QrCode->value, 'registrado_por' => $user->id],
            );
            $this->audit->record('cursos', 'presenca.check_in', "Presenca #{$presenca->id}", $antes, $presenca->only(['agendamento_id', 'inscricao_id', 'presente', 'origem']));

            return ['presenca' => $presenca, 'ja_registrada' => false];
        });
    }

    /**
     * @return array{0: int, 1: int} [agendamento_id, expira_em]
     */
    private function validarToken(string $token): array
    {
        $partes = explode('.', $token);
        if (count($partes) !== 2) {
            throw new DomainException('QR code inválido.');
        }

        $carga = $this->deB64($partes[0]);
        $assinatura = $this->deB64($partes[1]);
        if ($carga === null || $assinatura === null || !hash_equals($this->assinatura($carga), $assinatura)) {
            throw new DomainException('QR code inválido.');
        }

        [$agendamentoId, $expira] = array_map('intval', explode('.', $carga) + [0, 0]);

        return [$agendamentoId, $expira];
    }

    private function assinatura(string $carga): string
    {
        // Chave derivada: um vazamento deste uso não compromete outros usos da APP_KEY.
        $chave = hash_hmac('sha256', 'cursos.check-in.v1', (string) config('app.key'), true);

        return hash_hmac('sha256', $carga, $chave, true);
    }

    private function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private function deB64(string $texto): ?string
    {
        $bytes = base64_decode(strtr($texto, '-_', '+/'), true);

        return $bytes === false ? null : $bytes;
    }
}
