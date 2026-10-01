'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    VLibras: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export default function VLibrasWidget() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Only inject once
    if (document.getElementById('vlibras-script')) return;

    const script = document.createElement('script');
    script.id = 'vlibras-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onload = () => {
      if (window.VLibras) {
        try {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
        } catch (e) {
          console.warn('[VLibras] Erro ao inicializar widget:', e);
        }
      }
    };
    script.onerror = () => {
      console.warn('[VLibras] Falha ao carregar script do VLibras.');
    };
    document.body.appendChild(script);
  }, []);

  if (!isMounted) return null;

  // These data attributes and div structure are required by the VLibras plugin
  return (
    <div data-vw="true" className="enabled">
      <div data-vw-access-button="true" className="active"></div>
      <div data-vw-plugin-wrapper="true">
        <div className="vw-plugin-top-wrapper"></div>
      </div>
    </div>
  );
}
