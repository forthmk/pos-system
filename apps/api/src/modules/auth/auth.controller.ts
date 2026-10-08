import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './auth.service';

export async function login(
  req: FastifyRequest<{ Body: { username: string; password: string } }>,
  reply: FastifyReply,
) {
  const user = await service.login(req.body.username, req.body.password);

  const token = await reply.jwtSign({
    user_id: user.user_id,
    name: user.name,
    role: user.role,
  });

  return reply.send({ token, user });
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  const payload = req.user as { user_id: number };
  const user = await service.getMe(payload.user_id);
  return reply.send(user);
}
