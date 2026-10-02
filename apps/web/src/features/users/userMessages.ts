import type { EntityMessages } from '../catalog/catalogLogic';
import { mutationErrorMessage } from '../catalog/catalogLogic';
import type { ApiErrorKind } from '../../lib/apiError';

/** Mensajes de alta de usuario (POST /users). */
export const createUserMessages: EntityMessages = {
  conflict:
    'Ya existe un usuario con ese correo. Usa "Agregar existente" para sumarlo a esta cuenta.',
  notFound: 'El rol seleccionado ya no está disponible. Recarga la página.',
};

/** Mensajes de alta por email (POST /memberships/by-email). */
export const addExistingMessages: EntityMessages = {
  conflict: 'Esa persona ya pertenece a esta cuenta.',
  notFound:
    'No existe un usuario activo con ese correo. Revisa que sea exacto o usa "Nuevo usuario" para crearlo.',
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
