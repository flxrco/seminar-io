const express = require("express"),
    app = express();

import { routes } from './routes/index.route';

app.use('', routes);

const SERVER_PORT = 3000;

app.listen(SERVER_PORT, () => {
    console.log(`EXPRESS server listening at port ${SERVER_PORT}`);
});
