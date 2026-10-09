import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  defaultX: number;
  defaultY: number;
  defaultWidth: number;
  defaultHeight: number;
  onDragStop: (x: number, y: number) => void;
  onResizeStop: (width: number, height: number, x: number, y: number) => void;
  children: ReactNode;
  theme: string;
};
const cursors = {
  tl: "nwse",
  tr: "nesw",
  bl: "nesw",
  br: "nwse",
  t: "ns",
  b: "ns",
  l: "ew",
  r: "ew",
};
export default function DraggableResizable({
  defaultX,
  defaultY,
  defaultWidth,
  defaultHeight,
  onDragStop,
  onResizeStop,
  children,
  theme,
}: Props) {
  const [bounds, setBounds] = useState({
    x: defaultX,
    y: defaultY,
    w: defaultWidth,
    h: defaultHeight,
  });
  const latest = useRef(bounds);
  const action = useRef<{
    x: number;
    y: number;
    bounds: typeof bounds;
    direction?: keyof typeof cursors;
  } | null>(null);
  const update = (next: typeof bounds) => {
    latest.current = next;
    setBounds(next);
  };
  useEffect(() => {
    update({ x: defaultX, y: defaultY, w: defaultWidth, h: defaultHeight });
  }, [defaultX, defaultY, defaultWidth, defaultHeight]);
  const start = (
    event: PointerEvent<HTMLDivElement>,
    direction?: keyof typeof cursors,
  ) => {
    if (
      event.button !== 0 ||
      action.current ||
      (!direction && (event.target as Element).closest("button"))
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    action.current = {
      x: event.clientX,
      y: event.clientY,
      bounds: latest.current,
      direction,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = action.current;
    if (!current) return;
    event.stopPropagation();
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    const { bounds: initial, direction } = current;
    if (!direction) {
      update({
        ...initial,
        x: Math.max(0, initial.x + dx),
        y: Math.max(0, initial.y + dy),
      });
      return;
    }
    const next = { ...initial };
    if (direction.includes("r")) next.w = Math.max(160, initial.w + dx);
    if (direction.includes("b")) next.h = Math.max(240, initial.h + dy);
    if (direction.includes("l")) {
      next.x = Math.min(
        initial.x + initial.w - 160,
        Math.max(0, initial.x + dx),
      );
      next.w = initial.w + initial.x - next.x;
    }
    if (direction.includes("t")) {
      next.y = Math.min(
        initial.y + initial.h - 240,
        Math.max(0, initial.y + dy),
      );
      next.h = initial.h + initial.y - next.y;
    }
    update(next);
  };
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    const current = action.current;
    if (!current) return;
    event.stopPropagation();
    action.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const { x, y, w, h } = latest.current;
    if (
      x === current.bounds.x &&
      y === current.bounds.y &&
      w === current.bounds.w &&
      h === current.bounds.h
    )
      return;
    if (current.direction) onResizeStop(w, h, x, y);
    else onDragStop(x, y);
  };
  const cancel = () => {
    if (action.current) update(action.current.bounds);
    action.current = null;
  };
  return (
    <div
      style={{
        position: "absolute",
        left: bounds.x,
        top: bounds.y,
        width: bounds.w,
        height: bounds.h,
        touchAction: "none",
      }}
      onPointerDown={(event) => start(event)}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerCancel={cancel}
    >
      {(Object.keys(cursors) as (keyof typeof cursors)[]).map((direction) => (
        <div
          key={direction}
          className={`resize-handle ${theme}`}
          onPointerDown={(event) => start(event, direction)}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={cancel}
          style={{
            position: "absolute",
            width: ["t", "b"].includes(direction) ? "calc(100% - 16px)" : 8,
            height: ["l", "r"].includes(direction) ? "calc(100% - 16px)" : 8,
            top: direction.includes("t")
              ? 0
              : direction.includes("b")
                ? undefined
                : 8,
            bottom: direction.includes("b") ? 0 : undefined,
            left: direction.includes("l")
              ? 0
              : direction.includes("r")
                ? undefined
                : 8,
            right: direction.includes("r") ? 0 : undefined,
            cursor: `${cursors[direction]}-resize`,
            zIndex: 2,
          }}
        />
      ))}
      {children}
    </div>
  );
}
