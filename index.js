import express from 'express';
import connection from './database/connection.js';
import bodyParser from 'body-parser';
import UserRoutes from './routes/users.js'
import PublicationRoutes from './routes/publications.js'
import FollowRoutes from './routes/follows.js'
import cors from 'cors'

console.log('API Running');

connection();

const app = express();
const port = process.env.PORT || 3900;

app.use(cors({
  origin: '*',
  methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}))

//Decoding the form data to turn them into json objects
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/user', UserRoutes);
app.use('/api/publication', PublicationRoutes);
app.use('/api/follow', FollowRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;