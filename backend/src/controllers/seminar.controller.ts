import * as Seminar from '../models/seminar.model';

export async function select(req: any, res: any) {
    try {
        let seminar = await Seminar.select(req.params.seminarId);
        let collaborator = null;
        
        try {
            collaborator = await Seminar.collaborators.verify(seminar, req.user._id);
        } catch (err) {
            // console.log(err);
            // do nothing
        }

        let obj = seminar.toObject();

        delete obj.certificateFields;
        delete obj.attendeeFields;

        if (!collaborator) {
            delete obj.collaborators;
        } else {
            obj.collaborators = await Seminar.collaborators.index(seminar._id);
        }

        res.send({ ...obj, collaboratorInfo: collaborator });
    } catch (err) {
        res.status(400).send(err.message);
    }
}

export namespace organizer {
    export async function create(req: any, res: any) {
        try {
            let seminar = await Seminar.create(req.user._id, req.body);
            res.status(201).send(seminar.toObject());
        } catch (err) {
            res.status(400).send(err.message);
        }
    }
}