// Coche posée sur le coin d'une couleur choisie. La couleur reste visible telle quelle : un voile sombre
// par-dessus la faisait paraître plus foncée que dans le reste de l'interface (puce de la partie, 3D…)
export default function ColorCheckBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-am-navy text-white ring-2 ring-white"
    >
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
