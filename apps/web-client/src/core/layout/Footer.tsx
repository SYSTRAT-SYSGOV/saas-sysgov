import React from 'react';
import { useTenant } from '@/core/tenant/useTenant';

export const Footer: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <footer className="bg-[#05142E] text-slate-400 border-t border-white/10 mt-12 font-sans">
      {/* Barra Inferior Única Gov.br (br-footer bottom) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-white font-bold">SYSGOV v3.2.0</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} {tenant?.name || 'Prefeitura Municipal'}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="#" className="hover:text-white hover:underline transition">
              Termos de Uso
            </a>
            <span>•</span>
            <a href="#" className="hover:text-white hover:underline transition">
              Privacidade (LGPD)
            </a>
            <span>•</span>
            <span className="text-[#F6A609] font-mono font-bold tracking-wider">
              TEMPLATE BASE GOV.BR
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
