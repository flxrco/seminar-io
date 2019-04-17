import { Router } from 'express';
import * as Seminar from '../controllers/seminar.controller';

export const routes = Router();

routes.post('', Seminar.organizer.create);
routes.get('/:seminarId', Seminar.select);