import { toast, type Id, type TypeOptions } from 'react-toastify';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

const TONE_TYPE: Record<ToastTone, TypeOptions> = {
  success: 'success',
  danger: 'error',
  info: 'info',
  warning: 'warning',
};

/** More than this on screen at once gets unreadable — FIFO: a new toast
 * past the cap closes the oldest one immediately instead of queueing. */
const MAX_TOASTS = 3;
const activeIds: Id[] = [];

export function pushToast({
  tone,
  title,
  description,
}: {
  tone: ToastTone;
  title: string;
  description?: string;
}) {
  // A plain element, not a Fragment: react-toastify clones whatever's passed
  // here and injects props like `closeToast` onto it, and Fragment rejects
  // any prop besides key/children — hence the wrapping <div>.
  const id = toast(
    <div>
      <div className="toastTitle">{title}</div>
      {description && <div className="toastDescription">{description}</div>}
    </div>,
    {
      type: TONE_TYPE[tone],
      onClose: () => {
        const i = activeIds.indexOf(id);
        if (i !== -1) activeIds.splice(i, 1);
      },
    },
  );

  activeIds.push(id);
  if (activeIds.length > MAX_TOASTS) {
    const oldest = activeIds.shift();
    // Dismissing in the same tick the toast was created races react-toastify's
    // own container registration and silently no-ops — defer one tick instead.
    if (oldest !== undefined) setTimeout(() => toast.dismiss(oldest), 0);
  }
}
