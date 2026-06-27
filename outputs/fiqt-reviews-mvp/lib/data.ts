import { createClient } from '@/lib/supabase/server';
import type { Course, Cycle, Professor, Review } from '@/lib/types';

export async function getCycles(): Promise<Cycle[]> { const db = await createClient(); const { data } = await db.from('cycles').select('*').order('number'); return (data as Cycle[]) ?? []; }
export async function getCourses(cycleId: string): Promise<Course[]> { const db = await createClient(); const { data } = await db.from('courses').select('*').eq('cycle_id', cycleId).order('name'); return (data as Course[]) ?? []; }
export async function getCourse(id: string): Promise<Course | null> { const db = await createClient(); const { data } = await db.from('courses').select('*').eq('id', id).single(); return data as Course | null; }
export async function getCourseProfessors(courseId: string): Promise<Professor[]> { const db = await createClient(); const { data } = await db.from('course_professors').select('professors(*)').eq('course_id', courseId); return (data ?? []).flatMap((x: { professors: Professor | Professor[] | null }) => !x.professors ? [] : Array.isArray(x.professors) ? x.professors : [x.professors]); }
export async function getProfessor(id: string): Promise<Professor | null> { const db = await createClient(); const { data } = await db.from('professors').select('*').eq('id', id).single(); return data as Professor | null; }
export async function getProfessorReviews(id: string): Promise<Review[]> { const db = await createClient(); const { data } = await db.from('reviews').select('id,clarity_rating,difficulty_rating,fairness_rating,treatment_rating,workload_rating,recommendation,selected_tags,comment,created_at').eq('professor_id', id).eq('status', 'approved').order('created_at', { ascending: false }); return (data as Review[]) ?? []; }
