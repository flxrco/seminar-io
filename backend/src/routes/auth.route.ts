import { Router } from 'express';
import { authenticate } from '../controllers/user.controller';

export const routes = Router();

routes.post('/login', authenticate);