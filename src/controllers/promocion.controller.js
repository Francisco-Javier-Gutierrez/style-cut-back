const prisma = require("../lib/prisma");

const createPromocion = async (req, res) => {
    try {
        const { nombre, descripcion, descuento_porcentaje, fecha_inicio, fecha_fin } = req.body;

        const promocion = await prisma.promocion.create({
            data: {
                nombre,
                descripcion,
                descuento_porcentaje,
                fecha_inicio: new Date(fecha_inicio),
                fecha_fin: new Date(fecha_fin)
            }
        });

        return res.status(201).json({ message: "Promoción creada exitosamente", promocion });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear la promoción", error: error.message });
    }
};

const getAllPromociones = async (req, res) => {
    try {
        const promociones = await prisma.promocion.findMany({
            where: { activo: true },
            include: {
                promocion_servicios: {
                    include: { servicio: { select: { id: true, nombre: true } } }
                }
            },
            orderBy: { fecha_fin: "desc" }
        });

        const formatted = promociones.map(p => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            descuento_porcentaje: parseFloat(p.descuento_porcentaje),
            fecha_inicio: p.fecha_inicio.toISOString().split("T")[0],
            fecha_fin: p.fecha_fin.toISOString().split("T")[0],
            activo: p.activo,
            servicios_aplicados: p.promocion_servicios.map(ps => ps.servicio)
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener las promociones", error: error.message });
    }
};

const getPromocionById = async (req, res) => {
    try {
        const { id } = req.params;
        const promocion = await prisma.promocion.findUnique({
            where: { id: parseInt(id) },
            include: {
                promocion_servicios: {
                    include: { servicio: { select: { id: true, nombre: true, estatus: true } } }
                }
            }
        });

        if (!promocion) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        return res.status(200).json({
            ...promocion,
            descuento_porcentaje: parseFloat(promocion.descuento_porcentaje),
            fecha_inicio: promocion.fecha_inicio.toISOString().split("T")[0],
            fecha_fin: promocion.fecha_fin.toISOString().split("T")[0]
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener la promoción", error: error.message });
    }
};

const updatePromocion = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, descuento_porcentaje, fecha_inicio, fecha_fin, activo } = req.body;

        const existing = await prisma.promocion.findUnique({ where: { id: parseInt(id) } });
        if (!existing) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        const promocion = await prisma.promocion.update({
            where: { id: parseInt(id) },
            data: {
                nombre: nombre || existing.nombre,
                descripcion: descripcion !== undefined ? descripcion : existing.descripcion,
                descuento_porcentaje: descuento_porcentaje !== undefined ? descuento_porcentaje : existing.descuento_porcentaje,
                fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : existing.fecha_inicio,
                fecha_fin: fecha_fin ? new Date(fecha_fin) : existing.fecha_fin,
                activo: activo !== undefined ? activo : existing.activo
            }
        });

        return res.status(200).json({ message: "Promoción actualizada exitosamente", promocion });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar la promoción", error: error.message });
    }
};

const deletePromocion = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.promocion.findUnique({ where: { id: parseInt(id) } });
        if (!existing) {
            return res.status(404).json({ message: "Promoción no encontrada" });
        }

        await prisma.promocion.update({
            where: { id: parseInt(id) },
            data: { activo: false }
        });

        return res.status(200).json({ message: "Promoción desactivada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al desactivar la promoción", error: error.message });
    }
};

const assignPromocionToServicio = async (req, res) => {
    try {
        const { promocion_id } = req.params;
        const { servicio_id } = req.body;

        const promocion = await prisma.promocion.findUnique({ where: { id: parseInt(promocion_id) } });
        const servicio = await prisma.servicio.findUnique({ where: { id: parseInt(servicio_id) } });

        if (!promocion || !servicio) {
            return res.status(404).json({ message: "Promoción o Servicio no encontrados" });
        }

        const relacion = await prisma.promocionServicio.upsert({
            where: {
                promocion_id_servicio_id: {
                    promocion_id: promocion.id,
                    servicio_id: servicio.id
                }
            },
            update: {},
            create: {
                promocion_id: promocion.id,
                servicio_id: servicio.id
            }
        });

        return res.status(200).json({ message: "Servicio asignado a la promoción", relacion });
    } catch (error) {
        return res.status(500).json({ message: "Error al asignar la promoción", error: error.message });
    }
};

const removePromocionFromServicio = async (req, res) => {
    try {
        const { promocion_id, servicio_id } = req.params;

        await prisma.promocionServicio.delete({
            where: {
                promocion_id_servicio_id: {
                    promocion_id: parseInt(promocion_id),
                    servicio_id: parseInt(servicio_id)
                }
            }
        });

        return res.status(200).json({ message: "Promoción desvinculada del servicio" });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "El servicio no estaba asignado a esta promoción" });
        }
        return res.status(500).json({ message: "Error al remover la promoción", error: error.message });
    }
};

module.exports = {
    createPromocion,
    getAllPromociones,
    getPromocionById,
    updatePromocion,
    deletePromocion,
    assignPromocionToServicio,
    removePromocionFromServicio
};
