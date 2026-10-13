# Módulo Protocolo (Processos Administrativos)

O módulo **Protocolo** é responsável pela gestão e tramitação de processos administrativos no ecossistema SYSGOV. Ele implementa o ciclo de vida completo de processos (autuação, tramitação, recebimento, guarda documental, atributos dinâmicos e conclusão), garantindo imutabilidade de andamentos, numeração sequencial atômica, isolamento multi-tenant estrito e controle de acesso baseado em papéis e escopo organizacional (ABAC).

---

## 🏛️ Arquitetura e Decisões de Design (ADRs)

1. **Andamento Atual e Histórico Imutável (ADR-010)**:
   - Todo processo possui no máximo um andamento ativo (`and_atual = true`), garantido no banco por coluna gerada `and_atual_chave` com restrição `UNIQUE(tenant_id, processo_id, and_atual_chave)`.
   - Andamentos são registros imutáveis de auditoria formal: edição de texto e exclusão são bloqueadas no model `Andamento`.
2. **Atributos Dinâmicos como Serviço Transversal (ADR-011)**:
   - Suporte a 7 tipos tipados (`numerico`, `texto`, `lista`, `lista_multipla`, `data`, `decimal`, `texto_longo`) via `App\Support\AtributosDinamicos\ValidadorAtributo`, armazenados em `protocolo_atributos` com chave única por processo.
3. **Numeração Sequencial Atômica**:
   - `NumeracaoService` com lock pessimista (`lockForUpdate`) na tabela `protocolo_sequencias`, garantindo reinício anual e ausência de concorrência ou buracos na numeração.
4. **Vínculos Polimórficos e Promoção de Entidades**:
   - Contrato desacoplado `Modules\Protocolo\Contracts\EntidadeVinculavel` e registro dinâmico via `VinculoRegistry`.

---

## 🔐 Matriz de Permissões RBAC

| Permissão | Descrição |
|---|---|
| `protocolo.processos.view` | Visualização de processos e andamentos (respeita `OrgScope`) |
| `protocolo.processos.create` | Abertura e autuação de novos processos |
| `protocolo.processos.update` | Edição de metadados de processos não concluídos |
| `protocolo.processos.tramitar` | Despacho e tramitação para outra unidade |
| `protocolo.processos.vincular` | Adição e remoção de vínculos com outras entidades ou processos |
| `protocolo.processos.promover_requerimento` | Promoção de demandas (ex: requerimentos do legislativo) a processo |
| `protocolo.processos.rastrear` | Consulta de localização física/digital e tempo de permanência |
| `protocolo.processos.relatorios` | Acesso ao Dashboard gerencial e indicadores por secretaria |
| `protocolo.processos.delete` | Arquivamento / exclusão lógica de processos (soft delete) |
| `protocolo.tipos_tramitacao.manage` | Gerenciamento de tipos de tramitação e parametrização de prazos |

---

## 📡 Endpoints da API (`api/protocolo`)

Todas as requisições exigem autenticação via token Bearer (`auth:sanctum`), header `X-Tenant-ID` e resolução de contexto do órgão (`resolve.tenant`).

### Processos e Ciclo de Vida

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/processos` | `protocolo.processos.index` | Listagem com busca (`q`), filtros (`status`, `orgao_id`, `origem`) e paginação. |
| `POST` | `/api/protocolo/processos` | `protocolo.processos.store` | Abertura atômica de processo com documentos e atributos (multipart). |
| `GET` | `/api/protocolo/processos/{processo}` | `protocolo.processos.show` | Detalhes completos do processo. |
| `PUT` | `/api/protocolo/processos/{processo}` | `protocolo.processos.update` | Atualização de dados cadastrais (impede ciclos hierárquicos). |
| `DELETE` | `/api/protocolo/processos/{processo}` | `protocolo.processos.destroy` | Exclusão lógica (soft delete). Rejeita com 409 se houver filhos ativos. |
| `GET` | `/api/protocolo/processos/{processo}/filhos` | `protocolo.processos.filhos` | Listagem de sub-processos vinculados hierarquicamente. |

### Tramitação e Rastreamento

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/processos/{processo}/andamentos` | `protocolo.processos.andamentos.index` | Histórico cronológico de andamentos do processo. |
| `POST` | `/api/protocolo/processos/{processo}/andamentos` | `protocolo.processos.andamentos.store` | Tramitação atômica: fecha andamento anterior e despacha para destino. |
| `POST` | `/api/protocolo/processos/{processo}/andamentos/atual/receber` | `protocolo.processos.andamentos.receber` | Confirmação de recebimento pelo órgão de destino. |
| `GET` | `/api/protocolo/processos/{processo}/localizacao` | `protocolo.processos.localizacao` | Situação atual (`aberto`, `em_transito`, `em_posse`, `encerrado`). |
| `GET` | `/api/protocolo/processos/{processo}/permanencia` | `protocolo.processos.permanencia` | Tempos de trânsito e permanência detalhados por órgão e andamento. |
| `GET` | `/api/protocolo/prazos/excedidos` | `protocolo.prazos.excedidos` | Consulta geral de andamentos com prazos regimentais estourados. |

