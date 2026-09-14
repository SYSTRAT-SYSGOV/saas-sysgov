# CAPD — Vínculo CIT com Evidência + Dashboard do Avaliador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o avaliador (chefia imediata) vincular uma nota extrema (grau 1, 2 ou 5) a um
incidente específico do Diário de Bordo (CIT), anexar evidência sem sair da tela, e ver um
dashboard de KPIs no topo do Portal do Avaliador em vez de só uma tabela.

**Architecture:** Duas features independentes no módulo CAPD (`apps/api/Modules/Capd`,
`packages/sdk`, `apps/web-client`). Feature A (vínculo CIT) é quase só frontend — reaproveita o
endpoint de upload de evidência e a listagem de Diário de Bordo que já existem, só acrescenta um
campo opcional `diario_bordo_id` ao JSON `respostas_fatores` já existente (sem migration).
Feature B (dashboard) soma um endpoint novo `GET /capd/avaliacoes/kpis-equipe`, escopado do
mesmo jeito que o `index()` já escopa (avaliador comum só vê a própria equipe), e uma linha de
KPI cards no topo do `PortalAvaliadorView`.

**Tech Stack:** Laravel 13 (PHP 8.4) + PHPUnit no backend; React 19 + TS + Tailwind v4 +
`@sysgov/ui` no frontend; `@sysgov/sdk` como camada de tipos/cliente HTTP entre os dois.

**Spec:** `docs/superpowers/specs/2026-09-14-capd-cit-dashboard-design.md`

## Global Constraints

- CAPD usa exclusivamente Escala Gráfica (Chiavenato, graus 1-5) + Técnica do Incidente Crítico
  (CIT) — nunca introduzir terminologia ou lógica BARS.
- Valores monetários usam `App\Support\Money` (não se aplica a este plano — nenhum campo
  monetário é tocado).
- Todo componente de UI vem de `@sysgov/ui`; um `<textarea>`/`<input type="file">` nativo só é
  aceitável onde já é o padrão estabelecido no módulo (não existe `Textarea`/`FileInput` no
  design system ainda — mesma decisão já tomada em `AvaliacaoFormModal.tsx`).
- Toda mutação passa por `AuditLogger` quando altera estado persistente — não se aplica ao novo
  endpoint `kpisEquipe` (é leitura pura).
- Toda tabela de negócio já usa `TenantAware` — os modelos tocados aqui (`Avaliacao`,
  `DiarioBordo`) já o implementam; nenhuma mudança de escopo de tenant é necessária.

---

## File Structure

- Modify: `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php` — valida
  `diario_bordo_id` opcional em `update()`; novo método `kpisEquipe()`.
- Modify: `apps/api/Modules/Capd/Routes/api.php` — nova rota `GET /avaliacoes/kpis-equipe`.
- Create: `apps/api/Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php`
- Create: `apps/api/Modules/Capd/Tests/Feature/KpisEquipeTest.php`
- Modify: `packages/sdk/src/modules/capd/types.ts` — `RespostaFator.diario_bordo_id`, novo tipo
  `ApiKpisEquipe`.
- Modify: `packages/sdk/src/modules/capd/client.ts` — novo método `getKpisEquipe()`.
- Modify: `apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx` — vínculo CIT + upload de
  evidência inline + correção do aviso de trava.
- Create: `apps/web-client/src/modules/capd/graduTone.ts` — mapa grau→tom compartilhado.
- Modify: `apps/web-client/src/modules/capd/views/PortalAvaliadorView.tsx` — linha de KPI cards +
  barra de distribuição de graus.

---

### Task 1: Backend — aceitar `diario_bordo_id` opcional ao salvar rascunho

**Files:**
- Modify: `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php:200-203`
- Test: `apps/api/Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `PUT /api/capd/avaliacoes/{id}` aceita
  `respostas_fatores.<codigo>.diario_bordo_id` (int, opcional, deve existir em
  `capd_diario_bordo`). Tasks 3 e 4 (frontend) dependem deste contrato.

- [x] **Step 1: Escrever o teste que falha**

Criar `apps/api/Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php`:

```php
<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdFatoresSeeder;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\FatorAvaliacao;
use Tests\TestCase;

