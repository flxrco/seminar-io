import { Router } from 'express';

import { routes as userRoutes } from './user.route';

export const routes = Router();

routes.use('/user', userRoutes);