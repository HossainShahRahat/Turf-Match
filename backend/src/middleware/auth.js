import jwt from "jsonwebtoken";

function authenticateToken(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return { error: { status: 401, message: "Missing or invalid authorization header" } };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { payload };
  } catch (_error) {
    return { error: { status: 401, message: "Invalid or expired token" } };
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const auth = authenticateToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }

    const role = auth.payload.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: `Access denied for role: ${role || "unknown"}` });
    }

    req.user = auth.payload;
    return next();
  };
}

export const requireAdminAuth = requireRole(["admin"]);
export const requirePlayerAuth = requireRole(["player"]);
