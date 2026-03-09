const { Router } = require("express");
const {
    createPromocion,
    getAllPromociones,
    getPromocionById,
    updatePromocion,
    deletePromocion,
    assignPromocionToServicio,
    removePromocionFromServicio
} = require("../controllers/promocion.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles("Administrador"));

router.get("/", getAllPromociones);
router.get("/:id", getPromocionById);
router.post("/", createPromocion);
router.put("/:id", updatePromocion);
router.delete("/:id", deletePromocion);

router.post("/:promocion_id/servicios", assignPromocionToServicio);
router.delete("/:promocion_id/servicios/:servicio_id", removePromocionFromServicio);

module.exports = router;
