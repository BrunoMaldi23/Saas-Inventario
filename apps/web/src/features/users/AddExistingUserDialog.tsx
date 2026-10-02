import { addMembershipByEmail } from '@inventario/api-client';
import type { RoleOption } from '@inventario/types';
import { Field, Input, Select } from '../../components/ui/Field';
import { Notice } from '../../components/ui/States';
import { roleLabel } from '../../session/types';
import { EntityFormDialog } from '../catalog/EntityFormDialog';
import { memberByEmailSpec } from '../catalog/specs';
import { useEntityForm } from '../catalog/useEntityForm';
import { addExistingMessages } from './userMessages';

type AddExistingUserDialogProps = {
  roles: RoleOption[];
  onCancel: () => void;
  onAdded: () => void;
};

/**
 * Agrega a la cuenta activa una persona que ya tiene usuario en
 * InventarioSaaS, por coincidencia exacta de correo. No hay búsqueda ni
 * directorio de usuarios (contrato).
 */
export function AddExistingUserDialog({
  roles,
  onCancel,
  onAdded,
}: AddExistingUserDialogProps) {
  const form = useEntityForm({
    spec: memberByEmailSpec,
    record: null,
    create: addMembershipByEmail,
    messages: addExistingMessages,
    onSaved: onAdded,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title="Agregar usuario existente"
      submitLabel="Agregar a la cuenta"
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      <Notice tone="info">
        Úsalo cuando la persona ya tiene usuario en InventarioSaaS (por ejemplo,
        en otra cuenta). Escribe su correo exacto.
      </Notice>
      <Field label="Correo" error={fieldError('email')}>
        {(props) => (
          <Input
            {...props}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={values.email}
            maxLength={254}
            onChange={(e) => setField('email', e.target.value)}
            autoFocus
          />
        )}
      </Field>
      <Field label="Rol en esta cuenta" error={fieldError('roleId')}>
        {(props) => (
          <Select
            {...props}
            value={values.roleId}
            onChange={(e) => setField('roleId', e.target.value)}
          >
            <option value="" disabled>
              Selecciona un rol
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {roleLabel(role.name)}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </EntityFormDialog>
  );
}
