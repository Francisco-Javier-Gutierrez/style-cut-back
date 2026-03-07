const prisma = require("../lib/prisma");

const createHorario = async (req, res) => {
    try {
        const { empleado_id, dia_semana, hora_inicio, hora_fin } = req.body;

        const empleado = await prisma.empleado.findUnique({
            where: { id: empleado_id },
        });

        if (!empleado) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        const horario = await prisma.horarioEmpleado.create({
            data: {
                empleado_id,
                dia_semana,
                hora_inicio: new Date(`1970-01-01T${hora_inicio}:00.000Z`),
                hora_fin: new Date(`1970-01-01T${hora_fin}:00.000Z`),
            },
            include: {
                empleado: { include: { persona: true } },
            },
        });

        return res.status(201).json({ message: "Horario creado exitosamente", horario });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear el horario", error: error.message });
    }
};

const getHorariosByEmpleado = async (req, res) => {
    try {
        const { empleado_id } = req.params;

        const horarios = await prisma.horarioEmpleado.findMany({
            where: { empleado_id: parseInt(empleado_id) },
            include: {
                empleado: { include: { persona: true } },
            },
            orderBy: { dia_semana: "asc" },
        });

        return res.status(200).json({ horarios });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los horarios", error: error.message });
    }
};

const updateHorario = async (req, res) => {
    try {
        const { id } = req.params;
        const { dia_semana, hora_inicio, hora_fin, activo } = req.body;

        const existing = await prisma.horarioEmpleado.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existing) {
            return res.status(404).json({ message: "Horario no encontrado" });
        }

        const data = {};
        if (dia_semana !== undefined) data.dia_semana = dia_semana;
        if (hora_inicio !== undefined) data.hora_inicio = new Date(`1970-01-01T${hora_inicio}:00.000Z`);
        if (hora_fin !== undefined) data.hora_fin = new Date(`1970-01-01T${hora_fin}:00.000Z`);
        if (activo !== undefined) data.activo = activo;

        const horario = await prisma.horarioEmpleado.update({
            where: { id: parseInt(id) },
            data,
            include: {
                empleado: { include: { persona: true } },
            },
        });

        return res.status(200).json({ message: "Horario actualizado exitosamente", horario });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar el horario", error: error.message });
    }
};

const deleteHorario = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.horarioEmpleado.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existing) {
            return res.status(404).json({ message: "Horario no encontrado" });
        }

        await prisma.horarioEmpleado.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: "Horario eliminado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el horario", error: error.message });
    }
};

const getAllHorarios = async (req, res) => {
    try {
        const horarios = await prisma.horarioEmpleado.findMany({
            include: {
                empleado: { include: { persona: true } },
            },
            orderBy: [{ empleado_id: "asc" }, { dia_semana: "asc" }],
        });

        return res.status(200).json({ horarios });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los horarios", error: error.message });
    }
};

module.exports = { createHorario, getHorariosByEmpleado, updateHorario, deleteHorario, getAllHorarios };
