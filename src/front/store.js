export const initialStore = () => {
  return {
    token: localStorage.getItem("access_token") ?? null,
    user: JSON.parse(localStorage.getItem("user")) ?? null,
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "LOGIN":
      localStorage.setItem("access_token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      return {
        ...store,
        token: action.payload.token,
        user: action.payload.user,
      };

    case "LOGOUT":
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      return {
        ...store,
        token: null,
        user: null,
      };

    case "SET_USER":
      // Si el usuario cambia algo de su perfil, lo actualizamos en el baúl y en el estado
      localStorage.setItem("user", JSON.stringify(action.payload));
      return {
        ...store,
        user: action.payload,
      };

    default:
      return store;
  }
}
