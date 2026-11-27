import { type ReactNode, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/context';

interface Props {
  title: string;
  onClose: () => void;
  /** While false, Escape and the close button do nothing: a payment is being confirmed. */
  closable?: boolean;
  children: ReactNode;
}

/** A centred dialog on a wide screen, a full-height sheet on a phone. Built on <dialog>, so focus stays inside. */
export function Modal({ title, onClose, closable = true, children }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (closable) onClose();
      }}
    >
      <header className="modal__header">
        <h2>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} disabled={!closable} aria-label={t('close')}>
          ✕
        </button>
      </header>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}
