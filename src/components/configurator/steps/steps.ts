export type ConfigStep = 1 | 2 | 3 | 4 | 5;

// Ordre du parcours : du global (taille) au local (compartiments), puis matières et finitions
export const STEP = {
  DIMENSIONS: 1,
  DIVISION: 2,
  DOORS: 3,
  MATERIALS: 4,
  FINISHES: 5,
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
    id: STEP.DIVISION,
    label: 'Division',
    title: "Divisez l'intérieur",
    hint: 'Réglez le nombre de colonnes et d\'étagères, ou cliquez sur une zone pour la diviser à part.',
    view: '3d',
  },
  {
    id: STEP.DOORS,
    label: 'Portes',
    title: 'Portes, tiroirs & poignées',
    hint: 'Habillez chaque compartiment, puis choisissez le montage et les poignées.',
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
    title: 'Pieds & accessoires',
    hint: 'Dernières touches : pieds, éclairage, penderie, puis vérifiez le récapitulatif.',
    view: '3d',
  },
];

export const LAST_STEP: ConfigStep = STEP.FINISHES;
