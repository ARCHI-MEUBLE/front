import { Hammer, PaintRoller, Ruler, type LucideIcon } from "lucide-react";

const SAVOIR_FAIRE_STEPS: { title: string; text: string; Icon: LucideIcon }[] = [
  // { title: "Conception", text: "Plans 3D sur mesure", Icon: PencilRuler },
  { title: "Fabrication", text: "Atelier français", Icon: Hammer },
  { title: "Finitions", text: "Qualité artisanale", Icon: PaintRoller },
  { title: "Installation", text: "Pose soignée", Icon: Ruler },
];

// Une ligne par étape : trois éléments dans une grille à deux colonnes laissaient le dernier seul sur sa rangée
export function SavoirFaireStepsList() {
  return (
    <ul className="m-0 flex list-none flex-col gap-8 p-0">
      {SAVOIR_FAIRE_STEPS.map(({ title, text, Icon }) => (
        <li key={title} className="flex items-center gap-5">
          <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-[10px] bg-am-mist">
            <Icon className="h-7 w-7 text-black" strokeWidth={1.6} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="m-0 text-subheading text-black">{title}</h3>
            <p className="m-0 text-[17px] text-black/85">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
