<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>{{ $dados['titulo'] }} — {{ $dados['participante'] }}</title>
<style>
    /* A4 paisagem = 297 × 210 mm. Tudo posicionado em mm: o dompdf soma padding e
       borda à largura (content-box), então nada aqui usa largura "100%" + padding. */
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, sans-serif; color: #1b2a41; }
    .moldura { position: absolute; left: 8mm; top: 8mm; width: 278.6mm; height: 191.6mm; border: 1.2mm solid #1351b4; }
    .moldura-interna { position: absolute; left: 10.5mm; top: 10.5mm; width: 275.4mm; height: 188.4mm; border: 0.3mm solid #1351b4; }
    .conteudo { position: absolute; left: 25mm; top: 20mm; width: 247mm; text-align: center; }
    .cabecalho { height: 24mm; }
    .cabecalho img { max-height: 22mm; max-width: 80mm; }
    .orgao { font-size: 11pt; text-transform: uppercase; letter-spacing: 1.5pt; color: #4a5b73; margin-top: 2mm; }
    h1 { font-size: 30pt; color: #0c326f; margin: 5mm 0 7mm; letter-spacing: 2pt; }
    .corpo { font-size: 14pt; line-height: 1.55; margin: 0 8mm; }
    .corpo p { margin: 0 0 4mm; }
    .assinaturas { position: absolute; left: 25mm; top: 142mm; width: 247mm; border-collapse: collapse; table-layout: fixed; }
    .assinaturas td { text-align: center; vertical-align: bottom; padding: 0 6mm; }
    .assinaturas img { max-height: 15mm; max-width: 60mm; }
    .linha { border-top: 0.3mm solid #1b2a41; margin-top: 1mm; padding-top: 1.5mm; font-size: 10.5pt; }
    .cargo { font-size: 9pt; color: #4a5b73; }
    .rodape { position: absolute; left: 25mm; top: 172mm; width: 247mm; border-collapse: collapse; }
    .rodape td { vertical-align: bottom; }
    .validacao { font-size: 8.5pt; color: #4a5b73; line-height: 1.5; }
    .codigo { font-family: DejaVu Sans Mono, monospace; font-size: 11pt; color: #1b2a41; letter-spacing: 1pt; }
    .qr { text-align: right; width: 24mm; }
    .qr img { width: 22mm; height: 22mm; }
</style>
</head>
<body>
    <div class="moldura"></div>
    <div class="moldura-interna"></div>

    <div class="conteudo">
        <div class="cabecalho">
            @if ($logotipo)
                <img src="{{ $logotipo }}" alt="">
            @endif
        </div>
        <div class="orgao">{{ $dados['orgao'] }}</div>

        <h1>{{ $dados['titulo'] }}</h1>

        <div class="corpo">
            @foreach (preg_split('/\R{2,}/', $dados['corpo']) as $paragrafo)
                <p>{!! nl2br(e($paragrafo)) !!}</p>
            @endforeach
        </div>
    </div>

    @if (count($assinaturas) > 0)
        <table class="assinaturas"><tr>
            @foreach ($assinaturas as $assinatura)
                <td style="width: {{ round(100 / count($assinaturas), 2) }}%;">
                    @if ($assinatura['imagem'])
                        <img src="{{ $assinatura['imagem'] }}" alt="">
                    @endif
                    <div class="linha">{{ $assinatura['nome'] }}</div>
                    <div class="cargo">{{ $assinatura['cargo'] }}</div>
                </td>
            @endforeach
        </tr></table>
    @endif

    <table class="rodape"><tr>
        <td class="validacao">
            Código de autenticidade: <span class="codigo">{{ $codigo }}</span><br>
            Emitido em {{ $dados['data_emissao'] }}. Confira a autenticidade em {{ $urlValidacao }}
        </td>
        <td class="qr"><img src="{{ $qrCode }}" alt="QR code de validação"></td>
    </tr></table>
</body>
</html>
