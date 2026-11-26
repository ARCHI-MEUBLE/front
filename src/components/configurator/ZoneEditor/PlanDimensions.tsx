import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    type RefObject,
    type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { parsePlanLength } from '@/lib/configurator/planDimensions';

// Cotes du plan 2D modifiables : un double-clic (ou deux touchers rapprochés sur écran tactile) sur un nombre
// ouvre un champ posé dessus. Entrée ou ✓ valide, Échap ou ✕ annule, cliquer ailleurs valide.

// Place réservée à la ligne de cote générale, et à la chaîne de cotes (colonnes, niveaux) entre elle et le plan
export const DIMENSION_GUTTER_PX = 28;
export const CHAIN_GUTTER_PX = 22;
const DIMENSION_ARROW_PX = 7;

const DOUBLE_TAP_MS = 400;
const DOUBLE_TAP_PX = 24;

const stop = (event: SyntheticEvent) => event.stopPropagation();

// Double-clic à la souris, double toucher au doigt (tous les navigateurs mobiles n'émettent pas dblclick)
function useDoubleActivation(onActivate: (() => void) | undefined) {
    const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
    if (!onActivate) return {};
    return {
        onDoubleClick: (event: ReactMouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            onActivate();
        },
        onPointerUp: (event: ReactPointerEvent) => {
            if (event.pointerType === 'mouse') return;
            const previous = lastTap.current;
            const isDoubleTap =
                !!previous &&
                event.timeStamp - previous.time < DOUBLE_TAP_MS &&
                Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < DOUBLE_TAP_PX;
            lastTap.current = isDoubleTap ? null : { time: event.timeStamp, x: event.clientX, y: event.clientY };
            if (isDoubleTap) onActivate();
        },
    };
}

// Champ de saisie posé sur le nombre, hors du plan (une petite case le couperait)
function PlanValueEditor({
    anchor,
    initialMm,
    name,
    onDone,
}: {
    anchor: RefObject<HTMLSpanElement | null>;
    initialMm: number;
    name: string;
    // fromKeyboard : Entrée ou Échap, le focus revient sur le nombre (pas après un clic ailleurs, qui garde le sien)
    onDone: (valueMm: number | null, fromKeyboard: boolean) => void;
}) {
    const [text, setText] = useState(String(initialMm));
    const [invalid, setInvalid] = useState(false);
    const [box, setBox] = useState<DOMRect | null>(() => anchor.current?.getBoundingClientRect() ?? null);
    const input = useRef<HTMLInputElement>(null);
    const finished = useRef(false);

    useLayoutEffect(() => {
        input.current?.focus();
        input.current?.select();
    }, []);

    // Le plan défile ou la fenêtre change de taille : le champ suit son nombre
    useEffect(() => {
        const place = () => setBox(anchor.current?.getBoundingClientRect() ?? null);
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [anchor]);

    const finish = (valueMm: number | null, fromKeyboard = false) => {
        if (finished.current) return;
        finished.current = true;
        onDone(valueMm, fromKeyboard);
    };

    const commit = (fromKeyboard = false) => {
        const value = parsePlanLength(text);
        if (value === null) {
            setInvalid(true);
            input.current?.focus();
            return;
        }
        finish(value, fromKeyboard);
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
            event.preventDefault();
            commit(true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(null, true);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            // Flèches : ±1 mm, ±10 mm avec Maj
            event.preventDefault();
            const current = parsePlanLength(text) ?? initialMm;
            const step = (event.shiftKey ? 10 : 1) * (event.key === 'ArrowUp' ? 1 : -1);
            setText(String(Math.max(1, current + step)));
            setInvalid(false);
        }
    };

    if (!box || typeof document === 'undefined') return null;

    // Les boutons ne doivent pas faire perdre le focus au champ avant leur clic (perte de focus = validation)
    const keepFocus = (event: ReactPointerEvent | ReactMouseEvent) => event.preventDefault();

    return createPortal(
        <div
            className="fixed z-[1000] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md bg-white p-1 shadow-[0_6px_24px_rgba(0,0,0,0.18)] ring-2 ring-am-navy"
            style={{ left: box.left + box.width / 2, top: box.top + box.height / 2 }}
            onClick={stop}
            onDoubleClick={stop}
            onPointerDown={stop}
            onPointerUp={stop}
            onKeyDown={stop}
            data-plan-editor="true"
        >
            <label className="flex items-baseline gap-1 pl-1">
                <span className="sr-only">{name}</span>
                <input
                    ref={input}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    autoComplete="off"
                    value={text}
                    aria-invalid={invalid || undefined}
                    title="Flèches haut et bas : ±1 mm (±10 mm avec Maj)"
                    onChange={(event) => {
                        setText(event.target.value);
                        setInvalid(false);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => finish(parsePlanLength(text))}
                    className={`w-[6ch] rounded-sm bg-transparent text-right font-mono text-base text-black outline-none sm:text-sm ${
                        invalid ? 'text-am-wine underline decoration-am-wine decoration-wavy' : ''
                    }`}
                />
                <span className="font-mono text-xs text-black/65">mm</span>
            </label>
            <button
                type="button"
                aria-label="Valider"
                title="Valider (Entrée)"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => commit()}
                className="flex h-7 w-7 items-center justify-center rounded bg-am-navy text-white hover:bg-am-navy/85"
            >
                <Check className="h-4 w-4" />
            </button>
            <button
                type="button"
                aria-label="Annuler"
                title="Annuler (Échap)"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => finish(null)}
                className="flex h-7 w-7 items-center justify-center rounded text-black/65 hover:bg-black/5 hover:text-black"
            >
                <X className="h-4 w-4" />
            </button>
            {invalid && (
                <span className="absolute left-0 top-full mt-1 whitespace-nowrap rounded bg-am-wine px-1.5 py-0.5 text-[11px] text-white shadow">
                    Tapez une longueur, par exemple 450 ou 45 cm
                </span>
            )}
        </div>,
        document.body
    );
}

