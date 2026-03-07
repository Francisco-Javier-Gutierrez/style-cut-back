const { Router } = require("express");
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    getCatalog,
} = require("../controllers/service.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/catalogo", getCatalog);

router.get("/", authMiddleware, authorizeRoles("Administrador"), getAllServices);
router.get("/:id", authMiddleware, authorizeRoles("Administrador"), getServiceById);
router.post("/", authMiddleware, authorizeRoles("Administrador"), createService);
router.put("/:id", authMiddleware, authorizeRoles("Administrador"), updateService);
router.delete("/:id", authMiddleware, authorizeRoles("Administrador"), deleteService);

module.exports = router;
