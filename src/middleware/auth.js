import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "token_missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "invalid_or_expired_token" });
    }

    // decoded = { userId, role, iat, exp }
    req.user = decoded;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "admin_access_required" });
  }
  next();
}

export function requireSelfOrAdmin(req, res, next) {
  const requestedUserId = Number(req.params.id);

  if (req.user.role === "admin" || req.user.userId === requestedUserId) {
    return next();
  }

  return res.status(403).json({ error: "forbidden" });
}
