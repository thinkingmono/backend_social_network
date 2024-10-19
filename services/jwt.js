import jwt from 'jwt-simple';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;

const createToken = (user) => {
  const payload = {
    userId: user._id,
    role: user.role,
    iat: moment().unix(), //fecha de emisión
    exp: moment().add(7, 'days').unix() //fecha de expiración
  }

  return jwt.encode(payload, secret);
}

export { secret, createToken };