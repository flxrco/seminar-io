import * as User from '../models/user.model';

export async function register(req: any, res: any) {
    try {
        let user = await User.create(req.body);
        let userObject = user.toObject();

        delete userObject.password;

        res.status(201).send(userObject);
    } catch (err) {
        res.status(400).send(err);
    }
}

export async function select(req: any, res: any) {
    try {
        let user = await User.select(req.params.userId);
        res.send(user.toObject());
    } catch (err) {
        res.status(400).send(err);
    }
}