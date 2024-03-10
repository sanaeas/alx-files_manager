import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import redisClient from './redis';
import dbClient from './db';

const AuthScheme = 'Basic ';

const getAuthorizationHeader = (req) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith(AuthScheme)) {
    return null;
  }
  return Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString();
};

const extractCredentials = (decodedAuthHeader) => {
  let email = '';
  let password = null;
  for (let i = 0; i < decodedAuthHeader.length; i += 1) {
    if (decodedAuthHeader[i] === ':' && i + 1 < decodedAuthHeader.length) {
      password = decodedAuthHeader.substring(i + 1);
      break;
    }
    email += decodedAuthHeader[i];
  }
  return [email, password];
};

const getUserByToken = async (req) => {
  const token = req.headers['x-token'];
  const strId = await redisClient.get(`auth_${token}`);
  const id = new ObjectId(strId);
  if (id === null) {
    return { user: null, token: null };
  }
  const user = await dbClient.filterBy('users', { _id: id });
  return { user, token };
};

const sha1Hash = (password) => {
  const sha1 = crypto.createHash('sha1');
  sha1.update(password, 'utf-8');
  return sha1.digest('hex');
};

export default {
  getAuthorizationHeader,
  extractCredentials,
  sha1Hash,
  getUserByToken,
};