export interface PlanValueProps {
    valueMm: number;
    // Nom de la cote, pour l'infobulle et les lecteurs d'écran : « Largeur du meuble »
    name: string;
    // Texte affiché (la valeur seule par défaut)
    children?: ReactNode;
    // Nouvelle valeur saisie. Absent : la cote se lit seulement
    onCommit?: (valueMm: number) => void;
    // Cote que le plan ne règle pas : la raison s'affiche au survol et au double-clic
    lockedReason?: string;
    // Sur fond foncé (case sélectionnée) : le survol s'éclaire en blanc
    onDark?: boolean;
    // Les clics ne remontent pas jusqu'au plan (cotes hors des cases : un clic désélectionnerait tout)
    isolateClicks?: boolean;
    className?: string;
    style?: CSSProperties;
    dimension?: string;
}

// Nombre d'une cote du plan : modifiable au double-clic, ou expliqué s'il ne se règle pas ici
export function PlanValue({
    valueMm,
    name,
    children,
    onCommit,
    lockedReason,
    onDark = false,
    isolateClicks = false,
    className = '',
    style,
    dimension,
}: PlanValueProps) {
    const anchor = useRef<HTMLSpanElement>(null);
    const [editing, setEditing] = useState(false);
    const activate = onCommit ? () => setEditing(true) : lockedReason ? () => toast(lockedReason, { id: name }) : undefined;
    const activation = useDoubleActivation(activate);

    const affordance = onCommit
        ? `cursor-text hover:outline hover:outline-1 hover:outline-offset-1 focus-visible:outline focus-visible:outline-2 ${
              onDark ? 'hover:bg-white/20 hover:outline-white/70 focus-visible:outline-white' : 'hover:bg-white hover:outline-am-navy/50 focus-visible:outline-am-navy'
          }`
        : '';
    const title = onCommit
        ? `${name} : ${valueMm} mm. Double-cliquez pour modifier`
        : lockedReason
          ? `${name} : ${valueMm} mm. ${lockedReason}`
          : undefined;

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
        if (!onCommit || (event.key !== 'Enter' && event.key !== 'F2')) return;
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    return (
        <>
            <span
                ref={anchor}
                role={onCommit ? 'button' : undefined}
                tabIndex={onCommit ? 0 : undefined}
                aria-label={onCommit ? `${name} : ${valueMm} mm, double-cliquez ou appuyez sur Entrée pour modifier` : undefined}
                title={title}
                data-dimension={dimension}
                data-editable={onCommit ? 'true' : undefined}
                className={`rounded-[3px] transition-colors ${affordance} ${editing ? 'invisible' : ''} ${className}`}
                style={{ touchAction: activate ? 'manipulation' : undefined, ...style }}
                onClick={isolateClicks ? stop : undefined}
                onKeyDown={handleKeyDown}
                {...activation}
            >
                {children ?? valueMm}
            </span>
            {editing && (
                <PlanValueEditor
                    anchor={anchor}
                    initialMm={valueMm}
                    name={name}
                    onDone={(next, fromKeyboard) => {
                        setEditing(false);
                        if (next !== null && next !== valueMm) onCommit?.(next);
                        if (fromKeyboard) requestAnimationFrame(() => anchor.current?.focus({ preventScroll: true }));
                    }}
                />
            )}
        </>
    );
}

