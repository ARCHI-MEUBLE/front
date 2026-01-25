"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

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
                (el as HTMLElement).style.animationDelay = `${i * 80}ms`;
                el.classList.add("animate-in");
              });
            }
          });
        },
        { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    return () => observer.disconnect();
  }, []);

  return (
      <section
          ref={sectionRef}
          className="relative z-10 overflow-hidden bg-[#0D0D0C] py-20 lg:py-32"
      >
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Gradient orbs */}
          <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-[#8B7355]/20 blur-[150px] rounded-full animate-pulse" />
          <div
              className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-[#5B4D3A]/15 blur-[120px] rounded-full animate-pulse"
              style={{ animationDelay: "2s" }}
          />

          {/* Grid */}
          <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
          />

          {/* Diagonal lines decoration */}
          <svg
              className="absolute top-0 right-0 w-1/2 h-full opacity-[0.02]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
          >
            <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="0.2" />
            <line x1="20" y1="100" x2="100" y2="20" stroke="white" strokeWidth="0.1" />
            <line x1="40" y1="100" x2="100" y2="40" stroke="white" strokeWidth="0.1" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-[1400px] px-5 sm:px-6 lg:px-8">
          {/* === HERO SECTION === */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="lg:col-span-5 lg:pr-8">
              {/* Eyebrow with icon */}
              <div
                  data-animate
                  className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                <div className="w-2 h-2 bg-[#8B7355] rounded-full animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A8A7A3]">
                Nouveau
              </span>
              </div>

              {/* Title - Big and bold */}
              <h2
                  data-animate
                  className="mt-6 lg:mt-8 text-[clamp(2rem,8vw,4.5rem)] font-black leading-[1] lg:leading-[0.95] tracking-[-0.03em] text-white opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                Votre meuble.
                <br />
                <span className="bg-gradient-to-r from-[#8B7355] via-[#C4A77D] to-[#8B7355] bg-clip-text text-transparent">
                Votre vision.
              </span>
              </h2>

              {/* Subtitle */}
              <p
                  data-animate
                  className="mt-6 text-lg sm:text-xl font-medium leading-relaxed text-[#706F6C] max-w-md opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                Configurez en 3D, visualisez en temps réel, commandez en un clic.
              </p>

              {/* CTA Buttons */}
              <div
                  data-animate
                  className="mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                <Link
                    href="/models"
                    className="group relative inline-flex items-center justify-center gap-3 bg-white px-6 sm:px-7 py-3.5 sm:py-4 text-sm font-bold text-[#0D0D0C] overflow-hidden transition-all duration-300 lg:hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                >
                  <span className="relative z-10 transition-colors duration-300 lg:group-hover:text-white">Lancer le configurateur</span>
                  <svg
                      className="relative z-10 w-4 h-4 transition-all duration-300 lg:group-hover:translate-x-1 lg:group-hover:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                  <div className="absolute inset-0 bg-[#8B7355] translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300" />
                </Link>

                <Link
                    href="#demo"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Voir la démo
                </Link>
              </div>

              {/* Mini stats - horizontal */}
              <div
                  data-animate
                  className="mt-8 lg:mt-12 flex items-center justify-between lg:justify-start gap-4 lg:gap-8 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-xl lg:text-2xl font-black text-[#8B7355]">3D</span>
                  <span className="text-[10px] lg:text-xs text-[#706F6C] uppercase tracking-wider">
                  Temps réel
                </span>
                </div>
                <div className="w-px h-6 bg-white/10 hidden sm:block" />
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-xl lg:text-2xl font-black text-[#8B7355]">24/7</span>
                  <span className="text-[10px] lg:text-xs text-[#706F6C] uppercase tracking-wider">
                  Disponible
                </span>
                </div>
                <div className="w-px h-6 bg-white/10 hidden sm:block" />
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <span className="text-xl lg:text-2xl font-black text-[#8B7355]">∞</span>
                  <span className="text-[10px] lg:text-xs text-[#706F6C] uppercase tracking-wider">
                  Options
                </span>
                </div>
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="lg:col-span-7 relative mt-8 lg:mt-0">
              {/* Floating element - Top Left: Visualisation - Hidden on mobile */}
              <div
                  data-animate
                  className="hidden lg:block absolute -top-8 -left-8 z-20 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
              >
                <div className="bg-[#1A1917] border border-white/10 px-4 py-3 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#8B7355] to-[#5B4D3A] rounded-lg flex items-center justify-center">
                      <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                      >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B7355]">
                        Visualisation
                      </p>
                      <p className="text-sm font-semibold text-white">Haute fidélité</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating element - Bottom Right: Devis Instantané - Hidden on mobile */}
              <div
                  data-animate
                  className="hidden lg:block absolute -bottom-6 -right-6 z-20 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700 delay-200"
              >
                <div className="bg-white px-5 py-3 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#8B7355] to-[#5B4D3A] rounded-full flex items-center justify-center">
                      <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                      >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#706F6C]">
                        Devis
                      </p>
                      <p className="text-lg font-black text-[#0D0D0C]">Instantané</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Mockup */}
              <div
                  data-animate
                  className="relative opacity-0 scale-95 [&.animate-in]:opacity-100 [&.animate-in]:scale-100 transition-all duration-1000 ease-out"
              >
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#8B7355]/30 via-transparent to-[#8B7355]/10 blur-3xl scale-110 -z-10" />

                <Image
                    src="/images/configurator-mockup.png"
                    alt="Configurateur 3D ArchiMeuble"
                    width={1200}
                    height={750}
                    className="w-full h-auto relative z-10"
                    priority
                />
              </div>

              {/* Mobile floating cards - Below mockup */}
              <div className="flex gap-3 mt-4 lg:hidden">
                <div className="flex-1 bg-[#1A1917] border border-white/10 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#8B7355] to-[#5B4D3A] rounded-lg flex items-center justify-center shrink-0">
                      <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                      >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#8B7355]">
                        Visualisation
                      </p>
                      <p className="text-xs font-semibold text-white">Haute fidélité</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#8B7355] to-[#5B4D3A] rounded-full flex items-center justify-center shrink-0">
                      <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                      >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#706F6C]">
                        Devis
                      </p>
                      <p className="text-sm font-black text-[#0D0D0C]">Instantané</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === VIDEO SECTION === */}
          <div id="demo" className="mt-32 lg:mt-44">
            {/* Section intro - asymmetric */}
            <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
              <div className="lg:col-span-8">
                <h3
                    data-animate
                    className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] text-white opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
                >
                  Voyez la
                  <span className="text-[#8B7355]"> magie </span>
                  opérer
                </h3>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <p
                    data-animate
                    className="text-[#706F6C] font-medium opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
                >
                  Chaque clic transforme votre idée en réalité.
                  <br />
                  Dimensions, couleurs, finitions — tout est possible.
                </p>
              </div>
            </div>

            {/* Video with creative frame */}
            <div
                data-animate
                className="relative opacity-0 translate-y-8 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-1000"
            >
              {/* Decorative corners */}
              <div className="absolute -top-3 -left-3 w-12 h-12 border-t-2 border-l-2 border-[#8B7355]" />
              <div className="absolute -top-3 -right-3 w-12 h-12 border-t-2 border-r-2 border-[#8B7355]" />
              <div className="absolute -bottom-3 -left-3 w-12 h-12 border-b-2 border-l-2 border-[#8B7355]" />
              <div className="absolute -bottom-3 -right-3 w-12 h-12 border-b-2 border-r-2 border-[#8B7355]" />

              {/* Video container */}
              <div className="relative aspect-video overflow-hidden bg-[#1A1917] rounded-lg">
                {/* Browser chrome */}
                <div className="absolute top-0 inset-x-0 h-10 sm:h-12 bg-[#0D0D0C] border-b border-white/5 flex items-center px-4 z-10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                  </div>
                  <div className="mx-auto px-4 py-1.5 bg-white/5 rounded-md">
                  <span className="text-[10px] text-[#706F6C] font-mono">
                    archimeuble.com/configurator
                  </span>
                  </div>
                  <div className="w-16" /> {/* Spacer for balance */}
                </div>

                {/* Video */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster="/images/accueil image/meubletv.jpg"
                    className="w-full h-full object-cover pt-10 sm:pt-12"
                >
                  <source src="/videos/configurator-demo.mp4" type="video/mp4" />
                </video>

              </div>

              {/* Floating feature cards around video */}
              <div className="hidden lg:block absolute -left-16 top-1/4 transform -translate-y-1/2">
                <div
                    data-animate
                    className="bg-[#1A1917]/90 backdrop-blur-xl border border-white/10 p-4 w-48 opacity-0 -translate-x-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-x-0 transition-all duration-700 delay-300"
                >
                  <div className="w-8 h-8 bg-[#8B7355]/20 rounded-lg flex items-center justify-center mb-3">
                    <svg
                        className="w-4 h-4 text-[#8B7355]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                      <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B7355] mb-1">
                    Cliquez
                  </p>
                  <p className="text-sm text-[#A8A7A3]">
                    Sélectionnez une zone à personnaliser
                  </p>
                </div>
              </div>

              <div className="hidden lg:block absolute -right-16 bottom-1/4 transform translate-y-1/2">
                <div
                    data-animate
                    className="bg-[#1A1917]/90 backdrop-blur-xl border border-white/10 p-4 w-48 opacity-0 translate-x-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-x-0 transition-all duration-700 delay-500"
                >
                  <div className="w-8 h-8 bg-[#8B7355]/20 rounded-lg flex items-center justify-center mb-3">
                    <svg
                        className="w-4 h-4 text-[#8B7355]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                      <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B7355] mb-1">
                    Personnalisez
                  </p>
                  <p className="text-sm text-[#A8A7A3]">Couleurs, portes, tiroirs...</p>
                </div>
              </div>
            </div>
          </div>

          {/* === BOTTOM CTA === */}
          <div
              data-animate
              className="mt-24 lg:mt-32 text-center opacity-0 translate-y-8 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
          >
            <p className="text-[#706F6C] text-lg mb-6">
              Prêt à créer votre meuble unique ?
            </p>
            <Link
                href="/models"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#8B7355] to-[#6B5A45] px-10 py-5 text-white font-bold tracking-wide hover:shadow-[0_0_50px_rgba(139,115,85,0.4)] transition-all duration-300"
            >
              Commencer maintenant
              <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
              >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-in {
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </section>
  );
}