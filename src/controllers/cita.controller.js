const prisma = require("../lib/prisma");

const createCita = async (req, res) => {
    try {
        const { empleado_id, servicio_id, fecha, hora_inicio } = req.body;

        const cliente = await prisma.cliente.findUnique({
            where: { persona_id: req.usuario.persona_id },
        });

        if (!cliente) {
            return res.status(404).json({ message: "Perfil de cliente no encontrado" });
        }

        const servicio = await prisma.servicio.findUnique({
            where: { id: servicio_id },
        });

        if (!servicio || servicio.estatus !== "activo") {
            return res.status(404).json({ message: "Servicio no disponible" });
        }

        const empleado = await prisma.empleado.findUnique({
            where: { id: empleado_id },
        });

        if (!empleado || empleado.estatus !== "activo") {
            return res.status(404).json({ message: "Empleado no disponible" });
        }

        const fechaCita = new Date(fecha);
        const [horaH, horaM] = hora_inicio.split(":").map(Number);
        const inicio = new Date(fechaCita);
        inicio.setHours(horaH, horaM, 0, 0);

        const fin = new Date(inicio);
        fin.setMinutes(fin.getMinutes() + servicio.duracion_minutos);

        const horaInicioTime = new Date(`1970-01-01T${hora_inicio}:00.000Z`);
        const horaFinTime = new Date(horaInicioTime);
        horaFinTime.setMinutes(horaFinTime.getMinutes() + servicio.duracion_minutos);

        const citasExistentes = await prisma.cita.findMany({
            where: {
                empleado_id,
                fecha: fechaCita,
                estatus: { notIn: ["cancelada", "cancelada_admin"] },
            },
        });

        const conflicto = citasExistentes.some((cita) => {
            const existenteInicio = cita.hora_inicio;
            const existenteFin = cita.hora_fin;
            return horaInicioTime < existenteFin && horaFinTime > existenteInicio;
        });

        if (conflicto) {
            return res.status(409).json({ message: "El empleado ya tiene una cita en ese horario" });
        }

        const cita = await prisma.$transaction(async (tx) => {
            const nuevaCita = await tx.cita.create({
                data: {
                    cliente_id: cliente.id,
                    empleado_id,
                    servicio_id,
                    fecha: fechaCita,
                    hora_inicio: horaInicioTime,
                    hora_fin: horaFinTime,
                    estatus: "pendiente",
                },
                include: {
                    cliente: { include: { persona: true } },
                    empleado: { include: { persona: true } },
                    servicio: true,
                },
            });

            await tx.historialEstatusCita.create({
                data: {
                    cita_id: nuevaCita.id,
                    estatus_anterior: "nueva",
                    estatus_nuevo: "pendiente",
                },
            });

            return nuevaCita;
        });

        return res.status(201).json({ message: "Cita agendada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al agendar la cita", error: error.message });
    }
};

const getMyCitas = async (req, res) => {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { persona_id: req.usuario.persona_id },
        });

        if (!cliente) {
            return res.status(404).json({ message: "Perfil de cliente no encontrado" });
        }

        const citas = await prisma.cita.findMany({
            where: { cliente_id: cliente.id },
            include: {
                empleado: { include: { persona: true } },
                servicio: {
                    include: {
                        promocion_servicios: {
                            include: { promocion: true },
                            where: { promocion: { activo: true } }
                        }
                    }
                },
            },
            orderBy: { fecha: "desc" },
        });

        const formattedCitas = citas.map(cita => {
            const basePrice = parseFloat(cita.servicio.precio);
            let finalPrice = basePrice;
            let appliedDiscount = 0;

            if (cita.servicio.promocion_servicios.length > 0) {
                const maxDiscount = Math.max(...cita.servicio.promocion_servicios.map(ps => parseFloat(ps.promocion.descuento_porcentaje)));
                appliedDiscount = maxDiscount;
                finalPrice = basePrice - (basePrice * (maxDiscount / 100));
            }

            return {
                id: cita.id,
                date: cita.fecha.toISOString().split("T")[0],
                time: cita.hora_inicio.toISOString().split("T")[1].substring(0, 5),
                status: cita.estatus,
                service: {
                    name: cita.servicio.nombre,
                    duration: cita.servicio.duracion_minutos,
                    base_price: basePrice,
                    final_price: finalPrice,
                    discount_percentage: appliedDiscount
                }
            };
        });

        return res.status(200).json(formattedCitas);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener las citas", error: error.message });
    }
};

