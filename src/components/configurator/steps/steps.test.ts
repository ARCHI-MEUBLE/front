import { describe, expect, it } from 'vitest';
import { CONFIG_STEPS, LAST_STEP, STEP } from './steps';

describe('configurator steps', () => {
  it('gives the handles their own step 7, before the finishes in step 8', () => {
    expect(CONFIG_STEPS.map((step) => step.label)).toEqual([
      'Dimensions',
      'Base & bords',
      'Division',
      'Portes',
      'Tiroirs',
      'Matières',
      'Poignées',
      'Finitions',
    ]);
    expect(STEP.HANDLES).toBe(7);
    expect(STEP.FINISHES).toBe(8);
    expect(LAST_STEP).toBe(STEP.FINISHES);
  });

  it('numbers the steps 1 to 8 in order, as the page reads CONFIG_STEPS[step - 1]', () => {
    CONFIG_STEPS.forEach((step, index) => expect(step.id).toBe(index + 1));
  });
});
