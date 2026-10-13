{{-- PDF da ata (dompdf, A4). Timbrado da secretaria como fundo; marca de rascunho no preview (D4, D5). --}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Ata nº {{ $numero }} — {{ $ata->titulo }}</title>
    <style>
        @page { margin: 32mm 22mm 28mm 22mm; }
        body { font-family: 'DejaVu Serif', serif; font-size: 11.5pt; color: #000; line-height: 1.5; }
        .timbrado { position: fixed; top: -32mm; left: -22mm; width: 210mm; height: 297mm; z-index: -2; }
        .marca { position: fixed; top: 95mm; left: -10mm; width: 190mm; text-align: center; font-size: 46pt; color: #e5e7eb; transform: rotate(-35deg); z-index: -1; font-family: 'DejaVu Sans', sans-serif; font-weight: bold; }
        .cabecalho { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 18px; }
        .cabecalho h1 { font-size: 15pt; text-transform: uppercase; margin: 0 0 4px; }
        .cabecalho .sec { font-size: 12pt; margin: 2px 0; }
        .cabecalho .num { font-size: 12pt; font-weight: bold; margin: 2px 0; }
        .conteudo { text-align: justify; }
        .conteudo p { margin: 0 0 8px; text-indent: 30px; }
        .encerramento { margin-top: 24px; text-align: justify; text-indent: 30px; }
        .local { margin-top: 26px; }
        .data { margin-top: 18px; text-align: right; }
        .assinatura { margin-top: 26px; text-align: center; page-break-inside: avoid; }
        .assinatura img { height: 52px; }
        .assinatura .linha { border-top: 1px solid #000; width: 70%; margin: 0 auto; padding-top: 3px; }
        .assinatura .cargo { font-size: 9.5pt; color: #374151; }
        .assinatura .vazio { height: 52px; }
        .rodape { position: fixed; bottom: -20mm; left: 0; right: 0; height: 14mm; font-family: 'DejaVu Sans', sans-serif; font-size: 7.5pt; color: #6b7280; }
        .rodape table { width: 100%; border-collapse: collapse; }
        .rodape td { vertical-align: middle; padding: 0; }
        .rodape img { width: 13mm; height: 13mm; }
    </style>
</head>
<body>
    @if($timbrado)
        <img class="timbrado" src="{{ $timbrado }}" alt="">
    @endif
    @if($rascunho)
        <div class="marca">RASCUNHO</div>
    @endif
    <div class="rodape">
        <table>
            <tr>
                <td style="width: 15mm;"><img src="{{ $qr }}" alt="QR Code de validação"></td>
                <td>
                    {{ $rascunho ? 'RASCUNHO — NÃO FINALIZADO. Sem validade até a finalização.' : 'Documento gerado digitalmente por ' . $orgao . '.' }}<br>
                    Validação: <strong>{{ $codigo }}</strong> — {{ $url_validacao }}
                </td>
                <td style="width: 30mm;"></td>
            </tr>
        </table>
    </div>

    <div class="cabecalho">
        <h1>{{ $ata->titulo }}</h1>
        <div class="sec">{{ $secretaria }}{{ $sigla ? ' — ' . $sigla : '' }}</div>
        <div class="num">Ata nº {{ $numero }}{{ $ata->tipo ? ' · ' . $ata->tipo->nome : '' }}</div>
    </div>

    <div class="conteudo">{!! $conteudo !!}</div>

    <div class="encerramento">
        Nada mais havendo a tratar, a presente ata foi encerrada e lavrada por <strong>{{ $ata->redator }}</strong>.
        A presente ata, após lida e aprovada, segue assinada por todos os presentes.
    </div>

    <div class="local"><strong>Local:</strong> {{ $ata->local ?: '_________________________' }}</div>
    <div class="data">{{ $ata->cidade ?: '_________________________' }}, {{ $ata->data_reuniao->format('d/m/Y \à\s H:i') }}</div>

    @foreach($participantes as $p)
        <div class="assinatura">
            @if($p['assinatura'])
                <img src="{{ $p['assinatura'] }}" alt="Assinatura de {{ $p['nome'] }}">
            @else
                <div class="vazio"></div>
            @endif
            <div class="linha">{{ $p['nome'] }}</div>
            @if($p['cargo'])
                <div class="cargo">{{ $p['cargo'] }}</div>
            @endif
        </div>
    @endforeach
</body>
</html>
