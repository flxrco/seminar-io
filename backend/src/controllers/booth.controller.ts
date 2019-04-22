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

export async function index(req: any, res: any) {
    try {
        res.send(await Booth.index(req.params.seminarId));
    } catch (err) {
        res.status(400).send(err.message);
    }
}

export namespace authentication {
    export async function generateKey(req: any, res: any) {
        try {
            res.status(201).send(await Booth.authentication.generateKey(req.params.boothId, req.user._id));
        } catch (err) {
            res.status(400).send(err.message);
        }
    }

    export async function authenticate(req: any, res: any) {
        try {
            let booth = <any> await Booth.authentication.authenticate(req.params.boothId, req.params.key);
            req.session.boothId = booth.boothId.toHexString();

            req.send(`Successfully authenticated booth ${ req.paras.boothid }.`);
        } catch (err) {
            res.status(400).send(err.message);
        }
    }
}