// Halo de la cote générale en cours de réglage : pastille blanche bordée de navy, légèrement lumineuse
const LINE_GLOW = 'bg-white font-bold ring-1 ring-am-navy shadow-[0_0_10px_2px_rgba(59,62,88,0.45)]';

// Ligne de cote « à l'architecte » : traits de rappel depuis les bords du plan, puis ligne à double flèche
// portant la mesure, comme sur un plan technique
export function DimensionLine({
    length,
    valueMm,
    name,
    orientation,
    highlighted = false,
    onCommit,
}: {
    length: number;
    valueMm: number;
    name: string;
    orientation: 'horizontal' | 'vertical';
    // La dimension est en cours de réglage (champ Largeur ou Hauteur du meuble) : la cote s'éclaire
    highlighted?: boolean;
    onCommit?: (valueMm: number) => void;
}) {
    const id = useId();
    const markerId = `dim-arrow-${orientation}-${id}`;
    const axisLength = Math.max(1, length);
    const arrow = DIMENSION_ARROW_PX;
    const gutter = DIMENSION_GUTTER_PX;
    const lineAt = gutter - 6;
    const tone = highlighted ? 'text-am-navy' : 'text-black/55';
    const isHorizontal = orientation === 'horizontal';

    const label = (
        <PlanValue
            valueMm={valueMm}
            name={name}
            onCommit={onCommit}
            isolateClicks
            className={`inline-block px-1 py-px font-mono text-[11px] leading-tight ${highlighted ? LINE_GLOW : ''}`}
            style={isHorizontal ? undefined : { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
            {valueMm} mm
        </PlanValue>
    );

    return (
        <div
            className={`relative shrink-0 transition-colors ${tone}`}
            style={isHorizontal ? { width: axisLength, height: gutter } : { width: gutter, height: axisLength }}
            data-highlighted={highlighted || undefined}
        >
            <svg
                width={isHorizontal ? axisLength : gutter}
                height={isHorizontal ? gutter : axisLength}
                className="absolute inset-0 block"
                style={{ overflow: 'visible' }}
                aria-hidden="true"
            >
                <defs>
                    <marker id={markerId} markerWidth={arrow} markerHeight={arrow} refX={arrow / 2} refY={arrow / 2} orient="auto-start-reverse">
                        <path d={`M0,0 L${arrow},${arrow / 2} L0,${arrow} Z`} className="fill-current" />
                    </marker>
                </defs>
                {isHorizontal ? (
                    <>
                        <line x1={0} y1={0} x2={0} y2={lineAt} className="stroke-current" strokeWidth={1} />
                        <line x1={axisLength} y1={0} x2={axisLength} y2={lineAt} className="stroke-current" strokeWidth={1} />
                        <line x1={1} y1={lineAt} x2={axisLength - 1} y2={lineAt} className="stroke-current" strokeWidth={1}
                            markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
                    </>
                ) : (
                    <>
                        <line x1={0} y1={0} x2={lineAt} y2={0} className="stroke-current" strokeWidth={1} />
                        <line x1={0} y1={axisLength} x2={lineAt} y2={axisLength} className="stroke-current" strokeWidth={1} />
                        <line x1={lineAt} y1={1} x2={lineAt} y2={axisLength - 1} className="stroke-current" strokeWidth={1}
                            markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
                    </>
                )}
            </svg>
            <div
                className="absolute"
                style={
                    isHorizontal
                        ? { left: '50%', bottom: gutter - lineAt + 2, transform: 'translateX(-50%)' }
                        : { top: '50%', right: gutter - lineAt + 2, transform: 'translateY(-50%)' }
                }
            >
                {label}
            </div>
        </div>
    );
}

export interface ChainItem {
    key: string;
    startPx: number;
    endPx: number;
    valueMm: number;
    name: string;
    onCommit?: (valueMm: number) => void;
    lockedReason?: string;
}

// Largeur approximative d'une étiquette en police mono de 10 px
const chainLabelPx = (valueMm: number) => String(valueMm).length * 6.2 + 6;

// Chaîne de cotes : un trait continu, un repère oblique à chaque limite (colonne, niveau, arrondi, socle) et la
// mesure de chaque segment. Une mesure trop large pour son segment est retirée (elle reste dans l'infobulle).
export function DimensionChain({
    orientation,
    length,
    items,
}: {
    orientation: 'horizontal' | 'vertical';
    length: number;
    items: ChainItem[];
}) {
    const gutter = CHAIN_GUTTER_PX;
    const lineAt = gutter - 6;
    const isHorizontal = orientation === 'horizontal';
    const limits = Array.from(new Set(items.flatMap((item) => [item.startPx, item.endPx])));

    return (
        <div
            className="relative shrink-0 text-black/45"
            style={isHorizontal ? { width: length, height: gutter } : { width: gutter, height: length }}
            data-dimension-chain={orientation}
        >
            <svg
                width={isHorizontal ? length : gutter}
                height={isHorizontal ? gutter : length}
                className="absolute inset-0 block"
                style={{ overflow: 'visible' }}
                aria-hidden="true"
            >
                {isHorizontal ? (
                    <line x1={0} y1={lineAt} x2={length} y2={lineAt} className="stroke-current" strokeWidth={0.75} />
                ) : (
                    <line x1={lineAt} y1={0} x2={lineAt} y2={length} className="stroke-current" strokeWidth={0.75} />
                )}
                {limits.map((at) =>
                    isHorizontal ? (
                        <g key={at}>
                            <line x1={at} y1={lineAt - 4} x2={at} y2={gutter} className="stroke-current" strokeWidth={0.75} />
                            <line x1={at - 3} y1={lineAt + 3} x2={at + 3} y2={lineAt - 3} className="stroke-current" strokeWidth={1.25} />
                        </g>
                    ) : (
                        <g key={at}>
                            <line x1={lineAt - 4} y1={at} x2={gutter} y2={at} className="stroke-current" strokeWidth={0.75} />
                            <line x1={lineAt - 3} y1={at + 3} x2={lineAt + 3} y2={at - 3} className="stroke-current" strokeWidth={1.25} />
                        </g>
                    )
                )}
            </svg>
            {items.map((item) => {
                const span = item.endPx - item.startPx;
                if (span < chainLabelPx(item.valueMm)) return null;
                const middle = (item.startPx + item.endPx) / 2;
                return (
                    <div
                        key={item.key}
                        className="absolute"
                        style={
                            isHorizontal
                                ? { left: middle, bottom: gutter - lineAt + 1, transform: 'translateX(-50%)' }
                                : { top: middle, right: gutter - lineAt + 1, transform: 'translateY(-50%)' }
                        }
                    >
                        <PlanValue
                            valueMm={item.valueMm}
                            name={item.name}
                            onCommit={item.onCommit}
                            lockedReason={item.lockedReason}
                            isolateClicks
                            className={`inline-block px-0.5 font-mono text-[10px] leading-tight ${item.onCommit ? 'text-black/70' : 'text-black/45'}`}
                            style={isHorizontal ? undefined : { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
