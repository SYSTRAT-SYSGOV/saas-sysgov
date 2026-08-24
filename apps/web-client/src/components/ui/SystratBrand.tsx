import React from 'react';

export const SystratWings: React.FC<{ className?: string }> = ({ className = 'h-4 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.35))' }}
    >
      <defs>
        <linearGradient id="systratGoldTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        <linearGradient id="systratGoldMid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#662203" />
        </linearGradient>

        <linearGradient id="systratGoldBot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#5B1E04" />
        </linearGradient>

        <linearGradient id="systratSilver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#CBD5E1" />
          <stop offset="65%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>

      {/* Asa Dourada Superior com Contorno em Relevo */}
      <path
        d="M6 3C12 24 32 56 86 63C56 49 31 31 14 7C10 5 7 4 6 3Z"
        fill="url(#systratGoldTop)"
        stroke="#78350F"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Asa Dourada Média com Contorno em Relevo */}
      <path
        d="M10 27C18 45 38 67 90 72C62 62 36 49 20 33C15 29 11 27 10 27Z"
        fill="url(#systratGoldMid)"
        stroke="#662203"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Asa Dourada Inferior com Contorno em Relevo */}
      <path
        d="M24 53C34 67 54 79 82 81C60 77 42 69 30 57C26 55 24 53 24 53Z"
        fill="url(#systratGoldBot)"
        stroke="#5B1E04"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Bico / Asa Prateada com Contorno em Relevo */}
      <path
        d="M80 66C92 68 110 65 130 78C113 71 97 73 85 78L108 94C92 84 81 75 80 66Z"
        fill="url(#systratSilver)"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export interface SystratBrandProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SystratBrand: React.FC<SystratBrandProps> = ({ className = '', size = 'sm' }) => {
  const sizeMap = {
    sm: { icon: 'h-4 w-auto', text: 'text-sm' },
    md: { icon: 'h-5 w-auto', text: 'text-base' },
    lg: { icon: 'h-7 w-auto', text: 'text-xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-1.5 font-sans font-black select-none tracking-wider uppercase ${text} ${className}`}>
      {/* Brasão SYSTRAT com contorno escuro e relevo */}
      <SystratWings className={icon} />

      {/* Letreiros SYSTRAT em Relevo Profundo */}
      <div className="flex items-baseline tracking-tight">
        {/* SYS em Dourado Metálico Relevo Esculpido */}
        <span
          className="font-black"
          style={{
            background: 'linear-gradient(180deg, #FFFBEB 0%, #F59E0B 35%, #D97706 70%, #78350F 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            WebkitTextStroke: '0.4px #662203',
            filter: 'drop-shadow(0 1px 0 #451A03) drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.45))',
          }}
        >
          SYS
        </span>

        {/* TRAT em Prateado Metálico Relevo Esculpido */}
        <span
          className="font-black"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 25%, #94A3B8 65%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            WebkitTextStroke: '0.4px #0F172A',
            filter: 'drop-shadow(0 1px 0 #020617) drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.45))',
          }}
        >
          TRAT
        </span>
      </div>

      {/* Separador */}
      <span
        className="font-bold mx-0.5 text-slate-500"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
      >
        /
      </span>

      {/* GOV.BR na Cor Amarela Padrão Gov.br em Relevo com Contorno Escuro */}
      <span
        className="font-black tracking-tight"
        style={{
          background: 'linear-gradient(180deg, #FFFDEB 0%, #FFCD07 40%, #F59E0B 75%, #92400E 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: '0.4px #78350F',
          filter: 'drop-shadow(0 1px 0 #451A03) drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.45))',
        }}
      >
        GOV.BR
      </span>
    </div>
  );
};

export default SystratBrand;
