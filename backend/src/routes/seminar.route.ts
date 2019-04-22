import { Router } from 'express';
import * as Seminar from '../controllers/seminar.controller';
import * as Booth from '../controllers/booth.controller';

export const routes = Router();

routes.post('', Seminar.organizer.create);
routes.get('/:seminarId', Seminar.select);

routes.post('/:seminarId/booths', Booth.create);
routes.get('/:seminarId/booths', Booth.index);