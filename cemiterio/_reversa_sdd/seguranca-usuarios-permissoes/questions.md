# Segurança — Usuários e Permissões, Perguntas Pendentes

> Lacunas 🔴 que requerem validação humana. Esta é a localização canônica da "pergunta de identidade" referenciada por `importacao-csv/questions.md`.

## Q-identidade — Os usuários/coveiros/pedreiros das duas unidades são as mesmas pessoas ou universos de código independentes que colidem por acaso?
O legado mantém bases de segurança e cadastros de funcionário/pedreiro **independentes por cemitério**. O schema alvo os trata como domínios **globais** (sem `cemiterio_id`). Se o mesmo código de 4 dígitos (usuário) ou numérico (funcionário/pedreiro) existir nas duas unidades por coincidência, a importação sobrescreve/mistura identidades silenciosamente hoje.

**Por que importa:** a resposta determina o desenho de `seguranca-usuarios-permissoes/tasks.md` T-02 e de `importacao-csv/tasks.md` T-08/T-09:
- Se são a **mesma pessoa** operando nas duas unidades (ex.: um administrador central que acessa os dois sistemas) → schema global faz sentido, só precisa garantir que o código realmente coincide de propósito.
- Se são **pessoas diferentes que colidem por coincidência de numeração** → o schema alvo precisa de `cemiterio_id` nessas tabelas para não misturar identidades.

**Quem pode responder:** administração dos dois cemitérios — quem conhece os operadores/coveiros/pedreiros reais de cada unidade.

## Q — Mapeamento de posições de `PW_PERMIS` está correto?
(Mesma pergunta de `importacao-csv/questions.md` Q1, repetida aqui por ser também um achado central deste domínio.) O comentário original no código tem um ponto de interrogação sobre o mapeamento exato — vale confirmação empírica contra o comportamento real da aplicação Clipper.
