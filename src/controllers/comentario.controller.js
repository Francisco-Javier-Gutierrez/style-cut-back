const prisma = require("../lib/prisma");

const createComentario = async (req, res) => {
    try {
        const { servicio_id, calificacion, contenido } = req.body;

        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ message: "La calificación debe estar entre 1 y 5." });
        }

        const cliente = await prisma.cliente.findUnique({
            where: { persona_id: req.usuario.persona_id }
        });

        if (!cliente) {
            return res.status(403).json({ message: "Solo los clientes activos pueden comentar." });
        }

        const servicio = await prisma.servicio.findUnique({ where: { id: parseInt(servicio_id) } });
        if (!servicio) {
            return res.status(404).json({ message: "Servicio no encontrado." });
        }

        const comentario = await prisma.comentario.create({
            data: {
                cliente_id: cliente.id,
                servicio_id: parseInt(servicio_id),
                calificacion: parseInt(calificacion),
                contenido: contenido || null,
            }
        });

        return res.status(201).json({ message: "Comentario guardado exitosamente", comentario });

    } catch (error) {
        return res.status(500).json({ message: "Error al crear el comentario", error: error.message });
    }
};

const getComentariosByServicio = async (req, res) => {
    try {
        const { servicio_id } = req.params;

        const comentarios = await prisma.comentario.findMany({
            where: { servicio_id: parseInt(servicio_id) },
            orderBy: { fecha: "desc" },
            include: {
                cliente: {
                    include: { persona: { select: { nombre: true, apellido_paterno: true } } }
                }
            }
        });

        const formatted = comentarios.map(c => ({
            id: c.id,
            rating: c.calificacion,
            content: c.contenido,
            date: c.fecha.toISOString().split("T")[0],
            author: `${c.cliente.persona.nombre} ${c.cliente.persona.apellido_paterno}`
        }));

        return res.status(200).json(formatted);

    } catch (error) {
        return res.status(500).json({ message: "Error al obtener comentarios", error: error.message });
    }
};

const deleteComentario = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.comentario.findUnique({ where: { id: parseInt(id) } });
        if (!existing) {
            return res.status(404).json({ message: "Comentario no encontrado" });
        }

        await prisma.comentario.delete({ where: { id: parseInt(id) } });

        return res.status(200).json({ message: "Comentario eliminado por el administrador" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el comentario", error: error.message });
    }
};

module.exports = {
    createComentario,
    getComentariosByServicio,
    deleteComentario
};
