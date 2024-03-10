import dbClient from '../utils/db';
import authUtils from '../utils/auth';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (email === undefined) {
      res.statusCode = 400;
      return res.send({ error: 'Missing email' });
    }
    if (password === undefined) {
      res.statusCode = 400;
      return res.send({ error: 'Missing password' });
    }
    if ((await dbClient.filterBy('users', { email })) !== null) {
      res.statusCode = 400;
      return res.send({ error: 'Already exist' });
    }
    const user = await dbClient.insertInto('users', {
      email,
      password: authUtils.sha1Hash(password),
    });
    if (user !== null) {
      const userId = user.insertedId;
      res.statusCode = 201;
      return res.send({ id: userId, email });
    }
    res.statusCode = 400;
    return res.send({ error: 'Error occured!' });
  }
}

export default UsersController;