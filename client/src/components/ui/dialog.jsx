import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export const Dialog = DialogPrimitive.Root;
export function DialogContent({ title, description, children }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content">
        <DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className="dialog-close"
        >
          <X size={18} />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
