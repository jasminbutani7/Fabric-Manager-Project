import app from '../backend/server.cjs';

export default function handler(req, res) {
  return app(req, res);
}
