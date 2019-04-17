import express = require('express');
import { json, urlencoded } from 'express';

import session = require('express-session');
import { randomBytes } from 'crypto';

import { passport } from './utils/passport.util';

import { routes } from './routes/index.route';

import { connect } from 'mongoose';

connect('mongodb://localhost/seminar-io', { useNewUrlParser: true });
console.log('MongoDB-Mongoose connection successful.');

const app = express();
const SERVER_PORT = 3000;

// parsers and stuff
app.use(json());
app.use(urlencoded({ extended: true }));

// session support
app.use(session({ 
    secret: randomBytes(48).toString('base64'),
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}));

// passport stuff
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use('', routes);

app.listen(SERVER_PORT, () => {
    console.log(`Started express server at port ${SERVER_PORT}.`);
});
