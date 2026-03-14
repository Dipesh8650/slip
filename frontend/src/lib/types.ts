export interface Note {
  id: number;
  slug: string;
  title?: string | null;
  content?: string;
  created_at: string;
  updated_at: string;
  protected?: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
