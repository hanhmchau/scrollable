import * as dotenv from 'dotenv';
dotenv.config();
import * as express from 'express';
import * as path from 'path';
const port = process.env.PORT || 8080;
import * as cors from 'cors';
const app: express.Application = express();
import mainController from './server/controllers';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());

// api router
app.use('/api', mainController);

// the __dirname is the current directory from where the script is running
const dist = path.resolve(__dirname, 'dist');
app.use(express.static(dist));
// send the user to index html page
app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(dist + '/index.html', null, (err: Error) => {
        if (err) {
            console.log(err);
        }
    });
});

app.listen(port);
