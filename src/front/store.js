export const initialStore = () => {
  return {
    token: localStorage.getItem("access_token") ?? null,
    user: JSON.parse(localStorage.getItem("user")) ?? null,
  };
};

const filterUserData = (user) => {
  if (!user) return null;
  return {
    id_user: user.id_user,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    profile: user.profile, 
    rol: user.rol,         
    rol_id: user.rol_id,   
    group_id: user.group_id,
    group_name: user.group_name,
    total_points: user.total_points
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "LOGIN":
      const safeLoginUser = filterUserData(action.payload.user);
      localStorage.setItem("access_token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(safeLoginUser));
      return {
        ...store,
        token: action.payload.token,
        user: safeLoginUser,
      };

    case "SET_USER":
      const safeSetUser = filterUserData(action.payload);
      localStorage.setItem("user", JSON.stringify(safeSetUser));
      return {
        ...store,
        user: safeSetUser,
      };

    case "LOGOUT":
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      return {
        ...store,
        token: null,
        user: null,
      };

    default:
      return store;
  }
}