### Documentos Anexos

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/processos/{processo}/documentos` | `protocolo.processos.documentos.index` | Listagem de documentos anexados ao processo. |
| `POST` | `/api/protocolo/processos/{processo}/documentos` | `protocolo.processos.documentos.store` | Upload com cálculo de hash SHA-256 e validação de MIME real (≤ 20 MB). |
| `DELETE` | `/api/protocolo/processos/{processo}/documentos/{documento}` | `protocolo.processos.documentos.destroy` | Exclusão lógica de documento anexo. |
| `GET` | `/api/protocolo/documentos/{documento}/download` | `protocolo.documentos.download` | Download seguro com header `X-SHA256` para auditoria de integridade. |

### Atributos Dinâmicos

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/processos/{processo}/atributos` | `protocolo.processos.atributos.index` | Listagem de atributos customizados do processo. |
| `POST` | `/api/protocolo/processos/{processo}/atributos` | `protocolo.processos.atributos.store` | Criação ou atualização de atributo tipado por chave única. |
| `DELETE` | `/api/protocolo/processos/{processo}/atributos/{chave}` | `protocolo.processos.atributos.destroy` | Remoção do atributo customizado pela chave. |

### Vínculos e Promoção

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/processos/{processo}/vinculos` | `protocolo.processos.vinculos.index` | Vínculos do processo com processos correlatos ou entidades externas. |
| `POST` | `/api/protocolo/processos/{processo}/vinculos` | `protocolo.processos.vinculos.store` | Criação de vínculo polimórfico (`papel_vinculo: 'origem'\|'referencia'\|'apensado'`). |
| `DELETE` | `/api/protocolo/processos/{processo}/vinculos/{vinculo}` | `protocolo.processos.vinculos.destroy` | Remoção de vínculo (impede remoção de vínculo de origem com 409). |
| `GET` | `/api/protocolo/vinculos` | `protocolo.vinculos.consulta-reversa` | Consulta reversa por entidade (`?entidade_tipo=...&entidade_id=...`). |
| `POST` | `/api/protocolo/processos/promover-requerimento` | `protocolo.processos.promover-requerimento` | Promoção atômica de requerimento/proposição a processo administrativo. |

### Dashboard e Indicadores

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/dashboard` | `protocolo.dashboard` | Agrupamentos por status, origem, órgão, tempos médios e prazos excedidos. |

### Tipos de Tramitação (Parametrização)

| Método | Rota | Nome da Rota | Descrição |
|---|---|---|---|
| `GET` | `/api/protocolo/tipos-tramitacao` | `protocolo.tipos-tramitacao.index` | Catálogo de tipos de tramitação do tenant. |
| `POST` | `/api/protocolo/tipos-tramitacao` | `protocolo.tipos-tramitacao.store` | Cadastro de tipo com prazos regimentais e efeito de status opcional. |
| `GET` | `/api/protocolo/tipos-tramitacao/{tipoTramitacao}` | `protocolo.tipos-tramitacao.show` | Detalhes do tipo de tramitação. |
| `PUT` | `/api/protocolo/tipos-tramitacao/{tipoTramitacao}` | `protocolo.tipos-tramitacao.update` | Edição de nome, prazos regimentais e efeito de status. |
| `DELETE` | `/api/protocolo/tipos-tramitacao/{tipoTramitacao}` | `protocolo.tipos-tramitacao.destroy` | Inativação / exclusão lógica do tipo de tramitação. |

---

## 🔗 Integração com Módulos Externos (`EntidadeVinculavel`)

Para que outro módulo registre seus recursos como vinculáveis e elegíveis à promoção a processo:

1. Implemente a interface `Modules\Protocolo\Contracts\EntidadeVinculavel`:
```php
namespace Modules\MeuModulo\Services;

use Modules\Protocolo\Contracts\EntidadeVinculavel;

final class MinhaEntidadeVinculavel implements EntidadeVinculavel
{
    public function tipo(): string { return 'minha_entidade'; }
    public function existe(int $entidadeId): bool { ... }
    public function jaPromovida(int $entidadeId): bool { ... }
    public function aoPromover(int $entidadeId, int $processoId): void { ... }
    public function resumo(int $entidadeId): array
    {
        return [
            'titulo' => '...',
            'detalhes' => '...',
            'status' => '...',
        ];
    }
}
```

2. Registre o handler no `boot()` do seu `ServiceProvider` de forma desacoplada:
```php
if (interface_exists(\Modules\Protocolo\Contracts\EntidadeVinculavel::class) && $this->app->bound(\Modules\Protocolo\Services\VinculoRegistry::class)) {
    $this->app->make(\Modules\Protocolo\Services\VinculoRegistry::class)
        ->registrar(new \Modules\MeuModulo\Services\MinhaEntidadeVinculavel());
}
```
