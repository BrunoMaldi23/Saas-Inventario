import { createUser } from '@inventario/api-client';
import { Field, Input, Select } from '../../components/ui/Field';
import type { RoleOption } from '../../lib/apiTypes';
import { roleLabel } from '../../session/types';
import { EntityFormDialog } from '../catalog/EntityFormDialog';
import { userSpec } from '../catalog/specs';
import { useEntityForm } from '../catalog/useEntityForm';
import { createUserMessages } from './userMessages';

type CreateUserDialogProps = {
  roles: RoleOption[];
  onCancel: () => void;
  onCreated: () => void;
};

/** Crea una identidad nueva con su membresía en la cuenta activa. */
export function CreateUserDialog({
  roles,
  onCancel,
  onCreated,
}: CreateUserDialogProps) {
  const form = useEntityForm({
    spec: userSpec,
    record: null,
    create: createUser,
    messages: createUserMessages,
    onSaved: onCreated,
  });
  const { values, setField, fieldError } = form;

  return (
    <EntityFormDialog
      title="Nuevo usuario"
      submitLabel="Crear usuario"
      submitting={form.submitting}
      formError={form.formError}
      onSubmit={() => void form.submit()}
      onCancel={onCancel}
    >
      <Field label="Nombre" error={fieldError('name')}>
        {(props) => (
          <Input
            {...props}
            value={values.name}
            maxLength={120}
            autoComplete="off"
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        )}
      </Field>
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
          />
        )}
      </Field>
      <div className="form-row">
        <Field
          label="Contraseña inicial"
          hint="Mínimo 8 caracteres. Compártela de forma segura."
          error={fieldError('password')}
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
            />
          )}
        </Field>
        <Field label="Rol" error={fieldError('roleId')}>
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
      </div>
    </EntityFormDialog>
  );
}
