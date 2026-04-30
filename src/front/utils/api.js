export const apiFetch = async (endpoint, options = {}) => {
  const urlBase = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${urlBase}${endpoint}`, config);

    if (response.status === 401 && endpoint !== "/login") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return { response, data: null };
    }

    const data = await response.json().catch(() => ({}));

    return { response, data };
  } catch (error) {
    console.error("Error en la comunicación con la API:", error);
    throw error;
  }
};
