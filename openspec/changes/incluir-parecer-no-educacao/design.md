# Design

## Contexto

O módulo do Ricardo foi escrito sobre o `Escola` e segue o modelo do `Pedagogico`. A Educação (change `educacao-modulo-submodulos`) já trata o agrupamento na camada de apresentação: a lista de submódulos fica em `modules/educacao/submodulos.ts`, o menu é gerado a partir do `menu.parent` do `module.json` e o `module:register` roda para todo módulo a cada boot da API. O `module.json` do Parecer já declara `parent: educacao` e `slug: parecer`.

## Decisões

### D1. Preservar o commit do Ricardo e integrar em commit à parte

O commit `668f2be3` é aplicado com `git am`, mantendo autor e mensagem. Os dois arquivos que divergem do nosso histórico (`bootstrap/app.php` e `moduleRegistry.generated.ts`) são ajustados em um segundo commit; o registro é **regerado** por `scripts/generate-module-registry.js`, não editado à mão. Assim a revisão separa o que é do módulo do que é integração.

### D2. Sétimo submódulo, rota `/educacao/parecer`

| Submódulo | Alias | Rota | Rota antiga (redireciona) | Rótulo |
|---|---|---|---|---|
| Parecer Descritivo | `parecer` | `/educacao/parecer` | `/parecer` | Parecer Descritivo |

O `routePath` do registro gerado continua `parecer`; o `AppRouter` monta `/educacao/parecer` a partir de `submodulos.ts`, como nos demais. A rota antiga ganha o mesmo `Navigate replace` com preservação de *query string* e *hash*.

### D3. Ordem: Parecer por último (`order: 35`)

`order` 31 colidiria com a Formatura. Trocar a ordem dos existentes exigiria reposicionar `client_menu_items` em produção. Colocar o Parecer depois do Transporte não toca em nenhuma linha existente. A lista de `submodulos.ts` segue a mesma ordem (o teste que confere a lista contra os `module.json` continua valendo).

### D4. Migração de menu histórica não muda

`Agrupadores::submodulosDaEducacao()` serve à migração `2026_11_05_100000`, que só reposiciona itens soltos já existentes e já rodou em produção. O Parecer **não entra nela**: o item é criado pelo `module:register` do boot (que registra o submódulo sob o agrupador) e, em instalação nova, pelo `ClientMenuSeeder`.

### D5. Permissões e perfis ficam no módulo

O Parecer traz `parecer.view|professor|gestor|auditoria` e três perfis-modelo (`ParecerRbacSeeder`), clonados para o tenant quando o módulo é habilitado. Não há permissão nova na Educação (mantém a D5 da change da Educação). As regras de escopo por função na turma são do módulo e não mudam aqui.

### D6. Escola de trabalho

`parecer` entra em `EscolaService::MODULOS` e nos prefixos `ROTAS_COM_ESCOLA` do web-client, como já faz o Ricardo; as rotas `/parecer/*` exigem o cabeçalho `X-Escola-ID`, igual ao Pedagógico.

### D7. Entrega sem risco para o que já roda

- Migration só **cria** tabelas `parecer_*` (nenhum `ALTER`/`DROP` em tabela existente; o `down()` apaga só as novas).
- Habilidades BNCC carregam sob demanda de `habilidades.json`; nenhuma carga no deploy.
- O deploy recria `api`, `scheduler` e `web`. Backup do banco antes, verificação de `/api/health` e das tabelas depois.
- O módulo fica invisível até alguém habilitá-lo para um tenant; isso permite publicar e validar com um tenant de teste antes de liberar.

## Riscos

- **Testes do Ricardo não rodaram no nosso código**: foram escritos contra a base dele. O CI do PR é a primeira execução; se algo falhar por divergência (ex.: unificação do cadastro de Pessoas, Fase 5), corrigir no segundo commit, sem alterar o do Ricardo.
- **Preço do módulo**: `module:register` cria o item do catálogo sem tarifa definida; definir o valor mensal no Admin Suite antes de vender.
