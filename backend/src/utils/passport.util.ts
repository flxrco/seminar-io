import passport = require('passport');
import { Strategy as LocalStrategy } from 'passport-local';
import * as User from '../models/user.model';

const strategy = new LocalStrategy(async function(username, password, done) {
    try {
        done(null, await User.authenticate(username, password));
    } catch (err) {
        done(null, false, { message: err.message });
    }
});

passport.use(strategy);

passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        let user = (await User.select(id)).toObject();
        delete user.password;
        done(null, user);
    } catch (err) {
        done(err.message);
    }
});

export { passport };