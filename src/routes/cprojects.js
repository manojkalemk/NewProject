import express from "express";
import pool from "../db.js";

const router = express.Router();
const columns = "id, cprojectname, plocation";

/* -------------------------
   Helper: Build dynamic UPDATE query
------------------------- */
function buildUpdateQuery(fields = {}, id) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;

  const setParts = keys.map((key, idx) => `${key} = $${idx + 1}`);
  const values = keys.map((key) => fields[key]);

  const sql = `
    UPDATE cprojects
    SET ${setParts.join(", ")}
    WHERE id = $${keys.length + 1}
    RETURNING ${columns}
  `;

  return { sql, values: [...values, id] };
}

/* -------------------------
   GET all CProjects
------------------------- */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${columns} FROM cprojects ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   GET CProject by ID
------------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `SELECT ${columns} FROM cprojects WHERE id = $1`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "cproject_not_found" });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   CREATE CProject
------------------------- */
router.post("/", async (req, res, next) => {
  try {
    const { cprojectname, plocation } = req.body;

    if (!cprojectname || !plocation) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const result = await pool.query(
      `INSERT INTO cprojects (cprojectname, plocation)
       VALUES ($1, $2)
       ON CONFLICT (cprojectname) DO NOTHING
       RETURNING ${columns}`,
      [cprojectname, plocation]
    );

    // If project already exists (based on name)
    if (result.rows.length === 0) {
      const { rows } = await pool.query(
        `SELECT ${columns} FROM cprojects WHERE cprojectname = $1`,
        [cprojectname]
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
   UPDATE CProject (PATCH)
------------------------- */
router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const allowed = ["cprojectname", "plocation"];
    const fields = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields[key] = req.body[key];
      }
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
      return res.status(404).json({ error: "cproject_not_found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* -------------------------
   DELETE CProject
------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "invalid_id" });

    const { rows } = await pool.query(
      `DELETE FROM cprojects WHERE id = $1 RETURNING ${columns}`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "cproject_not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
