import express = require('express');
import { json, urlencoded } from 'express';
import { routes } from './routes/index.route';
import { connect } from 'mongoose';

connect('mongodb://localhost/seminar-io', { useNewUrlParser: true });
console.log('MongoDB-Mongoose connection successful.');

const app = express();
const SERVER_PORT = 3000;

app.use(json());
app.use(urlencoded({
    extended: true
}));

app.use('', routes);

app.listen(SERVER_PORT, () => {
    console.log(`Started express server at port ${SERVER_PORT}.`);
});
