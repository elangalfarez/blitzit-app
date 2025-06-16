
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  signUpInputSchema,
  signInInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  getTasksInputSchema,
  startFocusSessionInputSchema,
  endFocusSessionInputSchema,
  getUserStatsInputSchema
} from './schema';

// Import handlers
import { signUp } from './handlers/sign_up';
import { signIn } from './handlers/sign_in';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { startFocusSession } from './handlers/start_focus_session';
import { endFocusSession } from './handlers/end_focus_session';
import { getUserStats } from './handlers/get_user_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

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

  // Task routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .input(getTasksInputSchema)
    .query(({ input }) => getTasks(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(z.object({ taskId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteTask(input.taskId, input.userId)),

  // Focus session routes
  startFocusSession: publicProcedure
    .input(startFocusSessionInputSchema)
    .mutation(({ input }) => startFocusSession(input)),

  endFocusSession: publicProcedure
    .input(endFocusSessionInputSchema)
    .mutation(({ input }) => endFocusSession(input)),

  // Dashboard routes
  getUserStats: publicProcedure
    .input(getUserStatsInputSchema)
    .query(({ input }) => getUserStats(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
