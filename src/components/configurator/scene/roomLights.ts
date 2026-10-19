import { createContext, useContext } from 'react';

// Éclairage de la pièce (Salon, Chambre) : true = lampes allumées, ambiance du soir ; false = lampes
// éteintes, lumière du jour. null hors de ces pièces (studio neutre) : la lampe décorative garde son
// éclairage d'origine.
export const RoomLightsContext = createContext<boolean | null>(null);

export const useRoomLights = () => useContext(RoomLightsContext);

// Lumière chaude des ampoules
export const WARM_LIGHT = '#FFD6A0';
