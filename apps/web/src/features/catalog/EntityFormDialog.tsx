import { useId, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Notice } from '../../components/ui/States';

type EntityFormDialogProps = {
  title: string;
  submitLabel: string;
  submitting: boolean;
  formError: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
};

/** Diálogo modal con formulario: error general, cancelar y guardar. */
export function EntityFormDialog({
  title,
  submitLabel,
  submitting,
  formError,
  onSubmit,
  onCancel,
  children,
}: EntityFormDialogProps) {
  const formId = useId();
  return (
    <Dialog
      open
      onClose={() => {
        if (!submitting) onCancel();
      }}
      title={title}
      footer={
        <>
          <Button onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={submitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="form-grid"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {formError && <Notice tone="danger">{formError}</Notice>}
        {children}
      </form>
    </Dialog>
  );
}
