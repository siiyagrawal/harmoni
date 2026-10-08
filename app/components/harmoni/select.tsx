import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Icon, type IconName } from "./ui";

export type SelectOption<T extends string> = { value: T; label: string };

// App-styled dropdown that replaces native <select>, whose open menu can't follow the design.
// "row" sits label and value on one line; "field" stacks a label above a full-width control;
// "pill" is a compact inline control.
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  variant = "row",
  ariaLabel,
  className = "",
}: {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  label?: string;
  icon?: IconName;
  variant?: "row" | "field" | "pill";
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placeAbove, setPlaceAbove] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const typed = useRef({ text: "", at: 0 });
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function show() {
    // Open upward when there isn't room below (the bottom navigation covers the last ~110px).
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPlaceAbove(window.innerHeight - rect.bottom < 280 && rect.top > window.innerHeight - rect.bottom);
      // Compact menus are wider than their trigger; anchor them to the right edge when space runs out.
      setAlignRight(rect.left + 200 > window.innerWidth);
    }
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase(), at: now };
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.current.text));
      if (match >= 0) setActive(match);
    }
  }

  const labelId = `${id}-label`;
  return (
    <div ref={rootRef} className={`hs-select hs-${variant}${open ? " open" : ""} ${className}`.trim()}>
      {label && variant === "field" ? <span className="hs-select-field-label" id={labelId}>{label}</span> : null}
      <button
        ref={buttonRef}
        type="button"
        className="hs-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel ?? (label ? `${label}: ${selected?.label ?? ""}` : undefined)}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        {icon && variant === "row" ? <Icon name={icon} size={17} /> : null}
        {label && variant === "row" ? <span className="hs-select-label" id={labelId}>{label}</span> : null}
        <span className="hs-select-value">{selected?.label}</span>
        <span className="hs-select-chevron" aria-hidden="true"><Icon name="chevron" size={15} strokeWidth={2.2} /></span>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          className={`hs-select-menu${placeAbove ? " above" : ""}${alignRight ? " align-right" : ""}`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-activedescendant={`${id}-option-${active}`}
          onKeyDown={onKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              className={`${index === active ? "active" : ""}${option.value === value ? " selected" : ""}`}
              onPointerEnter={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value ? <Icon name="check" size={16} strokeWidth={2.4} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Shorthand for lists where the label and value are the same text.
export function plainOptions<T extends string>(values: ReadonlyArray<T>): SelectOption<T>[] {
  return values.map((value) => ({ value, label: value }));
}
