
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import {
  signUpInputSchema,
  signInInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  deleteTaskInputSchema,
  startFocusSessionInputSchema,
  endFocusSessionInputSchema
} from './schema';
import { signUp } from './handlers/sign_up';
import { signIn } from './handlers/sign_in';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { startFocusSession } from './handlers/start_focus_session';
import { endFocusSession } from './handlers/end_focus_session';
import { getUserStats } from './handlers/get_user_stats';
import { getCurrentUser } from './handlers/get_current_user';
import type { User } from './schema';

// Define context type
type Context = {
  neonAuthUserId?: string;
};

type AuthenticatedContext = Context & {
  user: User;
  userId: number;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Helper to extract user ID from Neon Auth context
// This would typically be implemented using Stack Auth middleware
const authenticatedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // TODO: Implement Stack Auth middleware to extract user from token/session
  // For now, this is a placeholder that should be replaced with actual Stack Auth integration
  const neonAuthUserId = ctx.neonAuthUserId;
  if (!neonAuthUserId) {
    throw new Error('Unauthorized');
  }
  
  const user = await getCurrentUser(neonAuthUserId);
  if (!user) {
    throw new Error('User not found');
  }

  return next({
    ctx: {
      ...ctx,
      user,
      userId: user.id
    } as AuthenticatedContext
  });
});

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Auth routes
  signUp: publicProcedure
    .input(signUpInputSchema)
    .mutation(({ input }) => signUp(input)),

  signIn: publicProcedure
    .input(signInInputSchema)
    .mutation(({ input }) => signIn(input)),

  // Task routes (authenticated)
  createTask: authenticatedProcedure
    .input(createTaskInputSchema)
    .mutation(({ input, ctx }) => createTask(input, ctx.userId)),

  getTasks: authenticatedProcedure
    .query(({ ctx }) => getTasks(ctx.userId)),

  updateTask: authenticatedProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input, ctx }) => updateTask(input, ctx.userId)),

  deleteTask: authenticatedProcedure
    .input(deleteTaskInputSchema)
    .mutation(({ input, ctx }) => deleteTask(input, ctx.userId)),

  // Focus session routes (authenticated)
  startFocusSession: authenticatedProcedure
    .input(startFocusSessionInputSchema)
    .mutation(({ input, ctx }) => startFocusSession(input, ctx.userId)),

  endFocusSession: authenticatedProcedure
    .input(endFocusSessionInputSchema)
    .mutation(({ input, ctx }) => endFocusSession(input, ctx.userId)),

  // User stats route (authenticated)
  getUserStats: authenticatedProcedure
    .query(({ ctx }) => getUserStats(ctx.userId)),

  // Get current user (authenticated)
  getCurrentUser: authenticatedProcedure
    .query(({ ctx }) => ctx.user)
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext(): Context {
      // TODO: Extract Neon Auth user ID from request headers/cookies
      // This should be implemented using Stack Auth middleware
      return {
        neonAuthUserId: undefined // Placeholder - should be extracted from Stack Auth session
      };
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
