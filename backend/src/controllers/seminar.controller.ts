import * as Seminar from '../models/seminar.model';

export async function create(req: any, res: any) {
    try {
        let seminar = await Seminar.create(req.user._id, req.body);
        res.send(seminar.toObject());
    } catch (err) {
        res.status(400).send(err);
    }
}