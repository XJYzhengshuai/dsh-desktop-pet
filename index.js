/**
 * Host half of @local/dsh-desktop-pet.
 *
 * The bundle row only needs to exist so the profile activates the bundle; every
 * pixel of the pet is rendered by the Client module declared in `dsh.client`.
 * Keeping this half empty means no Host service, port, or file is opened.
 */
export function apply() {}
