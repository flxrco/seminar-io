import * as Booth from '../controllers/booth.controller';
import { Router } from 'express';

export const routes = Router();

routes.get('/:boothId', Booth.select);
routes.put('/:boothId', Booth.update);