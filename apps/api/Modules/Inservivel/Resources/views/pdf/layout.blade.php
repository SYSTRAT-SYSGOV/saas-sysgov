{{-- Layout comum dos PDFs do módulo (dompdf, A4). Dados do órgão e do doador vêm das configurações (D9). --}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>@yield('titulo')</title>
    <style>
        @page { margin: 22mm 18mm 20mm 18mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10.5px; color: #1f2937; line-height: 1.5; }
        .cabecalho { text-align: center; border-bottom: 2px solid #1351b4; padding-bottom: 8px; margin-bottom: 16px; }
        .cabecalho .orgao { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #071d41; }
        .cabecalho .sub { font-size: 9.5px; color: #4b5563; }
        h1 { font-size: 14px; text-align: center; text-transform: uppercase; margin: 6px 0 2px; color: #071d41; }
        h2 { font-size: 11px; text-transform: uppercase; margin: 16px 0 6px; color: #0c326f; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; }
        .centro { text-align: center; }
        .direita { text-align: right; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .just { text-align: justify; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { background: #eef2f7; font-size: 9px; text-transform: uppercase; text-align: left; padding: 5px; border: 1px solid #d1d5db; }
        td { padding: 5px; border: 1px solid #e5e7eb; vertical-align: top; }
        .total td { font-weight: bold; background: #f9fafb; }
        .caixa { border: 1px solid #d1d5db; border-radius: 4px; padding: 8px 10px; margin: 8px 0; }
        .destaque { border: 2px solid #168821; background: #f0fdf4; text-align: center; padding: 10px; margin: 14px 0; }
        .assinaturas { margin-top: 36px; width: 100%; }
        .assinaturas td { border: none; width: 50%; text-align: center; padding: 30px 10px 0; }
        .linha { border-top: 1px solid #111827; padding-top: 4px; }
        .rodape { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 8px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="rodape">{{ $orgao }} &middot; Inservível &amp; Doações &middot; emitido em {{ $emitido_em }}</div>
    <div class="cabecalho">
        <div class="orgao">{{ $doador['nome'] }}</div>
        @if($doador['cnpj'] || $doador['sede'])
            <div class="sub">{{ $doador['cnpj'] ? 'CNPJ ' . $doador['cnpj'] : '' }}{{ $doador['cnpj'] && $doador['sede'] ? ' · ' : '' }}{{ $doador['sede'] ?? '' }}</div>
        @endif
        <div class="sub">Gestão e doação de bens inservíveis</div>
    </div>
    @yield('conteudo')
</body>
</html>
