import { useEffect, useId, useRef, useState } from 'react';
import './ActionMenu.scss';

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

// "More" button with a small popup list of rarely used actions.
function ActionMenu({
  label,
  items,
}: {
  label: string;
  items: ActionMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    // Меню, открытое с клавиатуры, сразу даёт фокус первому пункту.
    if (document.activeElement === triggerRef.current && triggerRef.current?.matches(':focus-visible')) {
      rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  // Стрелки, Home и End ходят по пунктам меню; Tab закрывает его.
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const entries = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => {
      event.preventDefault();
      entries[(next + entries.length) % entries.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index <= 0 ? entries.length - 1 : index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(entries.length - 1);
    else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div className="action-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`runs__button runs__button--secondary runs__button--small${open ? ' is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
      </button>
      {open && (
        <ul className="action-menu__list" id={menuId} role="menu" onKeyDown={onMenuKeyDown}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={`action-menu__item${item.danger ? ' action-menu__item--danger' : ''}`}
                onClick={() => {
                  setOpen(false);
                  // Фокус остаётся на кнопке меню: окно, открытое пунктом, вернёт его туда.
                  triggerRef.current?.focus();
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ActionMenu;
