const prisma = require("../lib/prisma");

const createService = async (req, res) => {
    try {
        const { categoria_id, clasificacion_id, nombre, descripcion, precio, duracion_minutos } = req.body;

        const servicio = await prisma.servicio.create({
            data: {
                categoria_id,
                clasificacion_id,
                nombre,
                descripcion,
                precio,
                duracion_minutos,
            },
            include: {
                categoria: true,
                clasificacion: true,
            },
        });

        return res.status(201).json({ message: "Servicio creado exitosamente", servicio });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear el servicio", error: error.message });
    }
};

const getAllServices = async (req, res) => {
    try {
        const servicios = await prisma.servicio.findMany({
            include: {
                categoria: true,
                clasificacion: true,
            },
            orderBy: { nombre: "asc" },
        });

        return res.status(200).json({ servicios });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los servicios", error: error.message });
    }
};

const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const servicio = await prisma.servicio.findUnique({
            where: { id: parseInt(id) },
            include: {
                categoria: true,
                clasificacion: true,
                empleado_servicios: {
                    include: {
                        empleado: {
                            include: { persona: true },
                        },
                    },
                },
            },
        });

        if (!servicio) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        return res.status(200).json({ servicio });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el servicio", error: error.message });
    }
};

const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoria_id, clasificacion_id, nombre, descripcion, precio, duracion_minutos, estatus } = req.body;

        const existing = await prisma.servicio.findUnique({ where: { id: parseInt(id) } });

        if (!existing) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        const servicio = await prisma.servicio.update({
            where: { id: parseInt(id) },
            data: {
                categoria_id: categoria_id || existing.categoria_id,
                clasificacion_id: clasificacion_id || existing.clasificacion_id,
                nombre: nombre || existing.nombre,
                descripcion: descripcion !== undefined ? descripcion : existing.descripcion,
                precio: precio !== undefined ? precio : existing.precio,
                duracion_minutos: duracion_minutos !== undefined ? duracion_minutos : existing.duracion_minutos,
                estatus: estatus || existing.estatus,
            },
            include: {
                categoria: true,
                clasificacion: true,
            },
        });

        return res.status(200).json({ message: "Servicio actualizado exitosamente", servicio });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar el servicio", error: error.message });
    }
};

const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.servicio.findUnique({ where: { id: parseInt(id) } });

        if (!existing) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        await prisma.servicio.update({
            where: { id: parseInt(id) },
            data: { estatus: "inactivo" },
        });

        return res.status(200).json({ message: "Servicio eliminado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el servicio", error: error.message });
    }
};

const getCatalog = async (req, res) => {
    try {
        const servicios = await prisma.servicio.findMany({
            where: { estatus: "activo" },
            include: {
                categoria: true,
                clasificacion: true,
            },
            orderBy: { nombre: "asc" },
        });

        return res.status(200).json({ servicios });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el catálogo", error: error.message });
    }
};

module.exports = { createService, getAllServices, getServiceById, updateService, deleteService, getCatalog };
