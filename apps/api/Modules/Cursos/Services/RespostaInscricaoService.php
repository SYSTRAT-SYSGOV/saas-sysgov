<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use DomainException;
use Modules\Cursos\Enums\TipoCampoInscricao;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\RespostaInscricao;

/**
 * Respostas do formulário de inscrição (design D9). Só os campos ATIVOS do curso são pedidos —
 * um campo desativado não trava nem grava resposta nova, mas as respostas antigas continuam
 * intactas (têm sua própria linha, e `campo_id` é `restrictOnDelete`). `rotulo`/`tipo` são
 * copiados pra cada resposta (snapshot): editar o campo depois não reescreve o que já foi
 * respondido (cenário "Campo editado depois da resposta").
 */
final class RespostaInscricaoService
{
    public const int TEXTO_MAX = 2000;

    public const int TEXTO_LONGO_MAX = 20000;

    /**
     * Chamado de dentro da transação de `InscricaoService::inscrever`, antes de publicar o
     * evento (D9) — se um campo obrigatório falhar, a inscrição inteira é desfeita.
     *
     * @param list<array{campo_id: int, valor: mixed}> $respostasBrutas
     */
    public function gravar(Inscricao $inscricao, Curso $curso, array $respostasBrutas): void
    {
        $porCampoId = collect($respostasBrutas)->keyBy('campo_id');

        foreach ($curso->camposInscricao()->where('ativo', true)->get() as $campo) {
            $valor = $porCampoId->get($campo->id)['valor'] ?? null;

            if ($this->vazio($valor)) {
                if ($campo->obrigatorio) {
                    throw new DomainException("O campo \"{$campo->rotulo}\" é obrigatório.");
                }

                continue;
            }

            RespostaInscricao::create([
                'inscricao_id' => $inscricao->id,
                'campo_id' => $campo->id,
                'rotulo' => $campo->rotulo,
                'tipo' => $campo->tipo,
                'valor' => $this->validarEFormatar($campo, $valor),
            ]);
        }
    }

    private function vazio(mixed $valor): bool
    {
        return $valor === null || $valor === '';
    }

    private function validarEFormatar(CampoInscricao $campo, mixed $valor): string
    {
        return match ($campo->tipoEnum()) {
            TipoCampoInscricao::Numero => $this->validarNumero($campo, $valor),
            TipoCampoInscricao::Data => $this->validarData($campo, $valor),
            TipoCampoInscricao::Selecao => $this->validarSelecao($campo, $valor),
            TipoCampoInscricao::CaixaMarcacao => $this->validarCaixaMarcacao($campo, $valor),
            TipoCampoInscricao::Texto => $this->validarTexto($campo, $valor, self::TEXTO_MAX),
            TipoCampoInscricao::TextoLongo => $this->validarTexto($campo, $valor, self::TEXTO_LONGO_MAX),
        };
    }

    private function validarNumero(CampoInscricao $campo, mixed $valor): string
    {
        if (!is_numeric($valor)) {
            throw new DomainException("O campo \"{$campo->rotulo}\" precisa de um número.");
        }

        return (string) $valor;
    }

    private function validarData(CampoInscricao $campo, mixed $valor): string
    {
        // createFromFormat devolve false (não null) numa data inválida — ?-> não pega isso.
        $data = is_string($valor) ? \DateTime::createFromFormat('Y-m-d', $valor) : false;
        if ($data === false || $data->format('Y-m-d') !== $valor) {
            throw new DomainException("O campo \"{$campo->rotulo}\" precisa de uma data válida (AAAA-MM-DD).");
        }

        return $valor;
    }

    private function validarSelecao(CampoInscricao $campo, mixed $valor): string
    {
        if (!is_string($valor) || !in_array($valor, $campo->opcoes ?? [], true)) {
            throw new DomainException("O campo \"{$campo->rotulo}\" não aceita o valor informado.");
        }

        return $valor;
    }

    private function validarCaixaMarcacao(CampoInscricao $campo, mixed $valor): string
    {
        if (!in_array($valor, ['sim', 'nao'], true)) {
            throw new DomainException("O campo \"{$campo->rotulo}\" só aceita \"sim\" ou \"nao\".");
        }

        return $valor;
    }

    private function validarTexto(CampoInscricao $campo, mixed $valor, int $limite): string
    {
        if (!is_string($valor)) {
            throw new DomainException("O campo \"{$campo->rotulo}\" precisa de texto.");
        }

        // Texto puro (design D9): tira qualquer marcação, não sanitiza mantendo formatação como
        // o HtmlSanitizer faz pro texto de divulgação — aqui não sobra tag nenhuma.
        $texto = trim(strip_tags($valor));
        if (mb_strlen($texto) > $limite) {
            throw new DomainException("O campo \"{$campo->rotulo}\" passou do tamanho máximo de {$limite} caracteres.");
        }

        return $texto;
    }
}
