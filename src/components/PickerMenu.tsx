import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

export interface PickerOption {
  value: string;
  label: ReactNode;
  /** Shown at the row's start, in a fixed-width column: a currency's symbol. */
  lead?: string;
  /** Shown dimmed at the row's end: a code beside a name. */
  hint?: string;
}

interface Props {
  ariaLabel: string;
  heading: string;
  trigger: ReactNode;
  options: PickerOption[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * A pill that opens a list to pick one value from, as Atli's sites have for
 * language and currency. Arrow keys move, Enter picks, and Escape or a click
 * elsewhere closes it and hands focus back to the pill.
 */
export function PickerMenu({ ariaLabel, heading, trigger, options, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const close = (focus: boolean) => {
    setOpen(false);
    if (focus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const pick = (value: string) => {
    onSelect(value);
    close(true);
  };

  return (
    <div ref={root} className="picker">
      <button
        ref={button}
        type="button"
        className="picker__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setActive(
            Math.max(
              0,
              options.findIndex((o) => o.value === selected),
            ),
          );
          setOpen((value) => !value);
        }}
      >
        {trigger}
        <svg viewBox="0 0 12 12" aria-hidden className={`picker__chevron${open ? ' is-open' : ''}`}>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="picker__menu">
          <p className="picker__heading">{heading}</p>
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={heading}
            tabIndex={-1}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, options.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick(options[active].value);
              } else if (e.key === 'Escape' || e.key === 'Tab') {
                e.preventDefault();
                close(true);
              }
            }}
          >
            {options.map((option, i) => {
              const isSelected = option.value === selected;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`picker__option${i === active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(option.value)}
                >
                  {option.lead !== undefined ? <span className="picker__lead">{option.lead}</span> : null}
                  <span className="picker__label">{option.label}</span>
                  {option.hint ? <span className="picker__hint">{option.hint}</span> : null}
                  <svg viewBox="0 0 16 16" aria-hidden className="picker__check">
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
