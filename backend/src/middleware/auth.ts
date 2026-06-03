import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { COGNITO_CONFIG } from '../config/cognito.js';

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO_CONFIG.USER_POOL_ID,
  tokenUse: 'access',
  clientId: COGNITO_CONFIG.CLIENT_ID,
});

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: '認証トークンがありません' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifier.verify(token);
    req.userId = payload.sub;
    next();
  } catch (e) {
    res.status(401).json({ message: 'トークンが無効です' });
  }
};