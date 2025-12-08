import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import usersRouter from "./routes/users.js";
import customersRouter from "./routes/customers.js";
import adminsRouter from "./routes/admins.js";
import cprojectsRouter from "./routes/cprojects.js";
import compnayRouter from "./routes/company.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);
app.use("/users", usersRouter);
app.use("/customers", customersRouter);
app.use("/admins", adminsRouter);
app.use("/cprojects", cprojectsRouter);
app.use("/company", compnayRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "internal_server_error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () =>
  console.log(`API listening on http://localhost:${port}`)
);
