import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, cprojectname, plocation FROM cprojects ORDER BY id");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query("SELECT id, cprojectname, plocation FROM cprojects WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "cprojects_not_found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { cprojectname, plocation } = req.body;
    if (!cprojectname || !plocation ) return res.status(400).json({ error: "All fields are required!" });

    const result = await pool.query(
      `INSERT INTO cprojects (cprojectname, plocation) VALUES ($1, $2)
       RETURNING id, cprojectname, plocation`,
      [cprojectname, plocation]
    );

    if (result.rows.length === 0) {
      const { rows } = await pool.query("SELECT id, cprojectname, plocation FROM cprojects WHERE cprojectname = $1", [cprojectname]);
      return res.status(200).json(rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;