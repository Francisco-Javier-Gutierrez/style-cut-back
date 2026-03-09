const { Router } = require("express");
const {
    createEmpleado,
    getAllEmpleados,
    getEmpleadoById,
    updateEmpleado,
    deleteEmpleado,
    getMisCitasEmpleado,
    assignServicios
} = require("../controllers/empleado.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/mis-citas", authMiddleware, authorizeRoles("Empleado"), getMisCitasEmpleado);

router.get("/", authMiddleware, authorizeRoles("Administrador"), getAllEmpleados);
router.get("/:id", authMiddleware, authorizeRoles("Administrador"), getEmpleadoById);
router.post("/", authMiddleware, authorizeRoles("Administrador"), createEmpleado);
router.put("/:id/servicios", authMiddleware, authorizeRoles("Administrador"), assignServicios);
router.put("/:id", authMiddleware, authorizeRoles("Administrador"), updateEmpleado);
router.delete("/:id", authMiddleware, authorizeRoles("Administrador"), deleteEmpleado);

module.exports = router;
