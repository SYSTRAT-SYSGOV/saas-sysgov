import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Badge, Button, Checkbox, Input } from '@sysgov/ui';
import { multiApi, type Aluno, type Ref } from '../api';

/** Lista de caixas de seleção (profissionais, escolas, tipos). */
export const SelecaoMultipla: React.FC<{ titulo: string; itens: Ref[]; marcados: number[]; aoMudar: (ids: number[]) => void; vazio?: string }> = ({ titulo, itens, marcados, aoMudar, vazio }) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">{titulo}</legend>
    {itens.length === 0 ? (
      <p className="text-xs text-muted-foreground">{vazio ?? 'Nenhum item cadastrado.'}</p>
    ) : (
      <div className="grid max-h-44 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
        {itens.map((i) => (
          <Checkbox key={i.id} label={i.nome} checked={marcados.includes(i.id)}
            onCheckedChange={(v) => aoMudar(v === true ? [...marcados, i.id] : marcados.filter((x) => x !== i.id))} />
        ))}
      </div>
    )}
  </fieldset>
);

/** Busca de estudante no módulo Escola (todas as escolas do tenant), por nome ou CGM. */
export const BuscaAluno: React.FC<{ rotulo?: string; aoEscolher: (a: Aluno) => void }> = ({ rotulo = 'Buscar estudante (nome ou CGM)', aoEscolher }) => {
  const [q, setQ] = useState('');
  const [achados, setAchados] = useState<Aluno[]>([]);

  const buscar = async (texto: string) => {
    setQ(texto);
    if (texto.trim().length < 2) return setAchados([]);
    try {
      setAchados(await multiApi.alunos(texto.trim()));
    } catch {
      setAchados([]);
    }
  };

  return (
    <div className="relative">
      <Input label={rotulo} value={q} onChange={(e) => void buscar(e.target.value)} placeholder="Digite ao menos 2 letras" />
      {achados.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow">
          {achados.map((a) => (
            <li key={a.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { aoEscolher(a); setQ(''); setAchados([]); }}>
                <span className="font-medium">{a.nome}</span>
                <span className="block text-xs text-muted-foreground">
                  {[a.escola, a.turma, a.cgm ? `CGM ${a.cgm}` : null].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Estudantes escolhidos, com botão para remover. */
export const ListaEscolhidos: React.FC<{ itens: Ref[]; aoRemover: (id: number) => void }> = ({ itens, aoRemover }) =>
  itens.length === 0 ? null : (
    <div className="flex flex-wrap gap-2">
      {itens.map((i) => (
        <Badge key={i.id} variant="outline" className="gap-1 py-1">
          {i.nome}
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label={`Remover ${i.nome}`} onClick={() => aoRemover(i.id)}><X className="h-3 w-3" /></Button>
        </Badge>
      ))}
    </div>
  );
