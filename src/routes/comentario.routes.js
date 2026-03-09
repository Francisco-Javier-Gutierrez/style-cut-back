const { Router } = require("express");
const {
    createComentario,
    getComentariosByServicio,
    deleteComentario
} = require("../controllers/comentario.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/servicio/:servicio_id", getComentariosByServicio);

router.post("/", authMiddleware, authorizeRoles("Cliente"), createComentario);

router.delete("/:id", authMiddleware, authorizeRoles("Administrador"), deleteComentario);

module.exports = router;
