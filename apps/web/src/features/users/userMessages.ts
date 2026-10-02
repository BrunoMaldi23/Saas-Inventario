import type { EntityMessages } from '../catalog/catalogLogic';
import { mutationErrorMessage } from '../catalog/catalogLogic';
import type { ApiErrorKind } from '../../lib/apiError';

/** Mensajes de alta de usuario (POST /users). */
export const createUserMessages: EntityMessages = {
  conflict:
    'Ya existe una cuenta con ese correo. Agregar usuarios existentes a esta cuenta aún no está disponible desde aquí.',
  notFound: 'El rol seleccionado ya no está disponible. Recarga la página.',
};

/** Mensajes de cambios de membresía (rol y estado). */
export const membershipMessages: EntityMessages = {
  conflict:
    'No se puede dejar la cuenta sin un propietario activo. Asigna otro propietario antes.',
  notFound: 'El usuario o el rol ya no está disponible. Recarga la página.',
};

/**
 * 403 en identidad suele significar que el rol del usuario no puede asignar o
 * modificar ese rol (p. ej. un Admin sobre un Owner). Lo decide el backend.
 */
export function membershipErrorMessage(
  kind: ApiErrorKind,
  messages: EntityMessages,
): string {
  return kind === 'forbidden'
    ? 'Tu rol no permite asignar o modificar ese rol.'
    : mutationErrorMessage(kind, messages);
}
