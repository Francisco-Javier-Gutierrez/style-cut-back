const { Router } = require("express");
const {
    getClientDashboard,
    getAdminDashboard,
} = require("../controllers/dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/cliente", authMiddleware, authorizeRoles("Cliente"), getClientDashboard);
router.get("/admin", authMiddleware, authorizeRoles("Administrador"), getAdminDashboard);

module.exports = router;
