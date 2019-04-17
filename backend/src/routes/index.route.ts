import { Router } from 'express';

import { routes as userRoutes } from './user.route';
import { routes as seminarRoutes } from './seminar.route';
import { routes as authRoutes } from './auth.route';

export const routes = Router();

routes.use('', authRoutes);
routes.use('/users', userRoutes);
routes.use('/seminars', seminarRoutes);
