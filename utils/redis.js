import redis from 'redis';
import util from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.connected = true;
    this.client.on('error', (err) => {
      console.log(err);
      this.connected = false;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    return util.promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  async del(key) {
    return util.promisify(this.client.del).bind(this.client)(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
