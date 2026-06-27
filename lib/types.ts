export type Cycle = { id: number; number: number; name: string };
export type Course = { id: string; cycle_id: number; code: string | null; name: string; credits: number | null };
export type Professor = { id: string; full_name: string; photo_url: string | null; source_name: string; source_url: string | null; is_active: boolean };
export type Review = { id: string; clarity_rating: number; difficulty_rating: number; fairness_rating: number; treatment_rating: number; workload_rating: number; recommendation: 'like' | 'dislike'; selected_tags: string[]; comment: string; created_at: string };
