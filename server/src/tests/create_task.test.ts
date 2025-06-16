
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  name: 'Test User'
};

// Test task input
const testInput: CreateTaskInput = {
  user_id: 1,
  title: 'Complete project',
  description: 'Finish the final implementation',
  estimated_minutes: 120,
  scheduled_date: new Date('2024-01-15')
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTask(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.title).toEqual('Complete project');
    expect(result.description).toEqual('Finish the final implementation');
    expect(result.estimated_minutes).toEqual(120);
    expect(result.completed).toEqual(false);
    expect(result.completed_at).toBeNull();
    expect(result.scheduled_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const minimalInput: CreateTaskInput = {
      user_id: 1,
      title: 'Simple task',
      scheduled_date: new Date('2024-01-16')
    };

    const result = await createTask(minimalInput);

    expect(result.user_id).toEqual(1);
    expect(result.title).toEqual('Simple task');
    expect(result.description).toBeNull();
    expect(result.estimated_minutes).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.scheduled_date).toEqual(new Date('2024-01-16'));
    expect(result.id).toBeDefined();
  });

  it('should save task to database', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createTask(testInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Complete project');
    expect(tasks[0].description).toEqual('Finish the final implementation');
    expect(tasks[0].estimated_minutes).toEqual(120);
    expect(tasks[0].user_id).toEqual(1);
    expect(tasks[0].completed).toEqual(false);
    expect(tasks[0].scheduled_date).toEqual('2024-01-15'); // Date column stores as string
    expect(tasks[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Don't create user - test foreign key constraint
    await expect(createTask(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle different scheduled dates correctly', async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();

    const todayInput: CreateTaskInput = {
      user_id: 1,
      title: 'Today task',
      scheduled_date: new Date()
    };

    const result = await createTask(todayInput);

    expect(result.scheduled_date).toBeInstanceOf(Date);
    expect(result.title).toEqual('Today task');
    
    // Verify the date was stored correctly
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].scheduled_date).toEqual(new Date().toISOString().split('T')[0]);
  });
});
