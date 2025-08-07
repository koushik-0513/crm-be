import { Request, Response, NextFunction } from "express";
import admin from "../firebase";
import { TAuthenticatedRequest } from "../types";

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Get token from Authorization header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as TAuthenticatedRequest).user = { uid: decodedToken.uid };
    next();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Auth middleware error:", err.message);
    } else {
      console.error("Unknown error in auth middleware");
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default authMiddleware;
