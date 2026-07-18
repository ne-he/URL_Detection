import { useEffect, useRef } from "react";

const INTERACTIVE_TAGS = new Set(["BUTTON", "A", "INPUT", "LABEL"]);

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  const isCoarsePointer =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    if (isCoarsePointer) return;

    const el = cursorRef.current;
    if (!el) return;

    document.body.style.cursor = "none";

    const onMouseMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (INTERACTIVE_TAGS.has(target.tagName) || target.dataset.interactive !== undefined) {
        el.classList.add("cursor-hover");
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (INTERACTIVE_TAGS.has(target.tagName) || target.dataset.interactive !== undefined) {
        el.classList.remove("cursor-hover");
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOut);

    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOut);
    };
  }, [isCoarsePointer]);

  if (isCoarsePointer) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      style={{ left: "-100px", top: "-100px" }}
    />
  );
}