const cancelCita = async (req, res) => {
    try {
        const { id } = req.params;

        const cliente = await prisma.cliente.findUnique({
            where: { persona_id: req.usuario.persona_id },
        });

        if (!cliente) {
            return res.status(404).json({ message: "Perfil de cliente no encontrado" });
        }

        const cita = await prisma.cita.findUnique({
            where: { id: parseInt(id) },
        });

        if (!cita) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        if (cita.cliente_id !== cliente.id) {
            return res.status(403).json({ message: "No tienes permiso para cancelar esta cita" });
        }

        if (cita.estatus === "cancelada" || cita.estatus === "cancelada_admin") {
            return res.status(400).json({ message: "La cita ya está cancelada" });
        }

        const ahora = new Date();
        const fechaCita = new Date(cita.fecha);
        const diffMs = fechaCita.getTime() - ahora.getTime();
        const diffDias = diffMs / (1000 * 60 * 60 * 24);

        if (diffDias < 1) {
            return res.status(400).json({ message: "Solo puedes cancelar citas con más de 24 horas de anticipación" });
        }

        const citaActualizada = await prisma.$transaction(async (tx) => {
            const updated = await tx.cita.update({
                where: { id: parseInt(id) },
                data: { estatus: "cancelada" },
                include: {
                    empleado: { include: { persona: true } },
                    servicio: true,
                },
            });

            await tx.historialEstatusCita.create({
                data: {
                    cita_id: cita.id,
                    estatus_anterior: cita.estatus,
                    estatus_nuevo: "cancelada",
                    motivo: "Cancelada por el cliente",
                },
            });

            return updated;
        });

        return res.status(200).json({ message: "Cita cancelada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al cancelar la cita", error: error.message });
    }
};

const getAllCitas = async (req, res) => {
    try {
        const { estatus, fecha, empleado_id } = req.query;

        const where = {};
        if (estatus) where.estatus = estatus;
        if (fecha) where.fecha = new Date(fecha);
        if (empleado_id) where.empleado_id = parseInt(empleado_id);

        const citas = await prisma.cita.findMany({
            where,
            include: {
                cliente: { include: { persona: true } },
                empleado: { include: { persona: true } },
                servicio: {
                    include: {
                        promocion_servicios: {
                            include: { promocion: true },
                            where: { promocion: { activo: true } }
                        }
                    }
                },
            },
            orderBy: { fecha: "desc" },
        });

        const formattedCitas = citas.map(cita => {
            const basePrice = parseFloat(cita.servicio.precio);
            let finalPrice = basePrice;
            let appliedDiscount = 0;

            if (cita.servicio.promocion_servicios.length > 0) {
                const maxDiscount = Math.max(...cita.servicio.promocion_servicios.map(ps => parseFloat(ps.promocion.descuento_porcentaje)));
                appliedDiscount = maxDiscount;
                finalPrice = basePrice - (basePrice * (maxDiscount / 100));
            }

            return {
                id: cita.id,
                date: cita.fecha.toISOString().split("T")[0],
                time: cita.hora_inicio.toISOString().split("T")[1].substring(0, 5),
                status: cita.estatus,
                client: {
                    name: cita.cliente.persona.nombre,
                    email: cita.cliente.persona.email || ""
                },
                service: {
                    name: cita.servicio.nombre,
                    duration: cita.servicio.duracion_minutos,
                    base_price: basePrice,
                    final_price: finalPrice,
                    discount_percentage: appliedDiscount
                }
            };
        });

        return res.status(200).json(formattedCitas);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener las citas", error: error.message });
    }
};

const adminCancelCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        const cita = await prisma.cita.findUnique({
            where: { id: parseInt(id) },
        });

        if (!cita) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        if (cita.estatus === "cancelada" || cita.estatus === "cancelada_admin") {
            return res.status(400).json({ message: "La cita ya está cancelada" });
        }

        const citaActualizada = await prisma.$transaction(async (tx) => {
            const updated = await tx.cita.update({
                where: { id: parseInt(id) },
                data: { estatus: "cancelada_admin" },
                include: {
                    cliente: { include: { persona: true } },
                    empleado: { include: { persona: true } },
                    servicio: true,
                },
            });

            await tx.historialEstatusCita.create({
                data: {
                    cita_id: cita.id,
                    estatus_anterior: cita.estatus,
                    estatus_nuevo: "cancelada_admin",
                    motivo: motivo || "Cancelada por el administrador",
                },
            });

            return updated;
        });

        return res.status(200).json({ message: "Cita cancelada por administrador", cita: citaActualizada });
    } catch (error) {
        return res.status(500).json({ message: "Error al cancelar la cita", error: error.message });
    }
};

const adminRescheduleCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, hora_inicio, empleado_id, motivo } = req.body;

        const cita = await prisma.cita.findUnique({
            where: { id: parseInt(id) },
            include: { servicio: true },
        });

        if (!cita) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        if (cita.estatus === "cancelada" || cita.estatus === "cancelada_admin") {
            return res.status(400).json({ message: "No se puede reprogramar una cita cancelada" });
        }

        const nuevaFecha = fecha ? new Date(fecha) : cita.fecha;
        const nuevoEmpleadoId = empleado_id || cita.empleado_id;

        let nuevaHoraInicio;
        let nuevaHoraFin;

        if (hora_inicio) {
            nuevaHoraInicio = new Date(`1970-01-01T${hora_inicio}:00.000Z`);
            nuevaHoraFin = new Date(nuevaHoraInicio);
            nuevaHoraFin.setMinutes(nuevaHoraFin.getMinutes() + cita.servicio.duracion_minutos);
        } else {
            nuevaHoraInicio = cita.hora_inicio;
            nuevaHoraFin = cita.hora_fin;
        }

        const citasExistentes = await prisma.cita.findMany({
            where: {
                empleado_id: nuevoEmpleadoId,
                fecha: nuevaFecha,
                estatus: { notIn: ["cancelada", "cancelada_admin"] },
                id: { not: parseInt(id) },
            },
        });

        const conflicto = citasExistentes.some((c) => {
            return nuevaHoraInicio < c.hora_fin && nuevaHoraFin > c.hora_inicio;
        });

        if (conflicto) {
            return res.status(409).json({ message: "El empleado ya tiene una cita en ese horario" });
        }

        const citaActualizada = await prisma.$transaction(async (tx) => {
            const updated = await tx.cita.update({
                where: { id: parseInt(id) },
                data: {
                    fecha: nuevaFecha,
                    hora_inicio: nuevaHoraInicio,
                    hora_fin: nuevaHoraFin,
                    empleado_id: nuevoEmpleadoId,
                    estatus: "reprogramada",
                },
                include: {
                    cliente: { include: { persona: true } },
                    empleado: { include: { persona: true } },
                    servicio: true,
                },
            });

            await tx.historialEstatusCita.create({
                data: {
                    cita_id: cita.id,
                    estatus_anterior: cita.estatus,
                    estatus_nuevo: "reprogramada",
                    motivo: motivo || "Reprogramada por el administrador",
                },
            });

            return updated;
        });

        return res.status(200).json({ message: "Cita reprogramada exitosamente", cita: citaActualizada });
    } catch (error) {
        return res.status(500).json({ message: "Error al reprogramar la cita", error: error.message });
    }
};

