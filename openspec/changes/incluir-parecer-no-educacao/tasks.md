# Tarefas

## 1. Trazer o módulo
- [x] 1.1 Aplicar o commit `668f2be3` do Ricardo com `git am` (autoria preservada), excluindo `bootstrap/app.php` e `moduleRegistry.generated.ts`
- [x] 1.2 Registrar `ParecerServiceProvider` em `bootstrap/app.php`
- [x] 1.3 Regerar o registro do web-client com `scripts/generate-module-registry.js`
- [x] 1.4 Conferir a sintaxe PHP dos arquivos do módulo e dos alterados

## 2. Integrar à Educação
- [x] 2.1 `module.json` do Parecer: `menu.order` de 31 para 35
- [x] 2.2 `submodulos.ts`: Parecer como sétimo submódulo (`/educacao/parecer`)
- [x] 2.3 `ClientMenuSeeder`: item "Parecer Descritivo" sob a Educação
- [x] 2.4 `TopBar`: título da rota `/educacao/parecer`
- [x] 2.5 Atualizar `Educacao.test.tsx` e acrescentar o teste do Parecer em `AgrupadorEducacaoMenuTest` (este só roda no CI)
- [x] 2.6 Documentação: `docs/modules/educacao.md` (sete submódulos) e novo `docs/modules/parecer.md`

## 3. Verificação
- [x] 3.1 Testes do web-client: Educação, painel, `core` e módulo Parecer (33 + 12 passando) e `tsc --noEmit` sem erros
- [ ] 3.2 CI do PR verde: PHPUnit do módulo Parecer (`AcessoAvaliacaoTest`, `EstruturaIsolamentoTest`, `NotasFrequenciaImpressaoTest`) e `AgrupadorEducacaoMenuTest`
- [x] 3.3 `openspec validate incluir-parecer-no-educacao --strict`

## 4. Deploy (somente após merge e autorização)
- [ ] 4.1 Backup do banco e conferência da contagem de tabelas
- [ ] 4.2 `docker compose -f docker-compose.prod.yml up -d --build` (o usuário roda)
- [ ] 4.3 Conferir: migration `create_parecer_tables` aplicada (8 tabelas), 0 pendentes, módulo `parecer` no catálogo, item de menu sob "Educação", `/api/health`, logs sem erro
- [ ] 4.4 Habilitar o módulo em um tenant de teste e percorrer o fluxo: série e funções da turma, avaliar, notas, frequência, impressão
- [ ] 4.5 Definir a tarifa do módulo no Admin Suite e liberar aos tenants

## 5. Encerramento
- [ ] 5.1 `openspec archive` das duas changes (`criar-modulo-parecer-descritivo` e esta) após o deploy

## 6. Ajustes após o deploy (grades e filtros)
- [x] 6.1 Barra de filtros padrão do Parecer (`BarraFiltros`): grade responsiva com todos os controles na mesma altura (`h-11`). O Input (36 px) e o Button (40 px) do `@sysgov/ui` ficavam menores que o Select (44 px) e saíam desalinhados
- [x] 6.2 Auditoria: grade padrão (`DataTable`) com paginação do servidor (100 por página), sem ordenação local que enganaria entre páginas
- [x] 6.3 Relatórios: filtros alinhados; tabelas de séries, matérias, comparativo do aluno e relação de alunos em `DataTable` (relação de alunos com busca e exportação CSV/XLSX/PDF)
- [x] 6.4 Teste de regressão da Auditoria (grade padrão, total do servidor e altura dos controles)
- [x] 6.5 Demais listagens em `DataTable`: Configurações (turmas, com busca e exportação), Ocorrências (alunos da turma, com busca e exportação), Conteúdos (habilidades da matéria, sem paginação e sem ordenação porque a ordem é manual) e a consulta à BNCC (busca e paginação pelo padrão). Ações de linha no menu ⋮ (`ActionsMenu`); subir/descer ficam em coluna própria "Ordem"
- [ ] 6.6 Decidir o padrão das matrizes de lançamento com campos editáveis na linha (Avaliar, Notas, Frequência, Alunos da turma): hoje usam as peças `Table` do `@sysgov/ui`, porque ordenar, filtrar e paginar atrapalham o lançamento
