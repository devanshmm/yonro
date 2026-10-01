import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export function errorMessage(error) {
  const apiError = error.response?.data?.error;
  if (apiError?.details?.length)
    return apiError.details.map((d) => `${d.field || 'Details'}: ${d.message}`).join('. ');
  return (
    apiError?.message ||
    (error.code === 'ERR_NETWORK'
      ? 'Cannot reach the server. Check that the API is running.'
      : error.message || 'Something went wrong. Please try again.')
  );
}
export function minutes(seconds = 0) {
  return `${Math.round(seconds / 60)} min`;
}
export function dateLabel(date, options = { weekday: 'short' }) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', options);
}
