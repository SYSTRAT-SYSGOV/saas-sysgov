# Proposal

## Why

O módulo **Parecer Descritivo** (anos iniciais, 1º ao 5º) foi desenvolvido pelo Ricardo no repositório de homologação (`cfgfernando/homologa-saas-sysgov`, branch `feat/modulo-parecer-descritivo`, commit `668f2be3`, change `criar-modulo-parecer-descritivo`). Aquele repositório é uma versão anterior do SYSGOV: o módulo em si (backend, frontend, testes) está pronto, mas a base dele ainda não tinha o módulo **Educação**, que agrupa os submódulos da área em `/educacao/<submódulo>`.

Esta mudança **inclui o Parecer no SYSGOV atual**, como o **sétimo submódulo da Educação**, ao lado de Cadastro Escolar, Gestão Pedagógica, Formatura e Eventos, Passeios, Portfólio Digital e Transporte Escolar. Sem isso o módulo entraria como item solto no menu, em `/parecer`, repetindo o problema que a Educação resolveu.

## What Changes

- **Código do Ricardo preservado**: o commit original entra sem alteração (autoria mantida). Esta change só acrescenta a integração.
- **Parecer vira submódulo da Educação**: rota `/educacao/parecer` (a rota solta `/parecer` redireciona), rótulo "Parecer Descritivo", item na barra de submódulos, na página inicial `/educacao` e no menu, sob o agrupador "Educação".
- **Ordem no menu**: o `module.json` do Ricardo usa `order: 31`, igual ao da Formatura. O Parecer passa para `35` (depois do Transporte) para não reposicionar itens já gravados nos tenants.
- **Instalações novas**: o `ClientMenuSeeder` ganha o item "Parecer Descritivo" sob a Educação.
- **Testes e documentação** da Educação passam de seis para sete submódulos; novo `docs/modules/parecer.md`.
- Fora do escopo: mudar o comportamento do módulo do Ricardo, migrar dados do sistema PHP da HostGator, mudar permissões dos outros submódulos.

## Capabilities

### New Capabilities

- `parecer`: já descrita na change `criar-modulo-parecer-descritivo` (não é repetida aqui).

### Modified Capabilities

- `educacao`: passa a ter sete submódulos; o Parecer Descritivo é o sétimo, com rota nova e redirecionamento da antiga.

## Impact

- **Backend**: módulo `Modules/Parecer` (novo, do Ricardo) com 8 tabelas `parecer_*` **novas**, sem alterar tabelas existentes. `bootstrap/app.php` registra o provider; `EscolaService::MODULOS` inclui `parecer` (escola de trabalho); `docker-entrypoint.sh` roda o `ParecerRbacSeeder`. O `module:register` do boot grava catálogo, permissões e o item de menu do módulo.
- **Frontend**: módulo `parecer` no web-client; `submodulos.ts`, `TopBar`, testes e registro regerado.
- **Configuração**: `BNCC_API_KEY` opcional (vazia = busca na BNCC desativada, só a lista local).
- **Dados em produção**: só tabelas novas, uma linha em `modules` e linhas de permissões/menu (idempotentes). Exige backup do banco antes do deploy.
- **Ativação**: o módulo não aparece para nenhum tenant até ser habilitado no Admin Suite (catálogo de módulos).
