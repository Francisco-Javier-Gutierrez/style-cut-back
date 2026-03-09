const prisma = require("../lib/prisma");

const createService = async (req, res) => {
    try {
        const { categoria_id, clasificacion_id, nombre, descripcion, precio, duracion_minutos } = req.body;

        await prisma.servicio.create({
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

        return res.status(201).json({ message: "Servicio creado exitosamente" });
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
                promocion_servicios: {
                    include: {
                        promocion: true
                    },
                    where: {
                        promocion: { activo: true }
                    }
                }
            },
            orderBy: { nombre: "asc" },
        });

        const formattedServicios = servicios.map(s => {
            const promociones = s.promocion_servicios.map(ps => ({
                id: ps.promocion.id,
                name: ps.promocion.nombre,
                discount_percentage: parseFloat(ps.promocion.descuento_porcentaje)
            }));

            return {
                id: s.id,
                name: s.nombre,
                description: s.descripcion || "",
                duration: s.duracion_minutos,
                price: parseFloat(s.precio),
                categoria_id: s.categoria_id,
                clasificacion_id: s.clasificacion_id,
                promotions: promociones
            };
        });

        return res.status(200).json(formattedServicios);
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
                promocion_servicios: {
                    include: {
                        promocion: true
                    },
                    where: {
                        promocion: { activo: true }
                    }
                }
            },
        });

        if (!servicio) {
            return res.status(404).json({ message: "Servicio no encontrado" });
        }

        const formattedService = {
            ...servicio,
            promociones: servicio.promocion_servicios.map(ps => ({
                id: ps.promocion.id,
                nombre: ps.promocion.nombre,
                descuento_porcentaje: parseFloat(ps.promocion.descuento_porcentaje)
            }))
        };
        delete formattedService.promocion_servicios;

        return res.status(200).json({ servicio: formattedService });
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

        await prisma.servicio.update({
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

        return res.status(200).json({ message: "Servicio actualizado exitosamente" });
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
                promocion_servicios: {
                    include: {
                        promocion: true
                    },
                    where: {
                        promocion: { activo: true }
                    }
                }
            },
            orderBy: { nombre: "asc" },
        });

        const formattedServicios = servicios.map(s => {
            const promociones = s.promocion_servicios.map(ps => ({
                id: ps.promocion.id,
                name: ps.promocion.nombre,
                discount_percentage: parseFloat(ps.promocion.descuento_porcentaje)
            }));

            return {
                id: s.id,
                name: s.nombre,
                description: s.descripcion || "",
                duration: s.duracion_minutos,
                price: parseFloat(s.precio),
                promotions: promociones
            };
        });

        return res.status(200).json(formattedServicios);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el catálogo", error: error.message });
    }
};

const getCategorias = async (req, res) => {
    try {
        const categorias = await prisma.categoriaServicio.findMany({
            orderBy: { nombre: "asc" }
        });
        return res.status(200).json(categorias);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener categorías", error: error.message });
    }
};

const getClasificaciones = async (req, res) => {
    try {
        const clasificaciones = await prisma.clasificacionServicio.findMany({
            orderBy: { nombre: "asc" }
        });
        return res.status(200).json(clasificaciones);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener clasificaciones", error: error.message });
    }
};

const createCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const categoria = await prisma.categoriaServicio.create({
            data: { nombre, descripcion }
        });
        return res.status(201).json({ message: "Categoría creada exitosamente", categoria });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear categoría", error: error.message });
    }
};

const updateCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        const categoria = await prisma.categoriaServicio.update({
            where: { id: parseInt(id) },
            data: { nombre, descripcion }
        });
        return res.status(200).json({ message: "Categoría actualizada exitosamente", categoria });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar categoría", error: error.message });
    }
};

const deleteCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const serviciosActivos = await prisma.servicio.count({
            where: { categoria_id: parseInt(id) }
        });

        if (serviciosActivos > 0) {
            return res.status(400).json({ message: "No se puede eliminar la categoría porque hay servicios vinculados a ella. Actualice los servicios primero." });
        }

        await prisma.categoriaServicio.delete({
            where: { id: parseInt(id) }
        });
        return res.status(200).json({ message: "Categoría eliminada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar categoría", error: error.message });
    }
};

const createClasificacion = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const clasificacion = await prisma.clasificacionServicio.create({
            data: { nombre, descripcion }
        });
        return res.status(201).json({ message: "Clasificación creada exitosamente", clasificacion });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear clasificación", error: error.message });
    }
};

const updateClasificacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        const clasificacion = await prisma.clasificacionServicio.update({
            where: { id: parseInt(id) },
            data: { nombre, descripcion }
        });
        return res.status(200).json({ message: "Clasificación actualizada exitosamente", clasificacion });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar clasificación", error: error.message });
    }
};

const deleteClasificacion = async (req, res) => {
    try {
        const { id } = req.params;

        const serviciosActivos = await prisma.servicio.count({
            where: { clasificacion_id: parseInt(id) }
        });

        if (serviciosActivos > 0) {
            return res.status(400).json({ message: "No se puede eliminar la clasificación porque hay servicios vinculados a ella. Actualice los servicios primero." });
        }

        await prisma.clasificacionServicio.delete({
            where: { id: parseInt(id) }
        });
        return res.status(200).json({ message: "Clasificación eliminada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar clasificación", error: error.message });
    }
};

module.exports = {
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
};
