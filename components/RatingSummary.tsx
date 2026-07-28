import type { Review } from '@/lib/types';

export function RatingSummary({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return <p className="text-sm text-slate-500">Aún no hay reseñas aprobadas.</p>;
  }

  const values = reviews.flatMap(review => [
    review.clarity_rating,
    review.difficulty_rating,
    review.fairness_rating,
    review.treatment_rating,
    review.workload_rating,
    review.course_demand_rating,
  ]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const recommended = reviews.filter(review => review.recommendation === 'like').length;

  return (
    <div>
      <p className="text-2xl font-black text-royal">
        {average.toFixed(1)}{' '}
        <span className="text-sm font-medium text-slate-500">/ 10 promedio</span>
      </p>
      <p className="text-sm text-slate-600">
        {recommended}/{reviews.length} estudiantes lo recomiendan
      </p>
    </div>
  );
}
