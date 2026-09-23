// Which update is live — the same "v<version> · rev <revision>" stamp the app
// and the OHRR website carry, so anyone can say which one they're looking at.
declare const __APP_VERSION__: string
declare const __APP_REVISION__: number
declare const __APP_COMMIT__: string

export const VERSION = __APP_VERSION__
export const REVISION = __APP_REVISION__
export const COMMIT = __APP_COMMIT__.slice(0, 7)
export const VERSION_LABEL = `v${VERSION} · rev ${REVISION}`
