import express from "express";
import pool from "../db.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const customerColumns = "id, fname, lname, email, phone";

router.use(authenticateToken);
router.use(requireAdmin);

/* -------------------------
   Helper: Build dynamic update query
------------------------- */
function buildUpdateQuery(fields = {}, id) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const setClauses = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map((key) => fields[key]);

  const sql = `
    UPDATE customers 
    SET ${setClauses.join(", ")} 
    WHERE id = $${keys.length + 1}
    RETURNING ${customerColumns}
  `;

  return { sql, values: [...values, id] };
}

/* -------------------------
   GET all customers
------------------------- */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${customerColumns} FROM customers ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   GET customer by ID
------------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `SELECT ${customerColumns} FROM customers WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "customer_not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   CREATE a new customer
------------------------- */
router.post("/", async (req, res, next) => {
  try {
    const { fname, lname, email, phone } = req.body;

    if (!fname || !lname || !email || !phone) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const result = await pool.query(
      `INSERT INTO customers (fname, lname, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${customerColumns}`,
      [fname, lname, email, phone]
    );

    // On conflict, return existing customer
    if (result.rows.length === 0) {
      const { rows } = await pool.query(
        `SELECT ${customerColumns} FROM customers WHERE email = $1`,
        [email]
      );
      return res.status(200).json(rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "duplicate_key", detail: err.detail });
    }
    next(err);
  }
});

/* -------------------------
   UPDATE customer (PATCH)
------------------------- */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const allowedFields = ["fname", "lname", "email", "phone"];
    const fieldsToUpdate = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "no_fields_to_update", allowed: allowedFields });
    }

    const query = buildUpdateQuery(fieldsToUpdate, id);
    if (!query) return res.status(400).json({ error: "update_query_failed" });

    let result;
    try {
      result = await pool.query(query.sql, query.values);
    } catch (err) {
      if (err.code === "23505") {
        return res
          .status(409)
          .json({ error: "duplicate_key", detail: err.detail });
      }
      throw err;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "customer_not_found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   DELETE customer
------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `DELETE FROM customers WHERE id = $1 RETURNING ${customerColumns}`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "customer_not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
