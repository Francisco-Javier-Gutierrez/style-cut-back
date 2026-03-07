const { Router } = require("express");
const {
    createHorario,
    getHorariosByEmpleado,
    updateHorario,
    deleteHorario,
    getAllHorarios,
} = require("../controllers/horario.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/", authMiddleware, authorizeRoles("Administrador"), getAllHorarios);
router.get("/empleado/:empleado_id", authMiddleware, authorizeRoles("Administrador"), getHorariosByEmpleado);
router.post("/", authMiddleware, authorizeRoles("Administrador"), createHorario);
router.put("/:id", authMiddleware, authorizeRoles("Administrador"), updateHorario);
router.delete("/:id", authMiddleware, authorizeRoles("Administrador"), deleteHorario);

module.exports = router;
