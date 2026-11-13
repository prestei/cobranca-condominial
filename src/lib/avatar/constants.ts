/** Largura/altura máxima do avatar após compactação no cliente. */
export const AVATAR_MAX_DIMENSION_PX = 256;

/** Alvo de tamanho do data URL após compactação no cliente (bytes UTF-16 aprox.). */
export const AVATAR_TARGET_MAX_BYTES = 48_000;

/** Limite aceito no servidor (coluna TEXT, mas mantemos avatar leve). */
export const AVATAR_SERVER_MAX_LENGTH = 120_000;

/** Tamanho máximo do arquivo original antes de tentar compactar no cliente. */
export const AVATAR_CLIENT_MAX_FILE_BYTES = 8 * 1024 * 1024;
