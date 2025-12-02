import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, fname, lname, email, phone, gender FROM admin ORDER BY id");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query("SELECT id, fname, lname, email, phone, gender FROM admin WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "admin_not_found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { fname, lname, email, phone, gender } = req.body;
    if (!fname || !lname || !email || !phone || !gender) return res.status(400).json({ error: "All fields are required!" });

    const result = await pool.query(
      `INSERT INTO admin (fname, lname, email, phone, gender) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, fname, lname, email, phone, gender`,
      [fname, lname, email, phone, gender]
    );

    if (result.rows.length === 0) {
      const { rows } = await pool.query("SELECT id, fname, lname, email, phone, gender FROM admin WHERE email = $1", [email]);
      return res.status(200).json(rows[0]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;