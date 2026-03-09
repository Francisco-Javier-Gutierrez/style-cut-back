require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const citaRoutes = require("./routes/cita.routes");
const horarioRoutes = require("./routes/horario.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const empleadoRoutes = require("./routes/empleado.routes");
const comentarioRoutes = require("./routes/comentario.routes");
const promocionRoutes = require("./routes/promocion.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (res) => {
    res.json({
        message: "Style & Cut API",
        version: "1.0.0",
        status: "running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/servicios", serviceRoutes);

const serviceClientRoutes = express.Router();
serviceClientRoutes.get("/", require("./middlewares/auth.middleware"), require("./middlewares/role.middleware")("Cliente"), require("./controllers/service.controller").getCatalog);
app.use("/api/services", serviceClientRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/horarios", horarioRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/empleados", empleadoRoutes);
app.use("/api/comentarios", comentarioRoutes);
app.use("/api/promociones", promocionRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
