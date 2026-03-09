const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const createEmpleado = async (req, res) => {
    try {
        const { nombre, apellido_paterno, apellido_materno, telefono, email, username, password, especialidad } = req.body;

        const existingUser = await prisma.usuario.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: "El nombre de usuario ya está en uso" });
        }
        if (email) {
            const existingEmail = await prisma.persona.findUnique({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({ message: "El correo ya está en uso" });
            }
        }

        let rolEmpleado = await prisma.rol.findUnique({ where: { nombre: "Empleado" } });
        if (!rolEmpleado) {
            rolEmpleado = await prisma.rol.create({ data: { nombre: "Empleado", descripcion: "Rol de acceso para Empleados/Barberos" } });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoEmpleado = await prisma.$transaction(async (prisma) => {
            const persona = await prisma.persona.create({
                data: {
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    telefono,
                    email,
                },
            });

            const usuario = await prisma.usuario.create({
                data: {
                    persona_id: persona.id,
                    rol_id: rolEmpleado.id,
                    username,
                    password: hashedPassword,
                },
            });

            const empleado = await prisma.empleado.create({
                data: {
                    persona_id: persona.id,
                    especialidad,
                },
            });

            return { persona, usuario, empleado };
        });

        return res.status(201).json({ message: "Empleado creado exitosamente" });

    } catch (error) {
        return res.status(500).json({ message: "Error al crear el empleado", error: error.message });
    }
};

const getAllEmpleados = async (req, res) => {
    try {
        const empleados = await prisma.empleado.findMany({
            include: {
                persona: {
                    include: {
                        usuario: {
                            select: { username: true, estatus: true, ultimo_acceso: true }
                        }
                    }
                },
                empleado_servicios: {
                    include: { servicio: true }
                }
            }
        });

        const formatted = empleados.map(e => ({
            id: e.id,
            nombre: `${e.persona.nombre} ${e.persona.apellido_paterno} ${e.persona.apellido_materno || ""}`.trim(),
            telefono: e.persona.telefono,
            email: e.persona.email,
            especialidad: e.especialidad,
            estatus: e.estatus,
            usuario: e.persona.usuario?.username,
            servicios: e.empleado_servicios ? e.empleado_servicios.map(es => ({
                id: es.servicio.id,
                nombre: es.servicio.nombre,
                precio: parseFloat(es.servicio.precio),
                duracion_minutos: es.servicio.duracion_minutos
            })) : []
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener empleados", error: error.message });
    }
};

const getEmpleadoById = async (req, res) => {
    try {
        const { id } = req.params;
        const empleado = await prisma.empleado.findUnique({
            where: { id: parseInt(id) },
            include: {
                persona: {
                    include: {
                        usuario: { select: { username: true, estatus: true } }
                    }
                },
                horarios_asignados: {
                    include: { horario: true }
                },
                empleado_servicios: {
                    include: { servicio: true }
                }
            }
        });

        if (!empleado) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        const empleadoFormateado = {
            ...empleado,
            horarios: empleado.horarios_asignados.map(ha => ({ ...ha.horario, activo: ha.activo, asignacion_id: ha.id }))
        };
        delete empleadoFormateado.horarios_asignados;

        return res.status(200).json(empleadoFormateado);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener empleado", error: error.message });
    }
};

const updateEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const { especialidad, estatus } = req.body;

        const existing = await prisma.empleado.findUnique({ where: { id: parseInt(id) } });

        if (!existing) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        await prisma.empleado.update({
            where: { id: parseInt(id) },
            data: {
                especialidad: especialidad !== undefined ? especialidad : existing.especialidad,
                estatus: estatus || existing.estatus
            }
        });

        return res.status(200).json({ message: "Empleado actualizado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar empleado", error: error.message });
    }
};

const deleteEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.empleado.findUnique({
            where: { id: parseInt(id) },
            include: { persona: { include: { usuario: true } } }
        });

        if (!existing) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        await prisma.$transaction([
            prisma.empleado.update({
                where: { id: parseInt(id) },
                data: { estatus: "inactivo" }
            }),
            prisma.usuario.update({
                where: { id: existing.persona.usuario.id },
                data: { estatus: "inactivo" }
            })
        ]);

        return res.status(200).json({ message: "Empleado desactivado exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al desactivar empleado", error: error.message });
    }
};

const getMisCitasEmpleado = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const empleado = await prisma.empleado.findFirst({
            where: { persona_id: req.usuario.persona_id }
        });

        if (!empleado) {
            return res.status(403).json({ message: "No eres un empleado." });
        }

        const citas = await prisma.cita.findMany({
            where: { empleado_id: empleado.id },
            orderBy: [{ fecha: "desc" }, { hora_inicio: "desc" }],
            include: {
                servicio: true,
                cliente: {
                    include: { persona: true }
                }
            }
        });

        const formatted = citas.map(c => ({
            id: c.id,
            date: c.fecha.toISOString().split("T")[0],
            time: c.hora_inicio.toISOString().split("T")[1].substring(0, 5),
            status: c.estatus,
            service: {
                name: c.servicio.nombre,
                duration: c.servicio.duracion_minutos
            },
            client: {
                name: `${c.cliente.persona.nombre} ${c.cliente.persona.apellido_paterno}`,
                phone: c.cliente.persona.telefono
            }
        }));

        return res.status(200).json(formatted);

    } catch (error) {
        return res.status(500).json({ message: "Error al obtener sus citas", error: error.message });
    }
};

const assignServicios = async (req, res) => {
    try {
        const { id } = req.params;
        const { servicios } = req.body;

        const empleado = await prisma.empleado.findUnique({
            where: { id: parseInt(id) }
        });

        if (!empleado) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        if (!Array.isArray(servicios)) {
            return res.status(400).json({ message: "El formato de servicios debe ser un arreglo de IDs" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.empleadoServicio.deleteMany({
                where: { empleado_id: parseInt(id) }
            });

            if (servicios.length > 0) {
                const data = servicios.map(servicio_id => ({
                    empleado_id: parseInt(id),
                    servicio_id: parseInt(servicio_id)
                }));

                await tx.empleadoServicio.createMany({
                    data
                });
            }
        });

        return res.status(200).json({ message: "Servicios asignados correctamente" });

    } catch (error) {
        return res.status(500).json({ message: "Error al asignar servicios", error: error.message });
    }
};

module.exports = {
    createEmpleado,
    getAllEmpleados,
    getEmpleadoById,
    updateEmpleado,
    deleteEmpleado,
    getMisCitasEmpleado,
    assignServicios
};
