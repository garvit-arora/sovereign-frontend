import { useEffect, useRef, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

export function WorkspaceModal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={`workspace-dialog ${wide ? 'wide' : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        {onClose && (
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={20} />
          </button>
        )}
      </div>
      <div className="dialog-content">{children}</div>
    </dialog>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  return (
    <WorkspaceModal title={title} onClose={busy ? undefined : onClose}>
      <p className="confirm-message">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'primary-button danger-button' : 'primary-button'}
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? <Loader2 size={16} className="spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </WorkspaceModal>
  )
}
