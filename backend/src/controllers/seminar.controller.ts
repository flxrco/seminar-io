import * as Seminar from '../models/seminar.model';

export async function select(req: any, res: any) {
    try {
        let seminar = (await Seminar.select(req.params.seminarId)).toObject();
        let collaborator = null;
        
        try {
            collaborator = await Seminar.collaborators.verify(seminar, req.user._id);
        } catch (err) {
            // do nothing, just catch
        }

        delete seminar.certificateFields;
        delete seminar.attendeeFields;

        if (collaborator) {
            delete seminar.collaborators;
        }

        res.send({ ...seminar, collaboratorInfo: collaborator });
    } catch (err) {
        res.status(400).send(err);
    }
}

export namespace organizer {
    export async function create(req: any, res: any) {
        try {
            let seminar = await Seminar.create(req.user._id, req.body);
            res.status(210).send(seminar.toObject());
        } catch (err) {
            res.status(400).send(err);
        }
    }
}

export namespace guest {

}