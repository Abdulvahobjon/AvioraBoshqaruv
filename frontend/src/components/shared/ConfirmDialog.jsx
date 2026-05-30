import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Tasdiqlash', message, confirmText = "Ha, o'chirish", loading }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-sub">{message}</p>
    </Dialog>
  );
}
