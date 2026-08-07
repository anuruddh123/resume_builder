import type { TailorResult } from "./schemas";

/** What /api/tailor returns: the model result plus the serialized Markdown. */
export type TailorResponse = TailorResult & { markdown: string };
