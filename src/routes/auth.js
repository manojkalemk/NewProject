import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Helper function
function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email_and_password_required" });
    }

    // Fetch user
    const { rows } = await pool.query(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    const refreshToken = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7)
    );

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
   VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    return res.json({
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refresh_token_required" });
    }

    const { rows } = await pool.query(
      `SELECT rt.token, rt.expires_at, u.id AS user_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1`,
      [refreshToken]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: "invalid_refresh_token" });
    }

    const record = rows[0];

    if (new Date(record.expires_at) < new Date()) {
      return res.status(403).json({ error: "refresh_token_expired" });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      {
        userId: record.user_id,
        role: record.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken, all } = req.body;

    if (all === true) {
      // Logout from all devices
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [
        req.user.userId,
      ]);

      return res.json({ message: "all_sessions_revoked" });
    }

    if (!refreshToken) {
      return res.status(400).json({ error: "refresh_token_required" });
    }

    // Logout single session
    await pool.query(
      `DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2`,
      [refreshToken, req.user.userId]
    );

    return res.json({ message: "logged_out_successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
