import express from "express";
import pool from "../db.js";

const router = express.Router();

// Helper variable and method
const userColumns =
  "id, fname, lname, email, phone, cname, pname, department, created_at";

function buildUpdateQuery(fields = {}, id) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => fields[k]);
  // add id as last param
  const sql = `UPDATE users SET ${sets.join(", ")} WHERE id = $${
    keys.length + 1
  } RETURNING ${userColumns}`;
  return { sql, values: [...values, id] };
}

//Read all
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${userColumns} FROM users ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Read by id
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `SELECT ${userColumns} FROM users WHERE id = $1`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "user_not_found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create user
router.post("/", async (req, res, next) => {
  try {
    const { fname, lname, email, phone, cname, pname, department } = req.body;
    if (
      !fname ||
      !lname ||
      !email ||
      !phone ||
      !cname ||
      !pname ||
      !department
    ) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const result = await pool.query(
      `INSERT INTO users (fname, lname, email, phone, cname, pname, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${userColumns}`,
      [fname, lname, email, phone, cname, pname, department]
    );

    if (result.rows.length === 0) {
      const { rows } = await pool.query(
        `SELECT ${userColumns} FROM users WHERE email = $1`,
        [email]
      );
      return res.status(200).json(rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // unique constraint error fallback
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "duplicate_key", detail: err.detail });
    next(err);
  }
});

/* -------------------------
   Update (partial) - PATCH /users/:id
   - Accepts any subset of fields: fname, lname, email, phone, cname, pname, department
   - Returns updated row
   ------------------------- */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    // only allow these fields to be updated
    const allowed = [
      "fname",
      "lname",
      "email",
      "phone",
      "cname",
      "pname",
      "department",
    ];
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
        return res.status(404).json({ error: "user_not_found" });
      return res.json(rows[0]);
    } catch (err) {
      // handle unique constraint violation
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

/* -------------------------
   Delete - DELETE /users/:id
   - Permanently removes the user and returns deleted row
   ------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING ${userColumns}`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "user_not_found" });
    // Return deleted row (useful for client-side undo)
    return res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
