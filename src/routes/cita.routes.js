const { Router } = require("express");
const {
    createCita,
    getMyCitas,
    cancelCita,
    getAllCitas,
    adminCancelCita,
    adminRescheduleCita,
} = require("../controllers/cita.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.post("/", authMiddleware, authorizeRoles("Cliente"), createCita);
router.get("/mis-citas", authMiddleware, authorizeRoles("Cliente"), getMyCitas);
router.patch("/:id/cancelar", authMiddleware, authorizeRoles("Cliente"), cancelCita);

router.get("/admin", authMiddleware, authorizeRoles("Administrador"), getAllCitas);
router.patch("/admin/:id/cancelar", authMiddleware, authorizeRoles("Administrador"), adminCancelCita);
router.patch("/admin/:id/reprogramar", authMiddleware, authorizeRoles("Administrador"), adminRescheduleCita);

module.exports = router;
