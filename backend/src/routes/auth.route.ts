import { Router } from 'express';
import * as User from '../controllers/user.controller';
import * as Booth from '../controllers/booth.controller';

export const routes = Router();

routes.post('/login', User.authenticate);

routes.post('/auth-booth', Booth.authentication.authenticate);