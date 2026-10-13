# ADR-008: Vínculo polimórfico genérico (tipo textual + id) com registro de handlers no Protocolo

- **Status**: Proposta
- **Data**: 2026-10-13
- **Mudança relacionada**: `openspec/changes/criar-modulo-protocolo`

## Contexto

O Protocolo precisa conectar processos a entidades de qualquer módulo (requerimentos, licitações, cemitérios,
pessoas, memorandos internos e módulos futuros) sem conhecer esses módulos, sem migrations a cada novo
consumidor e sem impacto para módulos que não o utilizam. A promoção de requerimento exige, além do vínculo,
atualizar `Proposicao.vinculacao_processo_id` na mesma transação.

## Decisão

- Tabela `protocolo_vinculos` com `entidade_tipo` (string livre validada por regex) e `entidade_id`, sem FK,
  com índices `(tenant_id, entidade_tipo, entidade_id)` e `(tenant_id, processo_id)`.
- Não usar `morphTo` com FQCN: o banco guarda identificadores estáveis de domínio, não nomes de classe.
- O Protocolo define o contrato `EntidadeVinculavel` e um `VinculoRegistry`. Módulos consumidores registram
  handlers opcionalmente, em seus próprios ServiceProviders, quando o Protocolo está habilitado.
- Vínculo sem handler é aceito; operações com efeito colateral (promoção) exigem handler.
- `module.json` do Protocolo declara apenas `Admin`, `OrgChart` e `Pessoas`.

## Alternativas consideradas

- **FK dedicada por módulo (`requerimento_id`, `licitacao_id`...)**: acopla o Protocolo a cada módulo e exige
  migration a cada integração.
- **Morph do Eloquent com FQCN**: acopla dados a namespaces; refatorações quebram registros históricos.
- **Protocolo atualiza a tabela de Requerimentos diretamente**: viola a independência entre módulos.

## Consequências

- (+) Novos módulos integram-se sem alterar o Protocolo; zero impacto para quem não integra.
- (+) Promoção atômica preservada via handler executado dentro da transação do Protocolo.
- (−) Sem integridade referencial no banco para `entidade_id`; mitigado por validação via handler e marcação
  de vínculos não resolvidos na interface.
- (−) Dependência reversa opcional (Requerimentos → contrato do Protocolo), registrada condicionalmente.
