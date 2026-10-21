<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Carbon\Carbon;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\AlunoContato;
use Modules\Escola\Models\Turma;
use Modules\Escola\Services\Concerns\RegistraMutacao;
use Modules\Pessoas\Support\Documento;
use Modules\Pessoas\Support\RegraNegocioException;
use Modules\Escola\Support\LeitorCsv;
use Modules\Escola\Support\NomeNormalizado;

final class AlunoService
{
    use RegistraMutacao;

    public const CONFIRMACAO_LIMPEZA = 'EXCLUIR';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly AlunoPessoaService $pessoas,
    ) {}

    /** Campos do aluno que são dados civis (vêm da pessoa quando o aluno tem CPF). */
    private const CAMPOS_CIVIS = ['nome', 'nascimento', 'mae', 'pai'];

    /**
     * @param array<string, mixed> $dados campos do aluno + contatos (list<array{telefone: string, descricao?: string|null}>)
     */
    public function criar(array $dados): Aluno
    {
        return DB::transaction(function () use ($dados): Aluno {
            $this->garantirCgmLivre($dados['cgm'] ?? null);
            $this->garantirCpfLivre($dados['cpf'] ?? null);
            $contatos = $dados['contatos'] ?? [];
            [$responsavelId, $confirmarNovo] = $this->extrairOpcoesDePessoa($dados);
            unset($dados['contatos']);
            $civis = $this->extrairCivis($dados);

            $aluno = new Aluno([
                ...$dados,
                'situacao' => $dados['situacao'] ?? SituacaoAluno::Ativo->value,
                'numero' => $dados['numero'] ?? (isset($dados['turma_id']) ? $this->proximoNumero((int) $dados['turma_id']) : null),
            ]);
            // A pessoa vem antes de gravar o aluno: `pessoa_id` é obrigatório e CPF e nascimento só existem nela.
            $pessoa = $this->pessoas->resolverParaNovo(
                [...$civis, 'nome' => $aluno->nome, 'mae' => $dados['mae'] ?? null, 'pai' => $dados['pai'] ?? null],
                $responsavelId,
                $confirmarNovo,
            );
            $aluno->forceFill(['pessoa_id' => $pessoa->id])->save();
            $this->salvarContatos($aluno, $contatos);
            $this->pessoas->concluirCadastro($aluno, $pessoa);
            $this->auditar('aluno', 'criado', $aluno->id, null, $this->retrato($aluno));

            return $aluno->load('contatos', 'turma.turno', 'pessoa');
        });
    }

    /**
     * Atualiza o aluno. Mudar a situação para "remanejado" exige turma de destino diferente da atual,
     * registra a turma de origem e atribui o próximo número de chamada livre do destino.
     *
     * @param array<string, mixed> $dados
     */
    public function atualizar(Aluno $aluno, array $dados): Aluno
    {
        return DB::transaction(function () use ($aluno, $dados): Aluno {
            if (array_key_exists('cgm', $dados)) {
                $this->garantirCgmLivre($dados['cgm'], $aluno->id);
            }
            if (array_key_exists('cpf', $dados)) {
                $this->garantirCpfLivre($dados['cpf'], $aluno->id);
            }
            $antes = $this->retrato($aluno);
            $contatos = $dados['contatos'] ?? null;
            [$responsavelId, $confirmarNovo] = $this->extrairOpcoesDePessoa($dados);
            unset($dados['contatos']);
            $camposCivis = array_values(array_intersect(self::CAMPOS_CIVIS, array_keys($dados)));
            $civis = $this->extrairCivis($dados);

            $remanejando = ($dados['situacao'] ?? null) === SituacaoAluno::Remanejado->value
                && $aluno->situacao !== SituacaoAluno::Remanejado->value;

            if ($remanejando) {
                $destino = isset($dados['turma_id']) ? (int) $dados['turma_id'] : null;
                if ($destino === null || $destino === $aluno->turma_id) {
                    throw ValidationException::withMessages(['turma_id' => 'Para remanejar, selecione uma turma de destino diferente da atual.']);
                }
                $dados['turma_origem_id'] = $aluno->turma_id;
                $dados['numero'] = $this->proximoNumero($destino);
            }

            $aluno->update($dados);
            if (is_array($contatos)) {
                $this->salvarContatos($aluno, $contatos);
            }
            if ($aluno->situacao === SituacaoAluno::Transferido->value) {
                // Saiu da escola: o vínculo `aluno` desta escola é encerrado; a pessoa continua.
                $this->pessoas->encerrarVinculo($aluno);
            } else {
                $this->pessoas->sincronizar($aluno, $civis, $camposCivis, $responsavelId, $confirmarNovo);
            }
            $this->auditar('aluno', $remanejando ? 'remanejado' : 'atualizado', $aluno->id, $antes, $this->retrato($aluno->refresh()));

            return $aluno->load('contatos', 'turma.turno', 'turmaOrigem', 'pessoa');
        });
    }

    public function excluir(Aluno $aluno): void
    {
        DB::transaction(function () use ($aluno): void {
            $antes = $this->retrato($aluno);
            $this->pessoas->encerrarVinculo($aluno);
            $aluno->delete();
            $this->auditar('aluno', 'excluido', $aluno->id, $antes, null);
        });
    }

    /**
     * @param list<int> $ids alunos do tenant (validados no Form Request)
     */
    public function excluirVarios(array $ids): int
    {
        return DB::transaction(function () use ($ids): int {
            $alunos = Aluno::query()->whereIn('id', $ids)->get();
            foreach ($alunos as $aluno) {
                $antes = $this->retrato($aluno);
                $this->pessoas->encerrarVinculo($aluno);
                $aluno->delete();
                $this->auditar('aluno', 'excluido', $aluno->id, $antes, null);
            }

            return $alunos->count();
        });
    }

    /** Exclui (logicamente) todos os alunos da turma; exige a confirmação textual "EXCLUIR". */
    public function limparTurma(Turma $turma, ?string $confirmacao): int
    {
        if ($confirmacao !== self::CONFIRMACAO_LIMPEZA) {
            throw new DomainException('Para excluir todos os alunos da turma, envie a confirmação "' . self::CONFIRMACAO_LIMPEZA . '".');
        }

        return $this->excluirVarios(Aluno::query()->where('turma_id', $turma->id)->pluck('id')->all());
    }

    public function definirFoto(Aluno $aluno, UploadedFile $arquivo): Aluno
    {
        return DB::transaction(function () use ($aluno, $arquivo): Aluno {
            $anterior = $aluno->foto_path;
            $caminho = $arquivo->storeAs(
                "escola/{$aluno->tenant_id}/alunos",
                Str::uuid()->toString() . '.' . $arquivo->extension(),
                UnidadeService::DISCO,
            );
            $aluno->update(['foto_path' => $caminho]);
            if ($anterior !== null) {
                Storage::disk(UnidadeService::DISCO)->delete($anterior);
            }
            $this->auditar('aluno', 'foto_definida', $aluno->id, ['foto_path' => $anterior], ['foto_path' => $caminho]);

            return $aluno;
        });
    }

    public function proximoNumero(int $turmaId): int
    {
        return (int) Aluno::query()->where('turma_id', $turmaId)->lockForUpdate()->max('numero') + 1;
    }

    /**
     * Importação por CSV (NOME e TURMA obrigatórios; CPF, CGM, NUMERO, MAE, PAI, NASCIMENTO, CONTATO opcionais).
     * Aluno com o mesmo CPF, ou o mesmo CGM, ou o mesmo nome na mesma turma, é atualizado em vez de
     * duplicado. Com CPF válido, o aluno é ligado à pessoa do município.
     *
     * Aluno sem CPF vira pessoa com documento pendente. Linha cujo nome e nascimento coincidem com pessoa
     * existente não é gravada e vem em `possiveis_duplicidades`; reenviar com `$confirmarDuplicidades` cria
     * mesmo assim. Menor sem responsável (o CSV não traz) não é gravado e vem em `sem_pessoa`.
     *
     * @return array{criados: int, atualizados: int, rejeitadas: list<array{linha: int, motivo: string}>, possiveis_duplicidades: list<array{linha: int, nome: string, sugestoes: list<array{id: int, nome: string}>}>, sem_pessoa: list<array{linha: int, nome: string, motivo: string}>}
     */
    public function importar(LeitorCsv $csv, bool $confirmarDuplicidades = false): array
    {
        foreach (['NOME', 'TURMA'] as $obrigatoria) {
            if (!$csv->temColuna($obrigatoria)) {
                throw new DomainException("Cabeçalho obrigatório ausente: {$obrigatoria}.");
            }
        }

        $turmas = Turma::query()->get()->groupBy(fn (Turma $t): string => NomeNormalizado::de($t->nome));
        $resultado = ['criados' => 0, 'atualizados' => 0, 'rejeitadas' => [], 'possiveis_duplicidades' => [], 'sem_pessoa' => []];

        DB::transaction(function () use ($csv, $turmas, $confirmarDuplicidades, &$resultado): void {
            foreach ($csv->linhas() as $numeroLinha => $linha) {
                $nome = $linha['NOME'] ?? '';
                if ($nome === '') {
                    $resultado['rejeitadas'][] = ['linha' => $numeroLinha, 'motivo' => 'Nome em branco.'];
                    continue;
                }
                $candidatas = $turmas->get(NomeNormalizado::de($linha['TURMA'] ?? ''));
                if ($candidatas === null) {
                    $resultado['rejeitadas'][] = ['linha' => $numeroLinha, 'motivo' => "Turma \"{$linha['TURMA']}\" não encontrada ({$nome})."];
                    continue;
                }
                // Com turmas homônimas em anos diferentes, vale a do ano letivo mais recente.
                $turma = $candidatas->sortByDesc('ano_letivo')->first();

                $nascimento = $this->data($linha['NASCIMENTO'] ?? '');
                if (($linha['NASCIMENTO'] ?? '') !== '' && $nascimento === null) {
                    $resultado['rejeitadas'][] = ['linha' => $numeroLinha, 'motivo' => "Data de nascimento inválida: {$linha['NASCIMENTO']}."];
                    continue;
                }

                $cpf = Documento::somenteDigitos($linha['CPF'] ?? '');
                if ($cpf !== '' && !Documento::valido($cpf)) {
                    $resultado['rejeitadas'][] = ['linha' => $numeroLinha, 'motivo' => "CPF inválido ({$nome})."];
                    continue;
                }
                $cpf = $cpf === '' ? null : $cpf;

                $cgm = ($linha['CGM'] ?? '') !== '' ? $linha['CGM'] : null;
                $numero = ctype_digit($linha['NUMERO'] ?? '') ? (int) $linha['NUMERO'] : null;
                $civis = array_filter(['cpf' => $cpf, 'nascimento' => $nascimento], fn ($v): bool => $v !== null);
                $dados = array_filter([
                    'nome' => $nome,
                    'cgm' => $cgm,
                    'turma_id' => $turma->id,
                    'numero' => $numero,
                    'mae' => ($linha['MAE'] ?? '') ?: null,
                    'pai' => ($linha['PAI'] ?? '') ?: null,
                ], fn ($v): bool => $v !== null);

                $existente = ($cpf !== null ? $this->alunoPorCpf($cpf) : null) ?? Aluno::query()
                    ->where(function ($q) use ($cgm, $nome, $turma): void {
                        if ($cgm !== null) {
                            $q->where('cgm', $cgm);
                        }
                        $q->orWhere(fn ($q2) => $q2->where('nome', mb_strtoupper($nome, 'UTF-8'))->where('turma_id', $turma->id));
                    })
                    ->first();

                $gravar = function () use ($existente, $dados, $civis, $numero, $turma, $linha, $confirmarDuplicidades): array {
                    if ($existente !== null) {
                        $antes = $this->retrato($existente);
                        $existente->update($dados);
                        $aluno = $existente;
                        $this->pessoas->sincronizar($aluno, $civis, array_values(array_intersect(self::CAMPOS_CIVIS, array_keys([...$dados, ...$civis]))), null, $confirmarDuplicidades);
                    } else {
                        $aluno = new Aluno([
                            ...$dados,
                            'situacao' => SituacaoAluno::Ativo->value,
                            'numero' => $numero ?? $this->proximoNumero($turma->id),
                        ]);
                        $pessoa = $this->pessoas->resolverParaNovo(
                            [...$civis, 'nome' => $aluno->nome, 'mae' => $dados['mae'] ?? null, 'pai' => $dados['pai'] ?? null],
                            null,
                            $confirmarDuplicidades,
                        );
                        $aluno->forceFill(['pessoa_id' => $pessoa->id])->save();
                        $this->pessoas->concluirCadastro($aluno, $pessoa);
                        $antes = null;
                    }

                    $contato = $linha['CONTATO'] ?? '';
                    if ($contato !== '' && !$aluno->contatos()->where('telefone', $contato)->exists()) {
                        AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => $contato, 'descricao' => 'Importado', 'ordem' => $aluno->contatos()->count()]);
                    }

                    $this->auditar('aluno', $antes === null ? 'importado' : 'atualizado', $aluno->id, $antes, $this->retrato($aluno));

                    return [$existente === null];
                };

                // Cada linha roda em um ponto de salvamento: se o MDM recusar a pessoa, só ela é desfeita.
                try {
                    [$criado] = DB::transaction(fn (): array => $gravar());
                } catch (RegraNegocioException $e) {
                    if ($e->codigo === 'pessoa_semelhante_existente') {
                        // Possível duplicidade: nada é gravado até o usuário confirmar (reenvio com a confirmação).
                        $resultado['possiveis_duplicidades'][] = [
                            'linha' => $numeroLinha,
                            'nome' => $nome,
                            'sugestoes' => array_map(fn (array $s): array => ['id' => $s['id'], 'nome' => $s['nome']], (array) ($e->contexto['sugestoes'] ?? [])),
                        ];
                        continue;
                    }
                    if (!in_array($e->codigo, ['responsavel_obrigatorio', 'dados_insuficientes'], true)) {
                        throw $e;
                    }
                    // O CSV não traz responsável: sem pessoa não há aluno (`pessoa_id` é obrigatório), então a linha não é gravada.
                    $resultado['sem_pessoa'][] = ['linha' => $numeroLinha, 'nome' => $nome, 'motivo' => $e->codigo];
                    continue;
                }
                $criado ? $resultado['criados']++ : $resultado['atualizados']++;
            }
        });

        return $resultado;
    }

    /**
     * Define o contato principal (menor ordem) do aluno, preservando os demais. Vazio/null remove o principal.
     * Porta estreita usada pela Formatura (D14): só o telefone, sem acesso ao resto do cadastro.
     */
    public function definirTelefonePrincipal(Aluno $aluno, ?string $telefone): void
    {
        DB::transaction(function () use ($aluno, $telefone): void {
            $antes = $this->retrato($aluno);
            $telefone = $telefone !== null ? trim($telefone) : '';
            $principal = $aluno->contatos()->first();
            if ($telefone === ($principal !== null ? $principal->telefone : '')) {
                return; // sem mudança: nada a gravar nem auditar
            }
            if ($telefone === '') {
                $principal?->delete();
            } elseif ($principal !== null) {
                $principal->update(['telefone' => $telefone]);
            } else {
                AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => $telefone, 'descricao' => 'Principal', 'ordem' => 0]);
            }
            $this->auditar('aluno', 'telefone_atualizado', $aluno->id, $antes, $this->retrato($aluno));
        });
    }

    /**
     * Retira de `$dados` o que serve só à resolução da pessoa (não são colunas do aluno).
     *
     * @param array<string, mixed> $dados
     * @return array{0: int|null, 1: bool} responsável e confirmação de novo cadastro
     */
    private function extrairOpcoesDePessoa(array &$dados): array
    {
        $responsavelId = isset($dados['responsavel_id']) ? (int) $dados['responsavel_id'] : null;
        $confirmarNovo = (bool) ($dados['confirmar_novo'] ?? false);
        unset($dados['responsavel_id'], $dados['confirmar_novo']);

        return [$responsavelId, $confirmarNovo];
    }

    /**
     * Retira de `$dados` o CPF e o nascimento, que vivem só na pessoa. Devolve só o que veio, para a edição
     * distinguir "não enviado" de "enviado vazio".
     *
     * @param array<string, mixed> $dados
     * @return array{cpf?: string|null, nascimento?: string|null}
     */
    private function extrairCivis(array &$dados): array
    {
        $civis = [];
        foreach (['cpf', 'nascimento'] as $campo) {
            if (array_key_exists($campo, $dados)) {
                $civis[$campo] = $dados[$campo];
                unset($dados[$campo]);
            }
        }

        return $civis;
    }

    /**
     * @param list<array{telefone: string, descricao?: string|null}> $contatos
     */
    private function salvarContatos(Aluno $aluno, array $contatos): void
    {
        $aluno->contatos()->delete();
        foreach ($contatos as $ordem => $contato) {
            AlunoContato::create([
                'aluno_id' => $aluno->id,
                'telefone' => trim($contato['telefone']),
                'descricao' => $contato['descricao'] ?? null,
                'ordem' => $ordem,
            ]);
        }
    }

    /**
     * Alunos (da escola do contexto) com esse CPF, pelo documento da pessoa do cadastro central.
     *
     * @return \Illuminate\Database\Eloquent\Builder<Aluno>
     */
    private function consultaPorCpf(string $digitos): \Illuminate\Database\Eloquent\Builder
    {
        $hash = Documento::hash($digitos);

        return Aluno::query()->whereHas('pessoa', fn ($p) => $p->where('documento_hash', $hash));
    }

    private function alunoPorCpf(string $digitos): ?Aluno
    {
        return $this->consultaPorCpf($digitos)->first();
    }

    private function garantirCpfLivre(?string $cpf, ?int $ignorarId = null): void
    {
        $digitos = Documento::somenteDigitos((string) $cpf);
        if ($digitos === '') {
            return;
        }
        $emUso = $this->consultaPorCpf($digitos)
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
        if ($emUso) {
            throw ValidationException::withMessages(['cpf' => 'Já existe um aluno com este CPF nesta escola.']);
        }
    }

    private function garantirCgmLivre(?string $cgm, ?int $ignorarId = null): void
    {
        if ($cgm === null || trim($cgm) === '') {
            return;
        }
        $emUso = Aluno::query()
            ->where('cgm', trim($cgm))
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
        if ($emUso) {
            throw ValidationException::withMessages(['cgm' => 'Já existe um aluno com este CGM.']);
        }
    }

    /** "dd/mm/aaaa" ou "aaaa-mm-dd" → "aaaa-mm-dd"; vazio → null; inválido → null. */
    private function data(string $valor): ?string
    {
        if ($valor === '') {
            return null;
        }
        foreach (['d/m/Y', 'Y-m-d'] as $formato) {
            $data = \DateTime::createFromFormat('!' . $formato, $valor);
            if ($data !== false && $data->format($formato) === $valor) {
                return Carbon::instance($data)->toDateString();
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function retrato(Aluno $aluno): array
    {
        return [...$aluno->attributesToArray(), 'contatos' => $aluno->contatos()->get(['telefone', 'descricao'])->toArray()];
    }
}
