const { Router } = require("express");
const { register, login, getProfile } = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, getProfile);
router.get("/admin/check", authMiddleware, authorizeRoles("Admin"), (req, res) => {
    res.json({ message: "Acceso de administrador verificado", usuario: req.usuario.persona.nombre });
});
router.get("/client/check", authMiddleware, authorizeRoles("Cliente"), (req, res) => {
    res.json({ message: "Acceso de cliente verificado", usuario: req.usuario.persona.nombre });
});

module.exports = router;
