const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const register = async (req, res) => {
    try {
        const {
            nombre,
            apellido_paterno,
            apellido_materno,
            telefono,
            email,
            fecha_nacimiento,
            genero,
            username,
            password,
        } = req.body;

        const existingUsername = await prisma.usuario.findUnique({
            where: { username },
        });

        if (existingUsername) {
            return res.status(400).json({ message: "El nombre de usuario ya existe" });
        }

        if (email) {
            const existingEmail = await prisma.persona.findUnique({
                where: { email },
            });

            if (existingEmail) {
                return res.status(400).json({ message: "El correo electrónico ya está registrado" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let rolCliente = await prisma.rol.findUnique({
            where: { nombre: "Cliente" },
        });

        if (!rolCliente) {
            rolCliente = await prisma.rol.create({
                data: { nombre: "Cliente", descripcion: "Cliente del salón" },
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const persona = await tx.persona.create({
                data: {
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    telefono,
                    email,
                    fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
                    genero,
                },
            });

            const usuario = await tx.usuario.create({
                data: {
                    persona_id: persona.id,
                    rol_id: rolCliente.id,
                    username,
                    password: hashedPassword,
                },
            });

            await tx.cliente.create({
                data: {
                    persona_id: persona.id,
                },
            });

            return { persona, usuario };
        });

        const token = jwt.sign(
            { id: result.usuario.id, rol: rolCliente.nombre },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );

        return res.status(201).json({
            message: "Registro exitoso",
            token,
            usuario: {
                id: result.usuario.id,
                username: result.usuario.username,
                nombre: result.persona.nombre,
                apellido_paterno: result.persona.apellido_paterno,
                email: result.persona.email,
                rol: rolCliente.nombre,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al registrar el usuario", error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const usuario = await prisma.usuario.findUnique({
            where: { username },
            include: {
                persona: true,
                rol: true,
            },
        });

        if (!usuario) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        if (usuario.estatus !== "activo") {
            return res.status(403).json({ message: "Usuario inactivo" });
        }

        const validPassword = await bcrypt.compare(password, usuario.password);

        if (!validPassword) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { ultimo_acceso: new Date() },
        });

        await prisma.bitacoraAcceso.create({
            data: {
                usuario_id: usuario.id,
                ip: req.ip,
                accion: "login",
            },
        });

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol.nombre },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );

        return res.status(200).json({
            message: "Inicio de sesión exitoso",
            token,
            usuario: {
                id: usuario.id,
                username: usuario.username,
                nombre: usuario.persona.nombre,
                apellido_paterno: usuario.persona.apellido_paterno,
                email: usuario.persona.email,
                rol: usuario.rol.nombre,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.usuario.id },
            include: {
                persona: true,
                rol: true,
            },
        });

        return res.status(200).json({
            usuario: {
                id: usuario.id,
                username: usuario.username,
                estatus: usuario.estatus,
                ultimo_acceso: usuario.ultimo_acceso,
                persona: {
                    nombre: usuario.persona.nombre,
                    apellido_paterno: usuario.persona.apellido_paterno,
                    apellido_materno: usuario.persona.apellido_materno,
                    telefono: usuario.persona.telefono,
                    email: usuario.persona.email,
                    fecha_nacimiento: usuario.persona.fecha_nacimiento,
                    genero: usuario.persona.genero,
                },
                rol: usuario.rol.nombre,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
    }
};

module.exports = { register, login, getProfile };
