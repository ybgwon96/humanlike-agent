import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as usersService from './users.service.js';
import { createUserSchema, updateUserProfileSchema, storeSensitiveDataSchema } from './users.schemas.js';
import type { SingleResponse, SuccessResponse } from '../../types/api.js';
import type { UserDto } from '../../types/domain.js';

export const usersRoutes = new Hono();

usersRoutes.post('/', zValidator('json', createUserSchema), async (c) => {
  const body = c.req.valid('json');
  const user = await usersService.createUser(body);

  return c.json<SingleResponse<UserDto>>(
    {
      success: true,
      data: user,
    },
    201
  );
});

usersRoutes.get(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    const user = await usersService.getUserById(id);

    return c.json<SingleResponse<UserDto>>({
      success: true,
      data: user,
    });
  }
);

usersRoutes.get(
  '/external/:externalId',
  zValidator('param', z.object({ externalId: z.string() })),
  async (c) => {
    const { externalId } = c.req.valid('param');
    const user = await usersService.getUserByExternalId(externalId);

    return c.json<SingleResponse<UserDto>>({
      success: true,
      data: user,
    });
  }
);

usersRoutes.patch(
  '/:id/profile',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', updateUserProfileSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const user = await usersService.updateUserProfile({ id, profile: body.profile });

    return c.json<SingleResponse<UserDto>>({
      success: true,
      data: user,
    });
  }
);

usersRoutes.post(
  '/:id/sensitive-data',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', storeSensitiveDataSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    await usersService.storeSensitiveData({ userId: id, data: body.data });

    return c.json<SuccessResponse>({
      success: true,
      message: 'Sensitive data stored successfully',
    });
  }
);

usersRoutes.delete(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param');
    await usersService.deleteUser(id);

    return c.json<SuccessResponse>({
      success: true,
      message: 'User deleted successfully',
    });
  }
);
