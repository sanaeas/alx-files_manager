import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import authUtils from '../utils/auth';

class AuthController {
  static async getConnect(req, res) {
    const decodedAuthHeader = authUtils.getAuthorizationHeader(req);
    if (!decodedAuthHeader) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const [email, password] = authUtils.extractCredentials(decodedAuthHeader);
    if (!email || !password) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const user = await dbClient.filterBy('users', { email });
    if (user === null) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const passwd = authUtils.sha1Hash(password);
    if (user.password !== passwd) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 86400);
    res.statusCode = 200;
    return res.send({ token });
  }

  static async getDisconnect(req, res) {
    const { user, token } = await authUtils.getUserByToken(req);
    if (!user) {
      res.statusCode = 401;
      return res.send({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    res.statusCode = 204;
    return res.send();
  }
}

export default AuthController;
