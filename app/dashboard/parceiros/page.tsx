'use client';

import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

const partners = [
  {
    id: 1,
    name: 'Clínica Aetherica de Psicologia',
    specialty: 'Apoio Psicológico e Psiquiátrico',
    description: 'Atendimento especializado para estudantes, focado em ansiedade, depressão e transtornos de aprendizagem.',
    phone: '+55 11 99999-9999',
    whatsapp: '5511999999999',
    type: 'gold'
  },
  {
    id: 2,
    name: 'Instituto NeuroSintonia',
    specialty: 'Avaliação Neuropsicológica',
    description: 'Diagnóstico e acompanhamento de TDAH, Autismo (TEA) e altas habilidades.',
    phone: '+55 11 88888-8888',
    whatsapp: '5511888888888',
    type: 'silver'
  },
  {
    id: 3,
    name: 'Centro de Apoio Pedagógico Lumen',
    specialty: 'Psicopedagogia e Tutoria',
    description: 'Apoio no desenvolvimento de métodos de estudo e superação de dificuldades escolares.',
    phone: '+55 11 77777-7777',
    whatsapp: '5511777777777',
    type: 'bronze'
  }
];

export default function ParceirosPage() {
  return (
    <>
      <TopBar title="Rede de Apoio" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <section className="max-w-[1200px] mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]"
            >
              Parceiros Credenciados
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl font-extralight leading-[1.1] text-on-surface tracking-tighter mt-1"
            >
              Rede de Cuidado Externa
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-base text-on-surface-variant max-w-xl mt-2"
            >
              Conheça as clínicas e profissionais parceiros preparados para oferecer suporte especializado aos alunos que precisam de intervenção além do ambiente escolar.
            </motion.p>
          </section>

          <section className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, i) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="aetheric-glass rounded-[32px] p-8 flex flex-col relative overflow-hidden group"
              >
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary/50 to-transparent opacity-50" />
                
                <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">{partner.specialty}</span>
                <h3 className="text-xl font-light text-on-surface mb-3">{partner.name}</h3>
                <p className="text-sm text-on-surface-variant opacity-80 mb-8 flex-1 leading-relaxed">
                  {partner.description}
                </p>

                <div className="flex gap-3 mt-auto">
                  <a
                    href={`https://wa.me/${partner.whatsapp}?text=Olá, vim através da plataforma Echomind e gostaria de informações.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${partner.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 py-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    Ligar
                  </a>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Privacy Disclaimer */}
          <motion.section
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="max-w-[1200px] mx-auto mt-16 p-6 border border-white/5 bg-white/[0.02] rounded-[24px] flex gap-4 items-start"
          >
            <span className="material-symbols-outlined text-secondary opacity-60">info</span>
            <div>
              <p className="text-sm text-on-surface font-medium mb-1">Aviso de Demonstração</p>
              <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">
                As clínicas e contatos exibidos nesta página são fictícios e utilizados apenas para fins de demonstração da interface. No ambiente de produção, esta lista seria preenchida com parceiros validados pela instituição.
              </p>
            </div>
          </motion.section>
        </PageTransition>
      </main>
    </>
  );
}
