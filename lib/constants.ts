/** Client-safe constants. Nothing here may import server-only modules. */

/** Vercel caps serverless request bodies near 4.5 MB; leave headroom. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md";

export const MIN_JD_CHARS = 50;
