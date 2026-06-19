/**
 * Custom fetch API wrapper that automatically attaches JWT tokens.
 */
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Server request failed.');
    }

    return data;
  } catch (error) {
    console.error(`API Call Error [${url}]:`, error.message);
    throw error;
  }
};

export default apiCall;
