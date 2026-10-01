import { useState } from 'react';
import { errorMessage } from '@/lib/utils';

export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function run(action, message = 'Changes saved') {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      return true;
    } catch (failure) {
      setError(errorMessage(failure));
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, success, run };
}
