import { useState } from 'react';
import { nextSlidingDirection, type SlidingDirection } from '@/lib/configurator/slidingDoor';

// Sens d'ouverture d'une porte coulissante : vers la droite la première fois, puis il change à chaque fermeture (une
// fois sur deux à droite, une fois sur deux à gauche). Ajusté pendant le rendu, comme le recommande React pour un état
// qui suit une prop : pas d'image intermédiaire dans le mauvais sens.
export function useSlidingDirection(isOpen: boolean): SlidingDirection {
    const [state, setState] = useState<{ wasOpen: boolean; direction: SlidingDirection }>({ wasOpen: isOpen, direction: 'right' });
    if (state.wasOpen !== isOpen) {
        const direction = nextSlidingDirection(state.direction, state.wasOpen, isOpen);
        setState({ wasOpen: isOpen, direction });
        return direction;
    }
    return state.direction;
}
