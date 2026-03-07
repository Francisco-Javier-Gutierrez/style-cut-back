const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.id },
            include: {
                persona: true,
                rol: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({ message: "Usuario no encontrado" });
        }

        if (usuario.estatus !== "activo") {
            return res.status(403).json({ message: "Usuario inactivo" });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Token inválido" });
        }
        return res.status(500).json({ message: "Error en la autenticación" });
    }
};

module.exports = authMiddleware;
