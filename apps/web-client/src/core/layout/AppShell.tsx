import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { Loader2 } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { navigation } = useAuth();
  const navigate = useNavigate();

  // Atalhos de teclado globais: [D], [L], [C], [F], [E], [R], [G] e [M] para menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Atalho Escape fecha o menu
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      const pressedKey = e.key.toUpperCase();

      // [M] abre/fecha o menu
      if (pressedKey === 'M') {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
        return;
      }

      for (const group of navigation) {
        for (const item of group.items) {
          if (item.shortcut && item.shortcut.toUpperCase() === pressedKey) {
            e.preventDefault();
            setIsMenuOpen(false);
            navigate(item.route);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, navigate, isMenuOpen]);

  return (
    <div className="min-h-screen bg-gov-page flex flex-col selection:bg-[#1351B4] selection:text-white font-sans">
      {/* 1. Header Oficial Gov.br no topo (100% largura no Template Base) */}
      <TopBar onToggleSidebar={() => setIsMenuOpen((prev) => !prev)} />

      {/* 2. Menu Lateral Oficial Gov.br (br-menu Drawer / Retrátil) */}
      <Sidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* 3. Corpo Principal da Aplicação (.main-content no Template Base) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-[22rem]">
        <div className="max-w-7xl mx-auto">
          <Suspense
            fallback={
              <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#1351B4] animate-spin" />
                <span className="font-mono text-xs text-gov-text-muted">
                  Carregando módulo institucional...
                </span>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* 4. Rodapé Oficial Gov.br (br-footer) */}
      <Footer />
    </div>
  );
};

export default AppShell;
