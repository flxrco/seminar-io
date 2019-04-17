import * as User from '../models/user.model';

export async function register(req: any, res: any) {
    try {
        let user = (await User.create(req.body)).toObject();
        delete user.password;

        res.status(201).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
}

export async function select(req: any, res: any) {
    try {
        let user = (await User.select(req.params.userId)).toObject();
        delete user.password;

        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
}