const getDisponibilidad = async (req, res) => {
    try {
        const { fecha, servicio_id } = req.query;

        if (!fecha || !servicio_id) {
            return res.status(400).json({ message: "Se requiere fecha y servicio_id" });
        }

        const fechaConsulta = new Date(fecha);
        const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const diaNombre = diasSemana[fechaConsulta.getUTCDay()];

        const servicio = await prisma.servicio.findUnique({
            where: { id: parseInt(servicio_id) },
        });

        if (!servicio || servicio.estatus !== "activo") {
            return res.status(404).json({ message: "Servicio no encontrado o inactivo" });
        }

        const duracion = servicio.duracion_minutos;

        const empleadosConServicio = await prisma.empleadoServicio.findMany({
            where: { servicio_id: servicio.id },
            include: { empleado: true }
        });

        const empleadoIds = empleadosConServicio.map(es => es.empleado_id);

        if (empleadoIds.length === 0) {
            return res.status(200).json([]);
        }

        const asignaciones = await prisma.empleadoHorarioAsignacion.findMany({
            where: {
                empleado_id: { in: empleadoIds },
                activo: true,
                horario: { dia_semana: diaNombre }
            },
            include: { horario: true }
        });

        const horarios = asignaciones.map(a => ({
            ...a.horario,
            empleado_id: a.empleado_id,
            activo: a.activo
        }));

        const citas = await prisma.cita.findMany({
            where: {
                empleado_id: { in: empleadoIds },
                fecha: fechaConsulta,
                estatus: { notIn: ["cancelada", "cancelada_admin"] }
            }
        });

        const stepMins = 30;

        if (horarios.length === 0) {
            return res.status(200).json([]);
        }

        let minTimeMins = 24 * 60;
        let maxTimeMins = 0;

        horarios.forEach(horario => {
            let actualH = horario.hora_inicio.getUTCHours();
            let actualM = horario.hora_inicio.getUTCMinutes();
            let finH = horario.hora_fin.getUTCHours();
            let finM = horario.hora_fin.getUTCMinutes();

            let inicioMins = actualH * 60 + actualM;
            let finMins = finH * 60 + finM;

            if (inicioMins < minTimeMins) minTimeMins = inicioMins;
            if (finMins > maxTimeMins) maxTimeMins = finMins;
        });

        const bloquesDisponibles = [];

        for (let actualTimeMins = minTimeMins; actualTimeMins + duracion <= maxTimeMins; actualTimeMins += stepMins) {
            const slotFinMins = actualTimeMins + duracion;

            let isAvailable = false;

            for (const horario of horarios) {
                const empId = horario.empleado_id;

                let hHInicio = horario.hora_inicio.getUTCHours();
                let hMInicio = horario.hora_inicio.getUTCMinutes();
                let hHFin = horario.hora_fin.getUTCHours();
                let hMFin = horario.hora_fin.getUTCMinutes();

                let hInicioMins = hHInicio * 60 + hMInicio;
                let hFinMins = hHFin * 60 + hMFin;

                if (actualTimeMins >= hInicioMins && slotFinMins <= hFinMins) {
                    const conflicto = citas.some(cita => {
                        if (cita.empleado_id !== empId) return false;

                        const citaInicioMin = cita.hora_inicio.getUTCHours() * 60 + cita.hora_inicio.getUTCMinutes();
                        const citaFinMin = cita.hora_fin.getUTCHours() * 60 + cita.hora_fin.getUTCMinutes();

                        return actualTimeMins < citaFinMin && slotFinMins > citaInicioMin;
                    });

                    if (!conflicto) {
                        isAvailable = true;
                        break;
                    }
                }
            }

            const hStr = Math.floor(actualTimeMins / 60).toString().padStart(2, "0");
            const mStr = (actualTimeMins % 60).toString().padStart(2, "0");

            bloquesDisponibles.push({
                time: `${hStr}:${mStr}`,
                available: isAvailable
            });
        }

        return res.status(200).json(bloquesDisponibles);
    } catch (error) {
        return res.status(500).json({ message: "Error al consultar disponibilidad", error: error.message });
    }
};

module.exports = { createCita, getMyCitas, cancelCita, getAllCitas, adminCancelCita, adminRescheduleCita, getDisponibilidad };
