const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ message: "No autenticado" });
        }

        const userRole = req.usuario.rol.nombre;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "No tienes permisos para acceder a este recurso" });
        }

        next();
    };
};

module.exports = authorizeRoles;
