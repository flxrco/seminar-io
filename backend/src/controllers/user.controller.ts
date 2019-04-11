import * as User from '../models/user.model';

export async function register(req: any, res: any) {
    let user = await User.create(req.body);

    // send email

    res.send(user.toObject());
}

export async function select(req: any, res: any) {
    let user = await User.select(req.params.userId);
    res.send(user.toObject());
}