import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedPlanLinks } from './saved-plan-links';

export function SharePlanDialog({
  onClose,
  returnFocusRef,
  ...links
}: {
  publicUrl: string;
  manageUrl: string;
  notice: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    // Async saving disables the opener, so activeElement may change before the popup opens.
    const opener = returnFocusRef.current!;
    const overflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    element.querySelector<HTMLHeadingElement>('#saved-plan-heading')!.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      document.documentElement.style.overflow = rootOverflow;
      opener.focus();
    };
  }, [returnFocusRef]);

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function isBackdrop(event: MouseEvent<HTMLDialogElement> | PointerEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }

  function dismissFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    // A selection or drag that starts inside the popup must not dismiss it on release.
    const dismiss = pressedBackdrop.current && isBackdrop(event);
    pressedBackdrop.current = false;
    if (dismiss) onClose();
  }

  return (
    <dialog
      ref={dialog}
      id="plan-sharing-dialog"
      className="share-plan-dialog"
      aria-labelledby="saved-plan-heading"
      onCancel={onClose}
      onKeyDown={keepFocusInside}
      onPointerDown={(event) => {
        pressedBackdrop.current = isBackdrop(event);
      }}
      onClick={dismissFromBackdrop}
    >
      <div className="share-dialog-heading">
        <Button
          className="share-dialog-close"
          variant="ghost"
          aria-label="Close sharing options"
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </Button>
        <h2 id="saved-plan-heading" className="saved-plan-title" tabIndex={-1}>
          <Check size={20} aria-hidden="true" /> Your plan is saved
        </h2>
      </div>
      <SavedPlanLinks {...links} />
    </dialog>
  );
}
