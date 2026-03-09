const prisma = require("../lib/prisma");

const getClientDashboard = async (req, res) => {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { persona_id: req.usuario.persona_id },
        });

        if (!cliente) {
            return res.status(404).json({ message: "Perfil de cliente no encontrado" });
        }

        const ahora = new Date();
        ahora.setUTCHours(0, 0, 0, 0);

        const proximaCita = await prisma.cita.findFirst({
            where: {
                cliente_id: cliente.id,
                fecha: { gte: ahora },
                estatus: { in: ["pendiente", "reprogramada", "confirmada"] }
            },
            orderBy: [
                { fecha: 'asc' },
                { hora_inicio: 'asc' }
            ],
            include: {
                empleado: { include: { persona: true } },
                servicio: true
            }
        });

        const totalCitas = await prisma.cita.count({
            where: { cliente_id: cliente.id }
        });

        const citasCompletadas = await prisma.cita.count({
            where: { cliente_id: cliente.id, estatus: "completada" }
        });

        let proxima_cita_format = null;
        if (proximaCita) {
            proxima_cita_format = {
                fecha: proximaCita.fecha.toISOString().split("T")[0],
                hora_inicio: proximaCita.hora_inicio.toISOString().split("T")[1].substring(0, 5),
                servicio: {
                    nombre: proximaCita.servicio.nombre
                }
            };
        }

        return res.status(200).json({
            proxima_cita: proxima_cita_format,
            citas_completadas: citasCompletadas,
            total_historial: totalCitas
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener dashboard del cliente", error: error.message });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);

        const manana = new Date(hoy);
        manana.setUTCDate(manana.getUTCDate() + 1);

        const citasHoy = await prisma.cita.count({
            where: {
                fecha: { gte: hoy, lt: manana },
                estatus: { notIn: ["cancelada", "cancelada_admin"] }
            }
        });

        const totalClientesActivos = await prisma.cliente.count({
            where: { estatus: "activo" }
        });

        const citasPendientes = await prisma.cita.count({
            where: { estatus: { in: ["pendiente", "reprogramada"] } }
        });

        const totalServiciosActivos = await prisma.servicio.count({
            where: { estatus: "activo" }
        });

        return res.status(200).json({
            citas_hoy: citasHoy,
            clientes_activos: totalClientesActivos,
            servicios_activos: totalServiciosActivos,
            citas_pendientes: citasPendientes
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener dashboard del administrador", error: error.message });
    }
};

module.exports = {
    getClientDashboard,
    getAdminDashboard
};
