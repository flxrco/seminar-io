import { Router } from 'express';
import * as User from '../controllers/user.controller';

export const routes = Router();

routes.post('', User.register);
routes.get(':userId', User.select);