const prisma = require("../lib/prisma");

const createHorario = async (req, res) => {
    try {
        const { empleado_id, dia_semana, hora_inicio, hora_fin } = req.body;

        const empleado = await prisma.empleado.findUnique({
            where: { id: parseInt(empleado_id) },
        });

        if (!empleado) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        let horario = await prisma.horario.findFirst({
            where: {
                dia_semana,
                hora_inicio: new Date(`1970-01-01T${hora_inicio}:00.000Z`),
                hora_fin: new Date(`1970-01-01T${hora_fin}:00.000Z`),
            }
        });

        if (!horario) {
            horario = await prisma.horario.create({
                data: {
                    dia_semana,
                    hora_inicio: new Date(`1970-01-01T${hora_inicio}:00.000Z`),
                    hora_fin: new Date(`1970-01-01T${hora_fin}:00.000Z`),
                }
            });
        }

        const asignacionExistente = await prisma.empleadoHorarioAsignacion.findUnique({
            where: {
                empleado_id_horario_id: {
                    empleado_id: parseInt(empleado_id),
                    horario_id: horario.id
                }
            }
        });

        if (asignacionExistente) {
            return res.status(400).json({ message: "El empleado ya tiene asignado este horario" });
        }

        await prisma.empleadoHorarioAsignacion.create({
            data: {
                empleado_id: parseInt(empleado_id),
                horario_id: horario.id,
                activo: true
            }
        });

        return res.status(200).json({ message: "Horario creado y asignado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al crear el horario", error: error.message });
    }
};

const getHorariosByEmpleado = async (req, res) => {
    try {
        const { empleado_id } = req.params;

        const asignaciones = await prisma.empleadoHorarioAsignacion.findMany({
            where: { empleado_id: parseInt(empleado_id) },
            include: {
                horario: true,
                empleado: { include: { persona: true } },
            },
            orderBy: { horario: { dia_semana: "asc" } },
        });

        return res.status(200).json({ horarios: asignaciones.map(a => ({ ...a.horario, activo: a.activo, asignacion_id: a.id })) });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los horarios", error: error.message });
    }
};

const updateHorario = async (req, res) => {
    try {
        const { id } = req.params;
        const { dia_semana, hora_inicio, hora_fin, activo } = req.body;

        const asignacion = await prisma.empleadoHorarioAsignacion.findUnique({
            where: { id: parseInt(id) },
            include: { horario: true }
        });

        if (!asignacion) {
            return res.status(404).json({ message: "Asignación de horario no encontrada" });
        }

        if (dia_semana !== undefined || hora_inicio !== undefined || hora_fin !== undefined) {
            const nuevoDia = dia_semana !== undefined ? dia_semana : asignacion.horario.dia_semana;
            const nuevaHoraInicio = hora_inicio !== undefined ? new Date(`1970-01-01T${hora_inicio}:00.000Z`) : asignacion.horario.hora_inicio;
            const nuevaHoraFin = hora_fin !== undefined ? new Date(`1970-01-01T${hora_fin}:00.000Z`) : asignacion.horario.hora_fin;

            let nuevoHorario = await prisma.horario.findFirst({
                where: {
                    dia_semana: nuevoDia,
                    hora_inicio: nuevaHoraInicio,
                    hora_fin: nuevaHoraFin,
                }
            });

            if (!nuevoHorario) {
                nuevoHorario = await prisma.horario.create({
                    data: {
                        dia_semana: nuevoDia,
                        hora_inicio: nuevaHoraInicio,
                        hora_fin: nuevaHoraFin,
                    }
                });
            }

            await prisma.empleadoHorarioAsignacion.update({
                where: { id: parseInt(id) },
                data: {
                    horario_id: nuevoHorario.id,
                    activo: activo !== undefined ? activo : asignacion.activo
                }
            });
        } else if (activo !== undefined) {
            await prisma.empleadoHorarioAsignacion.update({
                where: { id: parseInt(id) },
                data: { activo }
            });
        }

        return res.status(200).json({ message: "Horario actualizado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar el horario", error: error.message });
    }
};

const deleteHorario = async (req, res) => {
    try {
        const { id } = req.params;

        const asignacion = await prisma.empleadoHorarioAsignacion.findUnique({
            where: { id: parseInt(id) },
        });

        if (!asignacion) {
            return res.status(404).json({ message: "Asignación de horario no encontrada" });
        }

        await prisma.empleadoHorarioAsignacion.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: "Horario eliminado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al eliminar el horario", error: error.message });
    }
};

const getAllHorarios = async (req, res) => {
    try {
        const asignaciones = await prisma.empleadoHorarioAsignacion.findMany({
            orderBy: [{ empleado_id: "asc" }, { horario: { dia_semana: "asc" } }],
            include: { horario: true }
        });

        const formattedHorarios = asignaciones.map(a => ({
            id: a.id,
            dia_semana: a.horario.dia_semana,
            activo: a.activo,
            hora_inicio: a.horario.hora_inicio.toISOString().split("T")[1].substring(0, 5),
            hora_fin: a.horario.hora_fin.toISOString().split("T")[1].substring(0, 5)
        }));

        return res.status(200).json(formattedHorarios);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los horarios", error: error.message });
    }
};

module.exports = { createHorario, getHorariosByEmpleado, updateHorario, deleteHorario, getAllHorarios };
