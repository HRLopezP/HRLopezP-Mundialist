export const apiFetch = async (endpoint, options = {}) => {
  const urlBase = import.meta.env.VITE_BACKEND_URL;
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json", // Lo ponemos por defecto
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Si envías archivos, quitamos el Content-Type para que el navegador lo gestione
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${urlBase}${endpoint}`, config);

    // Si el token expiró (401), limpiamos y redirigimos
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return { response, data: null };
    }

    // IMPORTANTE: Aquí extraemos el JSON antes de retornar
    // Si la respuesta está vacía o no es JSON, manejamos el error
    const data = await response.json().catch(() => ({}));

    return { response, data }; // Ahora sí retornamos ambos para el Login.jsx
  } catch (error) {
    console.error("Error en la comunicación con la API:", error);
    throw error;
  }
};
