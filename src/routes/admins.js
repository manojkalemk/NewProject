import express from "express";
import pool from "../db.js";

const router = express.Router();
const adminColumns = "id, fname, lname, email, phone, gender";

/* Helper: build dynamic UPDATE query */
function buildUpdateQuery(fields = {}, id) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);
  const sql = `UPDATE admin SET ${setClauses.join(", ")} WHERE id = $${
    keys.length + 1
  } RETURNING ${adminColumns}`;
  return { sql, values: [...values, id] };
}

/* GET all admins */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${adminColumns} FROM admin ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* GET admin by id */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `SELECT ${adminColumns} FROM admin WHERE id = $1`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "admin_not_found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* CREATE admin */
router.post("/", async (req, res, next) => {
  try {
    const { fname, lname, email, phone, gender } = req.body;
    if (!fname || !lname || !email || !phone || !gender) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const result = await pool.query(
      `INSERT INTO admin (fname, lname, email, phone, gender)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${adminColumns}`,
      [fname, lname, email, phone, gender]
    );

    if (result.rows.length === 0) {
      const { rows } = await pool.query(
        `SELECT ${adminColumns} FROM admin WHERE email = $1`,
        [email]
      );
      return res.status(200).json(rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "duplicate_key", detail: err.detail });
    next(err);
  }
});

/* PATCH admin (partial update) */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const allowed = ["fname", "lname", "email", "phone", "gender"];
    const fields = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) fields[k] = req.body[k];
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "no_updatable_fields", allowed });
    }

    const q = buildUpdateQuery(fields, id);
    if (!q) return res.status(400).json({ error: "no_update_query" });

    try {
      const { rows } = await pool.query(q.sql, q.values);
      if (rows.length === 0)
        return res.status(404).json({ error: "admin_not_found" });
      return res.json(rows[0]);
    } catch (err) {
      if (err.code === "23505")
        return res
          .status(409)
          .json({ error: "duplicate_key", detail: err.detail });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/* DELETE admin */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `DELETE FROM admin WHERE id = $1 RETURNING ${adminColumns}`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "admin_not_found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
