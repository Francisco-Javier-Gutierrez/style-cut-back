const { Router } = require("express");
const {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    getCatalog,
    getCategorias,
    getClasificaciones,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    createClasificacion,
    updateClasificacion,
    deleteClasificacion
} = require("../controllers/service.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.get("/catalogo", authMiddleware, authorizeRoles("Cliente"), getCatalog);
router.get("/categorias", authMiddleware, authorizeRoles("Administrador"), getCategorias);
router.post("/categorias", authMiddleware, authorizeRoles("Administrador"), createCategoria);
router.put("/categorias/:id", authMiddleware, authorizeRoles("Administrador"), updateCategoria);
router.delete("/categorias/:id", authMiddleware, authorizeRoles("Administrador"), deleteCategoria);

router.get("/clasificaciones", authMiddleware, authorizeRoles("Administrador"), getClasificaciones);
router.post("/clasificaciones", authMiddleware, authorizeRoles("Administrador"), createClasificacion);
router.put("/clasificaciones/:id", authMiddleware, authorizeRoles("Administrador"), updateClasificacion);
router.delete("/clasificaciones/:id", authMiddleware, authorizeRoles("Administrador"), deleteClasificacion);

router.get("/", authMiddleware, authorizeRoles("Administrador"), getAllServices);
router.get("/:id", authMiddleware, authorizeRoles("Administrador"), getServiceById);
router.post("/", authMiddleware, authorizeRoles("Administrador"), createService);
router.put("/:id", authMiddleware, authorizeRoles("Administrador"), updateService);
router.delete("/:id", authMiddleware, authorizeRoles("Administrador"), deleteService);

module.exports = router;
