import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Checkbox, Modal, ScreenState } from '@sysgov/ui';
import { parecerApi, useImagemAutenticada, type FolhaParecer, type Impressao as DadosImpressao } from '../api';
import { Aviso, Botoes, mensagemDeErro, useParecer, type Impressao, type Mensagem } from './comum';
import './impressao.css';

/** Popup de impressão (dialogoImprimir do PHP): escolhe trimestre e matérias, depois mostra as folhas. */
const DialogoImprimir: React.FC<{ alvo: Impressao; onFechar: () => void }> = ({ alvo, onFechar }) => {
  const { catalogo } = useParecer();
  const todas = Object.keys(catalogo.materias);
  const [tri, setTri] = useState(alvo.tri ?? 1);
  const [materias, setMaterias] = useState<string[]>(todas);
  const [erro, setErro] = useState<Mensagem>(null);
  const [dados, setDados] = useState<DadosImpressao | null>(null);
  const [gerando, setGerando] = useState(false);

  const gerar = () => {
    if (materias.length === 0) return setErro({ tipo: 'erro', texto: 'Escolha pelo menos uma matéria.' });
    setGerando(true);
    parecerApi
      .impressao({ aluno_id: alvo.alunoId, turma_id: alvo.turmaId, tri, materias })
      .then(setDados)
      .catch((e: unknown) => setErro(mensagemDeErro(e)))
      .finally(() => setGerando(false));
  };

  if (dados !== null) return <Folhas dados={dados} onFechar={onFechar} />;

  return (
    <Modal
      open
      onClose={onFechar}
      title="Imprimir parecer"
      footer={
        <>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={gerar} disabled={gerando}>
            {gerando ? 'Gerando…' : '🖨 Imprimir'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Aviso msg={erro} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Trimestre</legend>
          <Botoes rotulo="Trimestre" atual={tri} onChange={setTri} itens={[[1, '1º trimestre'], [2, '2º trimestre'], [3, '3º trimestre'], [0, 'Todos (1º, 2º e 3º)']]} />
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="flex items-center gap-2 text-sm font-medium">
            Matérias
            <Button variant="link" size="xs" onClick={() => setMaterias(todas)}>
              marcar todas
            </Button>
            ·
            <Button variant="link" size="xs" onClick={() => setMaterias([])}>
              desmarcar
            </Button>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {todas.map((m) => (
              <Checkbox key={m} label={catalogo.materias[m as 'LP']} checked={materias.includes(m)} onCheckedChange={(v) => setMaterias((x) => (v === true ? [...x, m] : x.filter((y) => y !== m)))} />
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
};

/**
 * Folhas do parecer em tela cheia; na impressão só elas aparecem (CSS de impressao.css do PHP).
 * Use "Salvar como PDF" na janela de impressão do navegador.
 */
const Folhas: React.FC<{ dados: DadosImpressao; onFechar: () => void }> = ({ dados, onFechar }) => {
  const logo = useImagemAutenticada(dados.escola.tem_logo ? '/escola/logo' : null);
  useEffect(() => {
    document.body.classList.add('parecer-imprimindo');
    return () => document.body.classList.remove('parecer-imprimindo');
  }, []);

  return createPortal(
    <div className="parecer-impressao fixed inset-0 z-50 overflow-y-auto bg-white text-black">
      <div className="nao-imprimir sticky top-0 flex justify-center gap-2 border-b bg-neutral-100 p-3">
        <Button onClick={() => window.print()} disabled={dados.folhas.length === 0}>
          Imprimir / Salvar PDF
        </Button>
        <Button variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </div>
      {dados.folhas.length === 0 ? (
        <ScreenState type="empty" title="Nenhum aluno ativo para imprimir." />
      ) : (
        dados.folhas.map((f) => <Folha key={`${f.aluno.id}-${f.trimestre}`} f={f} escola={dados.escola.nome} logo={logo} />)
      )}
    </div>,
    document.body,
  );
};

const Folha: React.FC<{ f: FolhaParecer; escola: string; logo: string | null }> = ({ f, escola, logo }) => {
  const foto = useImagemAutenticada(f.aluno.tem_foto ? `/alunos/${f.aluno.id}/foto` : null);
  return (
    <section className="folha">
      <div className="escola">
        {logo && <img className="logo" src={logo} alt="" />}
        <div>
          <strong>{escola.toUpperCase()}</strong>
          <h1>
            PARECER DESCRITIVO {f.turma.ano_letivo} – {f.trimestre}º TRIMESTRE
          </h1>
        </div>
      </div>
      <div className="cab">
        <div className="foto">{foto ? <img src={foto} alt="" /> : <span>{f.aluno.nome.charAt(0).toUpperCase()}</span>}</div>
        <div className="dados">
          <p className="aluno">
            <b>ALUNO(A):</b> {f.aluno.nome}
          </p>
          <p>
            <b>TURMA:</b> {f.turma.serie} {f.turma.nome} <span className="esp" />
            <b>TURNO:</b> {f.turma.turno}
          </p>
        </div>
      </div>
      <div className="texto-parecer">
        {f.paragrafos.map((p) => (
          <p key={p.materia}>
            <b>{p.rotulo}:</b> {p.texto}
          </p>
        ))}
        {f.observacoes_gerais && (
          <p>
            <b>Observações:</b> {f.observacoes_gerais}
          </p>
        )}
      </div>
      <div className="assinaturas">
        {f.assinaturas.map((a) => (
          <div key={a.rotulo}>
            <span className="linha" />
            {a.nome && (
              <>
                {a.nome}
                <br />
              </>
            )}
            <small>{a.rotulo}</small>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DialogoImprimir;
