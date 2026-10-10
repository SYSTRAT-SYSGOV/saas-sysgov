<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  @page { margin: 28px 32px 48px; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #1e293b; }
  h1 { font-size: 17px; margin: 0; color: #0f3d91; }
  .sub { color: #475569; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #eef2ff; }
  .num { text-align: right; font-family: DejaVu Sans Mono, monospace; }
  .trabalho { border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 11px; margin-top: 12px; page-break-inside: avoid; }
  .cab { font-weight: bold; font-size: 12px; }
  .nota { float: right; font-family: DejaVu Sans Mono, monospace; font-weight: bold; color: #0f3d91; }
  .meta { color: #64748b; margin: 2px 0 6px; }
  .imgs img { width: 150px; margin: 4px 6px 0 0; border: 1px solid #e2e8f0; }
  .rodape { position: fixed; bottom: -30px; left: 0; right: 0; color: #64748b; font-size: 9px; text-align: center; }
</style>
</head>
<body>
  <div class="rodape">Gerado em {{ $gerado_em }} por {{ $gerado_por }} — SYSGOV · Portfólio Digital</div>

  <h1>Portfólio Digital — {{ $aluno }}</h1>
  <div class="sub">{{ $escola }} @if($turma) · Turma {{ $turma }} @endif · {{ $periodo }}</div>

  <table>
    <thead><tr><th>Matéria</th><th class="num">Trabalhos</th><th class="num">Média</th></tr></thead>
    <tbody>
      @forelse($desempenho['por_materia'] as $linha)
        <tr><td>{{ $linha['materia'] }}</td><td class="num">{{ $linha['quantidade'] }}</td><td class="num">{{ $linha['media'] !== null ? number_format($linha['media'], 1, ',', '') : '—' }}</td></tr>
      @empty
        <tr><td colspan="3">Nenhum trabalho no período.</td></tr>
      @endforelse
    </tbody>
    @if($desempenho['total'] > 0)
      <tfoot><tr><th>Geral</th><th class="num">{{ $desempenho['total'] }}</th><th class="num">{{ number_format($desempenho['media'], 1, ',', '') }}</th></tr></tfoot>
    @endif
  </table>

  @foreach($trabalhos as $t)
    <div class="trabalho">
      <div class="cab">{{ $t['titulo'] }} <span class="nota">{{ $t['avaliacao'] }}</span></div>
      <div class="meta">{{ $t['materia'] }} · {{ $t['data'] }}</div>
      @if($t['descricao'])<div>{{ $t['descricao'] }}</div>@endif
      @if($t['observacoes'])<div style="margin-top:4px"><strong>Observações do professor:</strong> {{ $t['observacoes'] }}</div>@endif
      @if(count($t['imagens']))
        <div class="imgs">@foreach($t['imagens'] as $src)<img src="{{ $src }}" alt="">@endforeach</div>
      @endif
      @if($t['omitidas'] > 0)<div class="meta">+ {{ $t['omitidas'] }} imagem(ns) não incluída(s) neste relatório.</div>@endif
    </div>
  @endforeach
</body>
</html>
