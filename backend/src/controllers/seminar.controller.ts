import * as Seminar from '../models/seminar.model';

export namespace organizer {
    export async function create(req: any, res: any) {
        try {
            let seminar = await Seminar.create(req.user._id, req.body);
            res.status(210).send(seminar.toObject());
        } catch (err) {
            res.status(400).send(err);
        }
    }

    export async function select(req: any, res: any) {
        try {
            let seminar = await Seminar.select(req.params.seminarId);
            await Seminar.collaborators.verify(seminar, req.user._id);

            let obj = seminar.toObject();
            delete obj.attendeeFields;
            delete obj.certificateFields;

            res.send(obj);
        } catch (err) {
            res.status(400).send(err);
        }
    }
}

export namespace guest {
    export async function select(req: any, res: any) {
        try {
            let seminar = await Seminar.select(req.params.seminarId);

            res.send(seminar.toObject().info);
        } catch (err) {
            res.status(400).send(err);
        }
    }
}