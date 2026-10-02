import { useState } from 'react';
import { changeMembershipRole } from '@inventario/api-client';
import { Field, Select } from '../../components/ui/Field';
import { classifyApiError } from '../../lib/apiError';
import type { MembershipView, RoleOption } from '../../lib/apiTypes';
import { useSession } from '../../session/sessionContext';
import { roleLabel } from '../../session/types';
import { EntityFormDialog } from '../catalog/EntityFormDialog';
import { membershipErrorMessage, membershipMessages } from './userMessages';

type ChangeRoleDialogProps = {
  membership: MembershipView;
  roles: RoleOption[];
  onCancel: () => void;
  onChanged: (changed: boolean) => void;
};

export function ChangeRoleDialog({
  membership,
  roles,
  onCancel,
  onChanged,
}: ChangeRoleDialogProps) {
  const { expireSession } = useSession();
  const [roleId, setRoleId] = useState(membership.role.id);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (roleId === membership.role.id) return onChanged(false);
    setSubmitting(true);
    setFormError(null);
    try {
      await changeMembershipRole(membership.id, { roleId });
      onChanged(true);
    } catch (error) {
      const kind = classifyApiError(error);
      if (kind === 'unauthorized') return expireSession();
      setFormError(membershipErrorMessage(kind, membershipMessages));
      setSubmitting(false);
    }
  };

  return (
    <EntityFormDialog
      title={`Cambiar rol de ${membership.user.name}`}
      submitLabel="Guardar rol"
      submitting={submitting}
      formError={formError}
      onSubmit={() => void submit()}
      onCancel={onCancel}
    >
      <Field
        label="Rol"
        hint="Los permisos del usuario en esta cuenta dependen de su rol."
      >
        {(props) => (
          <Select
            {...props}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            autoFocus
          >
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