final class VinculoCitJustificativaTest extends TestCase
{
    use RefreshDatabase;

    public function test_salvar_rascunho_aceita_diario_bordo_id_valido_vinculado_a_resposta(): void
    {
        $tenant = Tenant::create(['name' => 'Município Vínculo', 'slug' => 'pref-vinculo', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();

        $admin = User::create([
            'name' => 'Admin Vínculo', 'email' => 'admin.vinculo@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Vínculo', 'email' => 'servidor.vinculo@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233355']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Vínculo 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $fatorF3 = FatorAvaliacao::where('tenant_id', $tenant->id)->where('codigo', 'F3')->firstOrFail();

        $incidente = DiarioBordo::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'fator_id' => $fatorF3->id, 'tipo' => 'negativo',
            'data_ocorrencia' => '2026-03-01', 'descricao_fato' => str_repeat('Fato observável relevante. ', 2),
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson("/api/capd/avaliacoes/{$avaliacao->id}", [
                'respostas_fatores' => [
                    'F3' => ['grau' => 1, 'justificativa' => 'Justificativa com mais de vinte caracteres.', 'diario_bordo_id' => $incidente->id],
                ],
            ]);

        $response->assertStatus(200);
        $this->assertSame($incidente->id, $avaliacao->fresh()->respostas_fatores['F3']['diario_bordo_id']);

        app(TenantContext::class)->clear();
    }

    public function test_salvar_rascunho_rejeita_diario_bordo_id_inexistente(): void
    {
        $tenant = Tenant::create(['name' => 'Município Vínculo Inválido', 'slug' => 'pref-vinculo-inv', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();

        $admin = User::create([
            'name' => 'Admin Vínculo Inválido', 'email' => 'admin.vinculo.inv@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Vínculo Inválido', 'email' => 'servidor.vinculo.inv@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233366']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Vínculo Inválido 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson("/api/capd/avaliacoes/{$avaliacao->id}", [
                'respostas_fatores' => [
                    'F3' => ['grau' => 1, 'diario_bordo_id' => 999999],
                ],
            ]);

        $response->assertStatus(422);

        app(TenantContext::class)->clear();
    }
}
```

- [x] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php`
Expected: FAIL no segundo teste (`test_salvar_rascunho_rejeita_diario_bordo_id_inexistente`
espera 422, mas hoje nenhuma regra valida `exists` para `diario_bordo_id`, então a API aceita e
retorna 200) — esse é o teste que prova a lacuna antes da correção.

- [x] **Step 3: Implementar a validação**

Em `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php`, trocar (linhas 200-203):

```php
        $request->validate([
            'respostas_fatores'       => ['required', 'array'],
            'respostas_fatores.*.grau'=> ['required', 'integer', 'between:1,5'],
        ]);
```

por:

```php
        $request->validate([
            'respostas_fatores'                  => ['required', 'array'],
            'respostas_fatores.*.grau'            => ['required', 'integer', 'between:1,5'],
            'respostas_fatores.*.diario_bordo_id' => ['nullable', 'integer', 'exists:capd_diario_bordo,id'],
        ]);
```

- [x] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php`
Expected: PASS (2 testes)

- [x] **Step 5: Commit**

```bash
git add apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php apps/api/Modules/Capd/Tests/Feature/VinculoCitJustificativaTest.php
git commit -m "feat(capd): valida diario_bordo_id opcional ao salvar rascunho de avaliacao"
```

---

### Task 2: SDK — campo `diario_bordo_id` em `RespostaFator`

**Files:**
- Modify: `packages/sdk/src/modules/capd/types.ts:62-66`

**Interfaces:**
- Consumes: nada.
- Produces: `RespostaFator.diario_bordo_id?: number` — usado pelas Tasks 3 e 4.

- [x] **Step 1: Editar o tipo**

Em `packages/sdk/src/modules/capd/types.ts`, trocar:

```ts
export type RespostaFator = {
  grau: number;
  automatizado?: boolean;
  justificativa?: string;
};
```

por:

```ts
export type RespostaFator = {
  grau: number;
  automatizado?: boolean;
  justificativa?: string;
  diario_bordo_id?: number;
};
```

- [x] **Step 2: Rodar o typecheck do workspace do SDK a partir do consumidor**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS (mudança é aditiva, nenhum consumidor quebra)

- [x] **Step 3: Commit**

```bash
git add packages/sdk/src/modules/capd/types.ts
git commit -m "feat(sdk): adiciona diario_bordo_id opcional em RespostaFator"
```

---

### Task 3: Frontend — vincular incidente CIT como justificativa da nota

**Files:**
- Modify: `apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx`

**Interfaces:**
- Consumes: `RespostaFator.diario_bordo_id` (Task 2); `ApiDiarioBordo.evidencias?: ApiEvidencia[]`
  (já existe no SDK).
- Produces: nada consumido por outras tasks deste plano (Task 4 edita o mesmo arquivo em
  sequência, não em paralelo).

- [x] **Step 1: Adicionar a função de vínculo e ajustar o aviso de trava**

Em `apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx`, adicionar após `atualizarJustificativa`
(depois da linha 125, antes de `const toggleCit`):

```tsx
  const vincularIncidente = (codigo: string, incidente: ApiDiarioBordo) => {
    setRespostas((prev) => {
      const atual = prev[codigo];
      const jaVinculado = atual?.diario_bordo_id === incidente.id;
      return {
        ...prev,
        [codigo]: {
          ...atual,
          diario_bordo_id: jaVinculado ? undefined : incidente.id,
          justificativa: jaVinculado ? atual?.justificativa : incidente.descricao_fato,
        },
      };
    });
    setSucesso(null);
  };
```

Trocar a checagem de aviso (linha ~326-331), de:

```tsx
                        {anotacoesFator.length === 0 && (
                          <p className="text-[10px] text-status-warning mt-1">
                            Nenhum apontamento CIT registrado para este fator — a submissão será bloqueada pela
                            Trava Anti-Leniência até que um seja lançado no Diário de Bordo.
                          </p>
                        )}
```

por:

```tsx
                        {!anotacoesFator.some((a) => (a.evidencias?.length ?? 0) > 0) && (
                          <p className="text-[10px] text-status-warning mt-1">
                            Nenhum apontamento CIT com evidência documental anexada foi encontrado para este fator
                            — a submissão será bloqueada pela Trava Anti-Leniência até que um seja registrado com
                            evidência (PDF, PNG ou JPG).
                          </p>
                        )}
```

- [x] **Step 2: Adicionar o botão de vincular em cada incidente listado**

Dentro do bloco que renderiza `anotacoesFator.map((a) => (...))` (linhas ~282-297), trocar:

```tsx
                        {anotacoesFator.map((a) => (
                          <div key={a.id} className="p-2 flex items-start gap-2 text-[11px]">
                            <Badge
                              variant={a.tipo === 'positivo' ? 'success' : 'danger'}
                              className="text-[9px] shrink-0"
                            >
                              {a.tipo === 'positivo' ? 'Positivo' : 'Negativo'}
                            </Badge>
                            <div className="min-w-0">
                              <p className="font-mono text-muted-foreground">
                                {new Date(a.data_ocorrencia).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-foreground">{a.descricao_fato}</p>
                            </div>
                          </div>
                        ))}
```

por:

```tsx
                        {anotacoesFator.map((a) => {
                          const vinculado = resposta?.diario_bordo_id === a.id;
                          return (
                            <div key={a.id} className="p-2 flex items-start gap-2 text-[11px]">
                              <Badge
                                variant={a.tipo === 'positivo' ? 'success' : 'danger'}
                                className="text-[9px] shrink-0"
                              >
                                {a.tipo === 'positivo' ? 'Positivo' : 'Negativo'}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-muted-foreground">
                                  {new Date(a.data_ocorrencia).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-foreground">{a.descricao_fato}</p>
                              </div>
                              {ehExtremo && (
                                <button
                                  type="button"
                                  onClick={() => vincularIncidente(f.codigo, a)}
                                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-mono font-semibold transition-colors ${
                                    vinculado
                                      ? 'bg-status-success text-white border-status-success'
                                      : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
                                  }`}
                                >
                                  {vinculado ? 'Vinculado ✓' : 'Vincular'}
                                </button>
                              )}
                            </div>
                          );
                        })}
```

- [x] **Step 3: Rodar o typecheck**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS

- [x] **Step 4: Testar manualmente no browser**

Abrir o Portal do Avaliador (`http://localhost:5174/capd`), abrir "Avaliar" numa avaliação em
rascunho de um servidor com apontamento CIT registrado, marcar grau 1/2/5 num fator com CIT,
expandir a lista de apontamentos, clicar "Vincular" — confirmar que o botão vira "Vinculado ✓" e
que o textarea de justificativa é preenchido automaticamente com a descrição do incidente.

- [x] **Step 5: Commit**

```bash
git add apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx
git commit -m "feat(capd): permite vincular incidente CIT como justificativa da nota extrema"
```

---

### Task 4: Frontend — anexar evidência ao incidente CIT sem sair do modal

**Files:**
- Modify: `apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx`

**Interfaces:**
- Consumes: `api.capd.uploadEvidencia(diarioId: number, file: File): Promise<{ message: string; hash_sha256: string }>`
  (já existe em `packages/sdk/src/modules/capd/client.ts:75-83` — nenhuma mudança de SDK
  necessária nesta task).
- Produces: nada consumido por outras tasks.

- [x] **Step 1: Extrair a busca de CIT para uma função reutilizável**

Trocar (linhas 72-84):

```tsx
    Promise.all([api.capd.getAvaliacao(avaliacaoId), api.capd.listFatores()])
      .then(([av, todosFatores]) => {
        setAvaliacao(av);
        setRespostas(av.respostas_fatores || {});
        setFatores(todosFatores.filter((f) => f.ativo && !f.automatizado));

        api.capd
          .listDiarioBordo({ ciclo_id: av.ciclo_id, servidor_id: av.servidor_id })
          .then((res) => setAnotacoesCit(res.data || []))
          .catch(() => setAnotacoesCit([]));
      })
      .catch(() => setErro('Não foi possível carregar os dados desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);
```

por:

```tsx
    Promise.all([api.capd.getAvaliacao(avaliacaoId), api.capd.listFatores()])
      .then(([av, todosFatores]) => {
        setAvaliacao(av);
        setRespostas(av.respostas_fatores || {});
        setFatores(todosFatores.filter((f) => f.ativo && !f.automatizado));
        recarregarCit(av.ciclo_id, av.servidor_id);
      })
      .catch(() => setErro('Não foi possível carregar os dados desta avaliação.'))
      .finally(() => setLoading(false));
  }, [open, avaliacaoId]);

  const recarregarCit = (cicloId: number, servidorId: number) => {
    api.capd
      .listDiarioBordo({ ciclo_id: cicloId, servidor_id: servidorId })
      .then((res) => setAnotacoesCit(res.data || []))
      .catch(() => setAnotacoesCit([]));
  };
```

- [x] **Step 2: Adicionar estado de upload em progresso**

Junto aos outros `useState` do topo do componente (depois de `const [citExpandido, ...]`,
linha 51), adicionar:

```tsx
  const [anexandoEvidencia, setAnexandoEvidencia] = useState<number | null>(null);
```

- [x] **Step 3: Adicionar a função de upload**

Depois da função `vincularIncidente` (adicionada na Task 3), adicionar:

```tsx
  const anexarEvidencia = async (incidente: ApiDiarioBordo, file: File) => {
    if (!avaliacao) return;
    setAnexandoEvidencia(incidente.id);
    try {
      await api.capd.uploadEvidencia(incidente.id, file);
      recarregarCit(avaliacao.ciclo_id, avaliacao.servidor_id);
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao anexar evidência ao incidente CIT.');
    } finally {
      setAnexandoEvidencia(null);
    }
  };
```

- [x] **Step 4: Adicionar o input de arquivo por incidente sem evidência**

Dentro do `.map((a) => { ... })` de incidentes (editado na Task 3), logo após o bloco
`{ehExtremo && (<button ...>Vincular</button>)}`, adicionar:

```tsx
                              {(a.evidencias?.length ?? 0) === 0 && (
                                <label className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-mono font-semibold text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                                  {anexandoEvidencia === a.id ? 'Enviando...' : 'Anexar evidência'}
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    disabled={anexandoEvidencia === a.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) anexarEvidencia(a, file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                              )}
```

- [x] **Step 5: Rodar o typecheck**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS

- [x] **Step 6: Testar manualmente no browser**

No mesmo fluxo da Task 3, para um incidente sem evidência, clicar "Anexar evidência", selecionar
um PDF/PNG/JPG pequeno — confirmar que o botão muda para "Enviando...", depois some (porque o
incidente passa a ter evidência) e o aviso amarelo de "sem evidência" desaparece se era o único
incidente do fator.

- [x] **Step 7: Commit**

```bash
git add apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx
git commit -m "feat(capd): permite anexar evidencia a um incidente CIT direto no modal de avaliacao"
```

---

### Task 5: Backend — endpoint de KPIs da equipe do avaliador

**Files:**
- Modify: `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php`
- Modify: `apps/api/Modules/Capd/Routes/api.php:59-71`
- Test: `apps/api/Modules/Capd/Tests/Feature/KpisEquipeTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `GET /api/capd/avaliacoes/kpis-equipe?ciclo_id=` retorna
  `{ total_equipe: number, pendentes: number, concluidas: number, nota_media: string, distribuicao_graus: { "1": number, "2": number, "3": number, "4": number, "5": number } }`.
  Task 6 (SDK) depende deste contrato exato.

- [x] **Step 1: Escrever o teste que falha**

Criar `apps/api/Modules/Capd/Tests/Feature/KpisEquipeTest.php`:

```php
<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Tests\TestCase;

final class KpisEquipeTest extends TestCase
{
    use RefreshDatabase;

    public function test_avaliador_comum_ve_apenas_kpis_da_propria_equipe(): void
    {
        $tenant = Tenant::create(['name' => 'Município KPIs', 'slug' => 'pref-kpis', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliadorA = User::create(['name' => 'Avaliador A', 'email' => 'avaliador.a@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliadorA->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $avaliadorB = User::create(['name' => 'Avaliador B', 'email' => 'avaliador.b@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliadorB->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidor1 = User::create(['name' => 'Servidor 1', 'email' => 'servidor1.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233377']);
        $servidor2 = User::create(['name' => 'Servidor 2', 'email' => 'servidor2.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233388']);
        $servidor3 = User::create(['name' => 'Servidor 3', 'email' => 'servidor3.kpis@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233399']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo KPIs 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        // Equipe do avaliador A: 2 avaliações, 1 concluída com nota 8.00
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor1->id,
            'avaliador_id' => $avaliadorA->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => ['F3' => ['grau' => 4]],
            'nota_final' => '8.00', 'data_conclusao' => now(),
        ]);
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor2->id,
            'avaliador_id' => $avaliadorA->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        // Equipe do avaliador B: 1 avaliação concluída (não deve aparecer para A)
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidor3->id,
            'avaliador_id' => $avaliadorB->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => ['F3' => ['grau' => 5]],
            'nota_final' => '9.50', 'data_conclusao' => now(),
        ]);

        $response = $this->actingAs($avaliadorA)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/kpis-equipe?ciclo_id={$ciclo->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'total_equipe' => 2,
            'pendentes'    => 1,
            'concluidas'   => 1,
            'nota_media'   => '8.00',
        ]);
        $this->assertSame(1, $response->json('distribuicao_graus.4'));
        $this->assertSame(0, $response->json('distribuicao_graus.5'));

        app(TenantContext::class)->clear();
    }
}
```

- [x] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Capd/Tests/Feature/KpisEquipeTest.php`
Expected: FAIL (rota `capd.avaliacoes.kpis-equipe` não existe → 404)

- [x] **Step 3: Adicionar a rota**

Em `apps/api/Modules/Capd/Routes/api.php`, dentro do grupo `avaliacoes` (linhas 59-71), inserir
a nova rota **antes** de `Route::get('/{id}', ...)` (senão `{id}` capturaria
`kpis-equipe` como parâmetro):

```php
Route::prefix('avaliacoes')->group(function (): void {
    Route::get('/', [AvaliacaoController::class, 'index'])->name('capd.avaliacoes.index');
    Route::post('/', [AvaliacaoController::class, 'store'])->name('capd.avaliacoes.store');
    Route::get('/kpis-equipe', [AvaliacaoController::class, 'kpisEquipe'])->name('capd.avaliacoes.kpis-equipe');
    Route::get('/{id}', [AvaliacaoController::class, 'show'])->name('capd.avaliacoes.show');
    // ... (demais rotas inalteradas)
```

- [x] **Step 4: Implementar o controller**

Em `apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php`, adicionar o método (logo
após `index()`, antes de `// ── GET /avaliacoes/{id} ──`):

```php
    // ── GET /avaliacoes/kpis-equipe ────────────────────────────────────

    /**
     * KPIs consolidados da equipe do avaliador autenticado (ou de toda a
     * organização, se admin/gestor). Mesmo escopo de index().
     */
    public function kpisEquipe(Request $request): JsonResponse
    {
        $avaliador = $request->user();

        $cicloId = $request->query('ciclo_id') ? (int) $request->query('ciclo_id') : null;
        $ciclo = $cicloId
            ? CicloAvaliacao::find($cicloId)
            : CicloAvaliacao::query()->ativo()->latest('id')->first();

        $distribuicaoVazia = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];

        if (! $ciclo) {
            return response()->json([
                'total_equipe'       => 0,
                'pendentes'          => 0,
                'concluidas'         => 0,
                'nota_media'         => '0.00',
                'distribuicao_graus' => $distribuicaoVazia,
            ]);
        }

        $query = Avaliacao::where('ciclo_id', $ciclo->id);

        $isAdminOrGestor = $avaliador && (
            $avaliador->is_platform_admin ||
            collect(['admin_tenant', 'admin', 'gestor_rh', 'root', 'comissao_capd'])->some(fn ($r) => $avaliador->hasRole($r))
        );

        if (! $isAdminOrGestor) {
            $query->where('avaliador_id', $avaliador->id);
        }

        $avaliacoes = $query->get(['id', 'servidor_id', 'data_conclusao', 'nota_final', 'respostas_fatores']);
        $concluidas = $avaliacoes->whereNotNull('data_conclusao');

        $distribuicao = $distribuicaoVazia;
        foreach ($concluidas as $av) {
            foreach ((array) $av->respostas_fatores as $resposta) {
                $grau = $resposta['grau'] ?? null;
                if ($grau && isset($distribuicao[(string) $grau])) {
                    $distribuicao[(string) $grau]++;
                }
            }
        }

        return response()->json([
            'total_equipe'       => $avaliacoes->pluck('servidor_id')->unique()->count(),
            'pendentes'          => $avaliacoes->count() - $concluidas->count(),
            'concluidas'         => $concluidas->count(),
            'nota_media'         => $concluidas->count() > 0
                ? number_format((float) $concluidas->avg('nota_final'), 2, '.', '')
                : '0.00',
            'distribuicao_graus' => $distribuicao,
        ]);
    }
```

- [x] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Capd/Tests/Feature/KpisEquipeTest.php`
Expected: PASS

- [x] **Step 6: Rodar a suíte completa do módulo para checar regressão**

Run: `cd apps/api && vendor/bin/phpunit Modules/Capd`
Expected: PASS (nenhum teste existente quebrado)

- [x] **Step 7: Commit**

```bash
git add apps/api/Modules/Capd/Http/Controllers/AvaliacaoController.php apps/api/Modules/Capd/Routes/api.php apps/api/Modules/Capd/Tests/Feature/KpisEquipeTest.php
git commit -m "feat(capd): endpoint de KPIs da equipe do avaliador no Portal do Avaliador"
```

---

### Task 6: SDK — tipo e método de cliente para os KPIs da equipe

**Files:**
- Modify: `packages/sdk/src/modules/capd/types.ts`
- Modify: `packages/sdk/src/modules/capd/client.ts:55-60`

**Interfaces:**
- Consumes: contrato JSON da Task 5 (`GET /capd/avaliacoes/kpis-equipe`).
- Produces: `ApiKpisEquipe` e `CapdModuleClient.getKpisEquipe(params?: { ciclo_id?: number }): Promise<ApiKpisEquipe>`
  — usados pela Task 7.

- [x] **Step 1: Adicionar o tipo**

Em `packages/sdk/src/modules/capd/types.ts`, logo após o bloco `ApiDashboardMetricas` (depois da
chave de fechamento em torno da linha 189), adicionar:

```ts
export type ApiKpisEquipe = {
  total_equipe: number;
  pendentes: number;
  concluidas: number;
  nota_media: string;
  distribuicao_graus: { '1': number; '2': number; '3': number; '4': number; '5': number };
};
```

- [x] **Step 2: Adicionar o método no cliente**

Em `packages/sdk/src/modules/capd/client.ts`, importar `ApiKpisEquipe` no bloco de `import type`
do topo do arquivo (junto aos demais tipos `Api*`), e adicionar o método logo após
`getMetricas()` (linhas 57-60):

```ts
  async getKpisEquipe(params?: { ciclo_id?: number }): Promise<ApiKpisEquipe> {
    return this.api.request(`/capd/avaliacoes/kpis-equipe${buildQueryString(params)}`);
  }
```

- [x] **Step 3: Rodar o typecheck**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add packages/sdk/src/modules/capd/types.ts packages/sdk/src/modules/capd/client.ts
git commit -m "feat(sdk): adiciona ApiKpisEquipe e getKpisEquipe ao cliente CAPD"
```

---

### Task 7: Frontend — KPI cards e distribuição de graus no Portal do Avaliador

**Files:**
- Create: `apps/web-client/src/modules/capd/graduTone.ts`
- Modify: `apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx` (usa o util compartilhado)
- Modify: `apps/web-client/src/modules/capd/views/PortalAvaliadorView.tsx`

**Interfaces:**
- Consumes: `api.capd.getKpisEquipe()` (Task 6).
- Produces: nada consumido por outras tasks deste plano (última task).

- [x] **Step 1: Criar o util compartilhado de tom por grau**

Criar `apps/web-client/src/modules/capd/graduTone.ts`:

```ts
export type GrauTone = 'success' | 'warning' | 'danger';

export const GRAU_TONE: Record<number, GrauTone> = {
  5: 'success',
  4: 'success',
  3: 'warning',
  2: 'danger',
  1: 'danger',
};
```

- [x] **Step 2: Usar o util em `AvaliacaoFormModal.tsx`**

Trocar (linhas 10-16):

```tsx
const GRAUS = [
  { valor: 5, label: '5 — Excelente', tone: 'success' as const },
  { valor: 4, label: '4 — Bom', tone: 'success' as const },
  { valor: 3, label: '3 — Regular', tone: 'warning' as const },
  { valor: 2, label: '2 — Insuficiente', tone: 'danger' as const },
  { valor: 1, label: '1 — Crítico', tone: 'danger' as const },
];
```

por:

```tsx
const GRAUS = [
  { valor: 5, label: '5 — Excelente', tone: GRAU_TONE[5] },
  { valor: 4, label: '4 — Bom', tone: GRAU_TONE[4] },
  { valor: 3, label: '3 — Regular', tone: GRAU_TONE[3] },
  { valor: 2, label: '2 — Insuficiente', tone: GRAU_TONE[2] },
  { valor: 1, label: '1 — Crítico', tone: GRAU_TONE[1] },
];
```

E adicionar o import no topo do arquivo (junto aos demais imports locais):

```tsx
import { GRAU_TONE } from './graduTone';
```

- [x] **Step 3: Rodar o typecheck**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS

- [x] **Step 4: Adicionar estado e busca dos KPIs em `PortalAvaliadorView.tsx`**

Importar `KpiCard` no bloco de import de `@sysgov/ui` (linha 2-13) e `ApiKpisEquipe` no bloco de
`import type` (linhas 33-38), e `GRAU_TONE` de `'../graduTone'`. Adicionar estado logo após
`const [servidores, setServidores] = useState<ApiServidor[]>([]);` (linha 57):

```tsx
  const [kpisEquipe, setKpisEquipe] = useState<ApiKpisEquipe | null>(null);
```

Dentro de `carregarDadosAvaliador` (linhas 98-128), adicionar a busca ao `Promise.all` existente
— trocar:

```tsx
      const [resAv, resCit, resRec, resServ] = await Promise.all([
        api.capd.listAvaliacoes(params).catch(() => ({ data: [] })),
        api.capd.listDiarioBordo().catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listServidores().catch(() => ({ data: [] })),
      ]);
```

por:

```tsx
      const [resAv, resCit, resRec, resServ, resKpis] = await Promise.all([
        api.capd.listAvaliacoes(params).catch(() => ({ data: [] })),
        api.capd.listDiarioBordo().catch(() => ({ data: [] })),
        api.capd.listRecursos().catch(() => ({ data: [] })),
        api.capd.listServidores().catch(() => ({ data: [] })),
        api.capd.getKpisEquipe().catch(() => null),
      ]);
```

E logo após `setServidores(servList);` (linha 118), adicionar:

```tsx
      setKpisEquipe(resKpis);
```

- [x] **Step 5: Renderizar a linha de KPI cards**

Em `apps/web-client/src/modules/capd/views/PortalAvaliadorView.tsx`, entre o fechamento do
`<PageHeader ... />` (linha 603) e `<Tabs items={subTabItems} ... />` (linha 606), adicionar:

```tsx
      {/* ── KPIs da Equipe ───────────────────────────────────────────── */}
      {kpisEquipe && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="Total da Equipe" value={kpisEquipe.total_equipe} />
            <KpiCard title="Pendentes" value={kpisEquipe.pendentes} />
            <KpiCard title="Concluídas" value={kpisEquipe.concluidas} />
            <KpiCard title="Nota Média" value={kpisEquipe.nota_media} />
          </div>
          {kpisEquipe.concluidas > 0 && (
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Distribuição de Graus (avaliações concluídas)
              </p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {([5, 4, 3, 2, 1] as const).map((grau) => {
                  const qtd = kpisEquipe.distribuicao_graus[String(grau) as '1' | '2' | '3' | '4' | '5'];
                  const pct = kpisEquipe.concluidas > 0 ? (qtd / kpisEquipe.concluidas) * 100 : 0;
                  if (pct === 0) return null;
                  const tone = GRAU_TONE[grau];
                  const bg = tone === 'success' ? 'bg-status-success' : tone === 'warning' ? 'bg-status-warning' : 'bg-status-danger';
                  return (
                    <div
                      key={grau}
                      className={`h-full ${bg}`}
                      style={{ width: `${pct}%` }}
                      title={`Grau ${grau}: ${qtd}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

```

- [x] **Step 6: Rodar o typecheck**

Run: `npm run typecheck --workspace=apps/web-client`
Expected: PASS

- [x] **Step 7: Testar manualmente no browser**

Abrir o Portal do Avaliador — confirmar que os 4 KPI cards aparecem no topo com os números
corretos e que a barra de distribuição de graus aparece quando há avaliações concluídas.

- [x] **Step 8: Commit**

```bash
git add apps/web-client/src/modules/capd/graduTone.ts apps/web-client/src/modules/capd/AvaliacaoFormModal.tsx apps/web-client/src/modules/capd/views/PortalAvaliadorView.tsx
git commit -m "feat(capd): dashboard de KPIs da equipe no Portal do Avaliador"
```
