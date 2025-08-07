import { Request } from 'express';

export interface TAuthenticatedUser {
  uid: string;
  email: string;
  name?: string;
  photoUrl?: string;
}

export interface TAuthenticatedRequest extends Request {
  user: TAuthenticatedUser;
}

export const isAuthenticatedRequest = (req: Request): req is TAuthenticatedRequest => {
  if (!('user' in req)) return false;
  
  const user = (req as Record<string, unknown>).user;
  if (typeof user !== 'object' || user === null) return false;
  
  const userObj = user as Record<string, unknown>;
  return 'uid' in userObj && typeof userObj.uid === 'string';
};

export const hasValidUser = (req: Request): boolean => {
  return isAuthenticatedRequest(req) && 
         req.user && 
         typeof req.user.uid === 'string' && 
         req.user.uid.length > 0;
};

export const getUserFromRequest = (req: Request): TAuthenticatedUser | null => {
  if (!isAuthenticatedRequest(req)) {
    return null;
  }
  
  if (!hasValidUser(req)) {
    return null;
  }
  
  return req.user;
};

export const requireAuthentication = (req: Request): TAuthenticatedUser => {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};

export const getUserId = (req: Request): string => {
  const user = requireAuthentication(req);
  return user.uid;
};

export const getUserEmail = (req: Request): string => {
  const user = requireAuthentication(req);
  return user.email;
}; 