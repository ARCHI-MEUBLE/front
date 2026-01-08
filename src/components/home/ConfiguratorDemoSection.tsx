"use client";

import { useEffect, useRef } from "react";
import { IconPlay, IconSettings, Icon3dRotate, IconRuler2 } from "@tabler/icons-react";

export function ConfiguratorDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            const elements = entry.target.querySelectorAll("[data-animate]");
            elements.forEach((el, i) => {
              (el as HTMLElement).style.animationDelay = `${i * 100}ms`;
              el.classList.add("animate-in");
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Force la lecture de la vidéo si l'autoplay est bloqué
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("L'autoplay a été bloqué par le navigateur, la vidéo attend une interaction ou est en attente.", error);
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden bg-[#1A1917] py-12 lg:py-20"
    >
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
      {/* Éléments décoratifs d'arrière-plan (style Discord/Junie) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#8B7355]/15 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#8B7355]/15 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Subtile grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16">
          {/* Colonne de gauche : Texte */}
          <div className="lg:col-span-4 max-w-2xl">
            <div data-animate className="flex items-center gap-3 opacity-0 transition-all duration-700 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0">
              <div className="h-px w-10 bg-[#8B7355]/60" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8B7355]">
                L'expérience Digitale
              </span>
            </div>

            <h2
              data-animate
              className="mt-6 font-sans text-4xl font-bold leading-[1.05] tracking-tight text-white opacity-0 transition-all duration-700 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 sm:text-5xl lg:text-7xl"
            >
              Le sur-mesure <br />
              <span className="text-[#8B7355] font-sans">réinventé</span>
            </h2>

            <p
              data-animate
              className="mt-8 text-lg font-normal leading-relaxed text-[#A8A7A3]/90 opacity-0 transition-all duration-700 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0"
            >
              Concevez votre intérieur avec une précision millimétrée. Notre technologie 3D haute fidélité vous place aux commandes de la création, directement depuis votre navigateur.
            </p>

            {/* Points clés rapides */}
            <div className="mt-10 space-y-5">
              {[
                "Configuration en temps réel",
                "Précision au millimètre",
                "Large choix de finitions nobles"
              ].map((text, i) => (
                <div key={i} data-animate className="flex items-center gap-4 opacity-0 transition-all duration-700 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0">
                  <div className="h-1 w-1 rounded-full bg-[#8B7355]/80" />
                  <span className="text-[11px] text-[#706F6C] font-semibold uppercase tracking-[0.2em]">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne de droite : Vidéo Demo avec cadre style "Application" Immersif */}
          <div className="lg:col-span-8 relative group perspective-1000">
            <div
              data-animate
              className="relative aspect-video overflow-hidden rounded-3xl bg-[#2A2926] shadow-[0_0_120px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-all duration-1000 opacity-0 translate-x-8 [&.animate-in]:opacity-100 [&.animate-in]:translate-x-0 group-hover:scale-[1.01]"
            >
              {/* Barre de fenêtre style MacOS/App */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-[#1A1917]/80 backdrop-blur-md border-b border-white/5 flex items-center px-6 gap-3 z-20">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="mx-auto flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">
                  <IconSettings className="w-3 h-3 text-[#706F6C]" />
                  <span className="text-[9px] text-[#A8A7A3] font-bold tracking-[0.3em] uppercase">
                    archimeuble.com
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-0 pt-12">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/images/accueil image/meubletv.jpg"
                  className="h-full w-full object-cover scale-[1.005]"
                >
                  <source src="/videos/configurator-demo.mp4" type="video/mp4" />
                  <source src="/videos/configurator-demo.mp4" type="video/quicktime" />
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>

                {/* Overlay interactif simulé */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1917]/80 via-transparent to-transparent pointer-events-none" />
              </div>

            </div>

            {/* Éléments décoratifs flottants - Labels contextuels (simplifiés pour le layout split) */}
            <div className="hidden xl:block">
              <div data-animate className="absolute -right-10 bottom-1/4 p-4 rounded-2xl bg-[#2A2926]/80 backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 hover:border-[#8B7355]/50 transition-colors">
                <IconSettings className="h-6 w-6 text-[#8B7355]" />
              </div>
            </div>
          </div>
        </div>

        {/* Caractéristiques en bas */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-white/5 pt-16">
          {[
            {
              icon: <div className="text-3xl font-sans font-bold text-[#8B7355]">30j</div>,
              title: "Fabrication",
              desc: "Un délai maîtrisé pour une qualité artisanale sans compromis."
            },
            {
              icon: <div className="text-3xl font-sans font-bold text-[#8B7355]">100%</div>,
              title: "Français",
              desc: "Soutenir l'artisanat local avec des matériaux sourcés en France."
            },
            {
              icon: <div className="text-3xl font-sans font-bold text-[#8B7355]">Atelier</div>,
              title: "Lillois",
              desc: "Un savoir-faire local au cœur de la métropole lilloise."
            }
          ].map((item, i) => (
            <div key={i} data-animate className="flex flex-row items-center text-left gap-6 opacity-0 transition-all duration-700 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 group">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[#8B7355] transition-all duration-500 group-hover:bg-[#8B7355] group-hover:text-white group-hover:border-[#8B7355] shadow-lg">
                {item.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white/90">{item.title}</h3>
                <p className="text-sm font-medium text-[#706F6C] leading-relaxed line-clamp-2">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
