<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Models\User;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Ata\Enums\StatusAta;
use Modules\Ata\Exceptions\AtaBloqueadaException;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaNumeracao;
use Modules\Ata\Models\AtaTipo;
use Modules\Ata\Support\SanitizaHtml;
use Modules\Pessoas\Models\Pessoa;

/**
 * Ciclo de vida da ata (D5 — padrão de ata). Só em_redacao aceita mudança de texto, dados e participantes;
 * salvar o rascunho trava tudo isso de vez (sem volta) e a ata segue só para assinaturas e finalização.
 * A trava vale aqui, no servidor: a UI só reflete.
 */
final class AtaService
{
    public function __construct(
        private readonly SecretariaAtaService $secretarias,
        private readonly ArquivoAtaService $arquivos,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{org_unit_id: int, tipo_id?: int|null, titulo: string, data_reuniao: string, local?: string|null, cidade?: string|null, redator: string, sigilosa?: bool, conteudo_html?: string|null, participantes?: list<array{pessoa_id?: int|null, nome?: string|null, cargo?: string|null}>} $dados
     */
    public function criar(array $dados, User $autor): Ata
    {
        if ($this->secretarias->secretariaValida((int) $dados['org_unit_id']) === null) {
            throw new DomainException('Selecione uma secretaria ativa do Organograma.');
        }
        $this->validarTipo($dados['tipo_id'] ?? null);

        return DB::transaction(function () use ($dados, $autor): Ata {
            $ano = (int) now()->format('Y');
            $ata = Ata::query()->create([
                ...$this->camposEditaveis($dados),
                'org_unit_id' => (int) $dados['org_unit_id'],
                'numero' => $this->proximoNumero((int) $dados['org_unit_id'], $ano),
                'ano' => $ano,
                'conteudo_html' => SanitizaHtml::limpar($dados['conteudo_html'] ?? ''),
                'status' => StatusAta::EmRedacao,
                'codigo_validacao' => $this->novoCodigo($ano),
                'criado_por' => $autor->id,
            ]);
            $this->sincronizarParticipantes($ata, $dados['participantes'] ?? []);
            $this->audit->record('ata', 'ata.criada', "ata:{$ata->id}", null, $this->resumo($ata));

            return $ata;
        });
    }

    /**
     * Dados e participantes: só em_redacao.
     *
     * @param array<string, mixed> $dados
     */
    public function atualizar(Ata $ata, array $dados): Ata
    {
        $this->exigirEditavel($ata);
        $this->validarTipo($dados['tipo_id'] ?? null);

        return DB::transaction(function () use ($ata, $dados): Ata {
            $antes = $this->resumo($ata);
            $ata->fill($this->camposEditaveis($dados));
            if (array_key_exists('conteudo_html', $dados)) {
                $ata->conteudo_html = SanitizaHtml::limpar($dados['conteudo_html']);
            }
            $ata->save();
            if (array_key_exists('participantes', $dados)) {
                $this->sincronizarParticipantes($ata, $dados['participantes'] ?? []);
            }
            $this->audit->record('ata', 'ata.editada', "ata:{$ata->id}", $antes, $this->resumo($ata));

            return $ata->refresh();
        });
    }

    /** Autosave do texto durante a redação. */
    public function salvarConteudo(Ata $ata, ?string $html): Ata
    {
        $this->exigirEditavel($ata);
        $ata->conteudo_html = SanitizaHtml::limpar($html);
        $ata->save();
        $this->audit->record('ata', 'ata.texto_salvo', "ata:{$ata->id}", null, ['tamanho' => strlen((string) $ata->conteudo_html)]);

        return $ata;
    }

    /** Salvar rascunho: grava o texto final e TRAVA a ata (só assinar e finalizar depois). */
    public function salvarRascunho(Ata $ata, ?string $html): Ata
    {
        $this->exigirEditavel($ata);
        $limpo = SanitizaHtml::limpar($html ?? $ata->conteudo_html);
        if (trim(strip_tags($limpo)) === '') {
            throw new DomainException('Escreva o texto da ata antes de salvar o rascunho.');
        }
        if ($ata->participantes()->count() === 0) {
            throw new DomainException('Informe ao menos um participante antes de salvar o rascunho.');
        }

        return DB::transaction(function () use ($ata, $limpo): Ata {
            $ata->conteudo_html = $limpo;
            $ata->status = StatusAta::Rascunho;
            $ata->rascunho_em = now();
            $ata->save();
            $this->audit->record('ata', 'ata.rascunho_salvo', "ata:{$ata->id}", ['status' => StatusAta::EmRedacao->value], ['status' => StatusAta::Rascunho->value]);

            return $ata;
        });
    }

    public function excluir(Ata $ata): void
    {
        if ($ata->status === StatusAta::Finalizada) {
            throw new AtaBloqueadaException('Ata finalizada não pode ser excluída.');
        }
        DB::transaction(function () use ($ata): void {
            $caminhos = $ata->participantes()->pluck('assinatura_path')->filter()->all();
            $resumo = $this->resumo($ata);
            $ata->delete();
            $this->audit->record('ata', 'ata.excluida', "ata:{$ata->id}", $resumo, null);
            DB::afterCommit(function () use ($caminhos): void {
                foreach ($caminhos as $c) {
                    $this->arquivos->apagar($c);
                }
            });
        });
    }

    public function exigirEditavel(Ata $ata): void
    {
        if (!$ata->status->editavel()) {
            throw new AtaBloqueadaException($ata->status === StatusAta::Finalizada
                ? 'A ata está finalizada e não pode mais ser alterada.'
                : 'O rascunho foi salvo: o texto está travado. Agora só é possível assinar e finalizar.');
        }
    }

    /** Número sequencial por secretaria e ano, nunca reaproveitado (contador com lock pessimista). */
    private function proximoNumero(int $orgUnitId, int $ano): int
    {
        AtaNumeracao::query()->firstOrCreate(['org_unit_id' => $orgUnitId, 'ano' => $ano], ['ultimo' => 0]);
        $contador = AtaNumeracao::query()->where('org_unit_id', $orgUnitId)->where('ano', $ano)->lockForUpdate()->firstOrFail();
        $contador->ultimo++;
        $contador->save();

        return $contador->ultimo;
    }

    private function novoCodigo(int $ano): string
    {
        do {
            $codigo = sprintf('ATA-%d-%s', $ano, strtoupper(bin2hex(random_bytes(8))));
        } while (Ata::query()->withoutGlobalScopes()->where('codigo_validacao', $codigo)->exists());

        return $codigo;
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function camposEditaveis(array $dados): array
    {
        $campos = [];
        foreach (['tipo_id', 'titulo', 'data_reuniao', 'local', 'cidade', 'redator'] as $c) {
            if (array_key_exists($c, $dados)) {
                $campos[$c] = is_string($dados[$c]) ? trim($dados[$c]) : $dados[$c];
            }
        }
        if (array_key_exists('sigilosa', $dados)) {
            $campos['sigilosa'] = (bool) $dados['sigilosa'];
        }

        return $campos;
    }

    private function validarTipo(mixed $tipoId): void
    {
        if ($tipoId !== null && !AtaTipo::query()->whereKey((int) $tipoId)->where('ativo', true)->exists()) {
            throw new DomainException('Tipo de ata inválido.');
        }
    }

    /** @param array<int, array<string, mixed>> $lista */
    private function sincronizarParticipantes(Ata $ata, array $lista): void
    {
        $ata->participantes()->delete();
        $vistos = [];
        foreach (array_values($lista) as $i => $p) {
            $pessoaId = isset($p['pessoa_id']) ? (int) $p['pessoa_id'] : null;
            $nome = trim((string) ($p['nome'] ?? ''));
            if ($pessoaId !== null) {
                $pessoa = Pessoa::query()->find($pessoaId);
                if (!$pessoa instanceof Pessoa) {
                    throw new DomainException('Participante não encontrado no Cadastro de Pessoas.');
                }
                $nome = (string) ($pessoa->nome_social ?: $pessoa->nome);
            }
            if ($nome === '') {
                continue;
            }
            $chave = $pessoaId !== null ? "p{$pessoaId}" : 'n' . Str::lower(Str::ascii($nome));
            if (isset($vistos[$chave])) {
                throw new DomainException("O participante {$nome} foi informado mais de uma vez.");
            }
            $vistos[$chave] = true;
            $ata->participantes()->create([
                'pessoa_id' => $pessoaId,
                'nome' => Str::limit($nome, 150, ''),
                'cargo' => isset($p['cargo']) && trim((string) $p['cargo']) !== '' ? trim((string) $p['cargo']) : null,
                'ordem' => $i,
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function resumo(Ata $ata): array
    {
        return [
            'org_unit_id' => $ata->org_unit_id, 'numero' => $ata->numero, 'ano' => $ata->ano, 'titulo' => $ata->titulo,
            'tipo_id' => $ata->tipo_id, 'sigilosa' => $ata->sigilosa, 'status' => $ata->status->value,
        ];
    }
}
