import * as Booth from '../models/booth.model';

export async function create(req: any, res: any) {
    try {
        let booth = await Booth.create(req.params.seminarId, req.user._id, req.body);
        res.send(booth.toObject());
    } catch (err) {
        res.status(400).send(err.message);
    }
}

export async function select(req: any, res: any) {
    try {
        let booth = await Booth.select(req.params.boothId);
        res.send(booth.toObject());
    } catch (err) {
        res.status(400).send(err.message);
    }
}

export async function update(req: any, res: any) {
    try {
        let booth = await Booth.update(req.params.boothId, req.user._id, req.body);
        res.send(booth.toObject());
    } catch (err) {
        res.status(400).send(err.message);
    }
}