import express from "express";
import pool from "../db.js";

const router = express.Router();
const columns = "id, cname, caddress, cgst, cphone, cowner_name, created_at";

/* -----------------------------------
   Helper: Build dynamic update query
----------------------------------- */
function buildUpdateQuery(fields = {}, id) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const setParts = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map((key) => fields[key]);

  const sql = `
    UPDATE company
    SET ${setParts.join(", ")}
    WHERE id = $${keys.length + 1}
    RETURNING ${columns}
  `;

  return { sql, values: [...values, id] };
}

/* -----------------------------------
   GET all companies
----------------------------------- */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${columns} FROM company ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* -----------------------------------
   GET company by ID
----------------------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `SELECT ${columns} FROM company WHERE id = $1`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "company_not_found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -----------------------------------
   CREATE company
----------------------------------- */
router.post("/", async (req, res, next) => {
  try {
    const { cname, caddress, cgst, cphone, cowner_name } = req.body;

    if (!cname || !caddress || !cphone || !cowner_name) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const result = await pool.query(
      `INSERT INTO company (cname, caddress, cgst, cphone, cowner_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cname) DO NOTHING
       RETURNING ${columns}`,
      [cname, caddress, cgst || null, cphone, cowner_name]
    );

    if (result.rows.length === 0) {
      const { rows } = await pool.query(
        `SELECT ${columns} FROM company WHERE cname = $1`,
        [cname]
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

/* -----------------------------------
   UPDATE company (PATCH)
----------------------------------- */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const allowed = ["cname", "caddress", "cgst", "cphone", "cowner_name"];
    const fields = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key];
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "no_fields_to_update", allowed });
    }

    const q = buildUpdateQuery(fields, id);
    if (!q) return res.status(400).json({ error: "update_query_failed" });

    let result;
    try {
      result = await pool.query(q.sql, q.values);
    } catch (err) {
      if (err.code === "23505") {
        return res
          .status(409)
          .json({ error: "duplicate_key", detail: err.detail });
      }
      throw err;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "company_not_found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -----------------------------------
   DELETE company
----------------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `DELETE FROM company WHERE id = $1 RETURNING ${columns}`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "company_not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
