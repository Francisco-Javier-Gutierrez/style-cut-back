require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const serviceRoutes = require("./routes/service.routes");
const citaRoutes = require("./routes/cita.routes");
const horarioRoutes = require("./routes/horario.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({
        message: "Style & Cut API",
        version: "1.0.0",
        status: "running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/servicios", serviceRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/horarios", horarioRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
