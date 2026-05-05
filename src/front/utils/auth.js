export const getRolFromToken = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
        const payload = token.split(".")[1];

        const decoded = JSON.parse(atob(payload));
        
        return decoded.is_administrator === true ? "Administrador" : "Participante";
    } catch (e) {
        return null;
    }
};