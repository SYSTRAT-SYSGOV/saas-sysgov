import * as React from 'react';
import { User, Check, ChevronsUpDown, UserPlus, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { PessoaSearchInput } from './PessoaSearchInput';
import { PessoaFormModal, type NovoCadastroRapidoPessoaInput } from './PessoaFormModal';
import { cn } from '../lib/utils';

export interface PessoaPickerOption {
  id: number;
  nome: string;
  nome_social?: string | null;
  cpf_mascarado: string;
  status?: 'ativo' | 'inativo' | 'falecido';
  falecido?: boolean;
  data_falecimento?: string | null;
}

export interface PessoaPickerProps {
  value?: number | null;
  onChange: (pessoaId: number | null, pessoa?: PessoaPickerOption | null) => void;
  onSearch?: (term: string) => Promise<PessoaPickerOption[]> | PessoaPickerOption[];
  options?: PessoaPickerOption[];
  selectedPessoa?: PessoaPickerOption | null;
  placeholder?: string;
  canCreate?: boolean;
  onCreatePessoa?: (data: NovoCadastroRapidoPessoaInput) => Promise<PessoaPickerOption | null | void> | PessoaPickerOption | null | void;
  disabled?: boolean;
  className?: string;
}

export const PessoaPicker: React.FC<PessoaPickerProps> = ({
  value,
  onChange,
  onSearch,
  options = [],
  selectedPessoa: initialSelected,
  placeholder = 'Selecione uma pessoa física...',
  canCreate = true,
  onCreatePessoa,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [internalOptions, setInternalOptions] = React.useState<PessoaPickerOption[]>(options);
  const [selected, setSelected] = React.useState<PessoaPickerOption | null>(initialSelected ?? null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialSelected) {
      setSelected(initialSelected);
    } else if (value && internalOptions.length > 0) {
      const match = internalOptions.find((p) => p.id === value);
      if (match) setSelected(match);
    } else if (!value) {
      setSelected(null);
    }
  }, [value, initialSelected, internalOptions]);

  React.useEffect(() => {
    if (options.length > 0) {
      setInternalOptions(options);
    }
  }, [options]);

  // Fecha o dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carrega opções iniciais ao abrir o dropdown se estiver vazio
  React.useEffect(() => {
    if (isOpen && internalOptions.length === 0 && onSearch) {
      void handleSearch('');
    }
  }, [isOpen]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!onSearch) return;

    setLoading(true);
    try {
      const results = await onSearch(term);
      setInternalOptions(results);
    } catch {
      setInternalOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (pessoa: PessoaPickerOption) => {
    setSelected(pessoa);
    onChange(pessoa.id, pessoa);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelected(null);
    onChange(null, null);
  };

  const handleQuickCreateSuccess = async (data: NovoCadastroRapidoPessoaInput) => {
    if (!onCreatePessoa) return;
    try {
      const novaPessoa = await onCreatePessoa(data);
      if (novaPessoa) {
        setInternalOptions((prev) => [novaPessoa, ...prev]);
        handleSelect(novaPessoa);
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Botão de disparo do combobox */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'flex items-center justify-between w-full min-h-[40px] px-3 py-2 text-sm bg-popover border border-gov-border rounded-lg transition-all',
          disabled ? 'opacity-60 cursor-not-allowed bg-gov-border/10' : 'cursor-pointer hover:border-gov-primary/50',
          isOpen && 'border-gov-primary ring-2 ring-gov-primary/20'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="size-6 rounded-full bg-gov-primary/10 text-gov-primary flex items-center justify-center shrink-0">
            <User className="size-3.5" />
          </div>
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gov-text-primary truncate">{selected.nome}</span>
              <span className="text-xs text-gov-text-secondary font-mono tabular-nums bg-gov-border/30 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                {selected.cpf_mascarado}
              </span>
              {selected.falecido && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 shrink-0">
                  Falecido(a)
                </span>
              )}
            </div>
          ) : (
            <span className="text-gov-text-secondary/70 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gov-text-secondary hover:text-destructive p-1 rounded transition-colors"
              title="Remover seleção"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronsUpDown className="size-4 text-gov-text-secondary" />
        </div>
      </div>

      {/* Dropdown de opções */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-popover border border-gov-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          <div className="p-2 border-b border-gov-border/60">
            <PessoaSearchInput
              value={searchTerm}
              onChange={handleSearch}
              loading={loading}
              placeholder="Digite o nome ou CPF para filtrar..."
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gov-border/30">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-gov-text-secondary gap-2 text-xs">
                <Loader2 className="size-4 animate-spin text-gov-primary" />
                <span>Buscando pessoas...</span>
              </div>
            ) : internalOptions.length > 0 ? (
              internalOptions.map((pessoa) => {
                const isSelected = selected?.id === pessoa.id;
                return (
                  <div
                    key={pessoa.id}
                    onClick={() => handleSelect(pessoa)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-md cursor-pointer text-sm transition-colors',
                      isSelected
                        ? 'bg-gov-primary/10 text-gov-primary font-medium'
                        : 'hover:bg-gov-border/30 dark:hover:bg-white/5 text-gov-text-primary'
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 min-w-0" title={pessoa.nome_social ? `${pessoa.nome} (${pessoa.nome_social})` : pessoa.nome}>
                        <span className="truncate">{pessoa.nome}</span>
                        {pessoa.nome_social && (
                          <span className="text-xs text-gov-text-secondary truncate shrink-0">({pessoa.nome_social})</span>
                        )}
                        {pessoa.falecido && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 shrink-0">
                            Falecido(a)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gov-text-secondary font-mono tabular-nums mt-0.5 truncate">
                        <span>{pessoa.cpf_mascarado}</span>
                        {pessoa.falecido && pessoa.data_falecimento && (
                          <span className="text-[11px] text-neutral-400">Óbito: {pessoa.data_falecimento}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-gov-primary" />}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-gov-text-secondary">
                <p>Nenhuma pessoa encontrada com o termo informado.</p>
              </div>
            )}
          </div>

          {canCreate && onCreatePessoa && (
            <div className="p-2 bg-gov-border/15 border-t border-gov-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full text-xs h-8 gap-1.5 text-gov-primary hover:text-gov-primary-dark"
              >
                <UserPlus className="size-3.5" />
                <span>Cadastrar Nova Pessoa</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de cadastro rápido integrado */}
      {canCreate && onCreatePessoa && (
        <PessoaFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleQuickCreateSuccess}
        />
      )}
    </div>
  );
};
