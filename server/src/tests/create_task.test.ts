
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, usersTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'high'
};

// Test input without optional fields - priority has default from Zod
const minimalInput: CreateTaskInput = {
  title: 'Minimal Task',
  priority: 'medium' // Must include since it's required in the type
  // description will be undefined/null
};

describe('createTask', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'test-neon-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(testInput, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.priority).toEqual('high');
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields', async () => {
    const result = await createTask(minimalInput, testUserId);

    // Verify values
    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.priority).toEqual('medium');
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const result = await createTask(testInput, testUserId);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].priority).toEqual('high');
    expect(tasks[0].completed).toEqual(false);
    expect(tasks[0].user_id).toEqual(testUserId);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const inputWithNullDescription: CreateTaskInput = {
      title: 'Task with null description',
      description: null,
      priority: 'low'
    };

    const result = await createTask(inputWithNullDescription, testUserId);

    expect(result.title).toEqual('Task with null description');
    expect(result.description).toBeNull();
    expect(result.priority).toEqual('low');
    expect(result.user_id).toEqual(testUserId);

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].description).toBeNull();
  });

  it('should throw error for invalid user_id', async () => {
    const invalidUserId = 99999;

    expect(async () => {
      await createTask(testInput, invalidUserId);
    }).toThrow(/foreign key constraint/i);
  });
});
