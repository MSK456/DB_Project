import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      if (successMessage && showSuccessToast) {
        toast.success(successMessage);
      }
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err.response?.data?.message || errorMessage || err.message || 'Something went wrong';
      setError(message);
      if (showErrorToast) toast.error(message);
      onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
};
