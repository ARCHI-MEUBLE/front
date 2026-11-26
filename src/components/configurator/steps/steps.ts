export type ConfigStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Ordre du parcours : du global (taille) au local (compartiments), puis matières et finitions
export const STEP = {
  DIMENSIONS: 1,
  BASE_AND_EDGES: 2,
  DIVISION: 3,
  DOORS: 4,
  DRAWERS: 5,
  MATERIALS: 6,
  FINISHES: 7,
} as const satisfies Record<string, ConfigStep>;

export interface StepDefinition {
  id: ConfigStep;
  label: string;
  title: string;
  hint: string;
  // Vue affichée par défaut dans le viewer quand on arrive sur l'étape
  view: 'plan' | '3d';
}

export const CONFIG_STEPS: StepDefinition[] = [
  {
    id: STEP.DIMENSIONS,
    label: 'Dimensions',
    title: 'Taille de votre meuble',
    hint: 'Commencez par la taille : largeur, profondeur et hauteur en millimètres.',
    view: '3d',
  },
  {
    id: STEP.BASE_AND_EDGES,
    label: 'Base & bords',
    title: 'Base & bords',
    hint: 'Réglez le socle et les bords du meuble.',
    view: '3d',
  },
  {
    id: STEP.DIVISION,
    label: 'Division',
    title: "Divisez l'intérieur",
    hint: 'Réglez le nombre de colonnes et d\'étagères, ou cliquez sur une zone pour la diviser à part.',
    view: '3d',
  },
  {
    id: STEP.DOORS,
    label: 'Portes',
    title: 'Portes',
    hint: 'Habillez chaque compartiment, puis choisissez le montage des façades.',
    view: '3d',
  },
  {
    id: STEP.DRAWERS,
    label: 'Tiroirs',
    title: 'Tiroirs',
    hint: 'Réglez les tiroirs du meuble.',
    view: '3d',
  },
  {
    id: STEP.MATERIALS,
    label: 'Matières',
    title: 'Matières & couleurs',
    hint: 'Choisissez la matière, puis la couleur de chaque partie du meuble.',
    view: '3d',
  },
  {
    id: STEP.FINISHES,
    label: 'Finitions',
    title: 'Poignées, pieds & accessoires',
    hint: 'Dernières touches : poignées, pieds, éclairage, penderie, puis vérifiez le récapitulatif.',
    view: '3d',
  },
];

export const LAST_STEP: ConfigStep = STEP.FINISHES;
