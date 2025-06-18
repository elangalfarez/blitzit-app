import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test user with Neon Auth ID
async function createTestUser(email: string = 'test@example.com', name: string = 'Test User') {
  const result = await db.insert(usersTable)
    .values({
      neon_auth_user_id: `neon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name
    })
    .returning()
    .execute();
  return result[0];
}

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task successfully', async () => {
    // Create a test user first
    const user = await createTestUser();
    
    const input: CreateTaskInput = {
      user_id: user.id,
      title: 'Test Task',
      description: 'Test description',
      estimated_minutes: 30,
      scheduled_date: new Date('2024-01-15')
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('Test description');
    expect(result.estimated_minutes).toEqual(30);
    expect(result.user_id).toEqual(user.id);
    expect(result.completed).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.scheduled_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields', async () => {
    // Create a test user first
    const user = await createTestUser();
    
    const input: CreateTaskInput = {
      user_id: user.id,
      title: 'Minimal Task',
      scheduled_date: new Date('2024-01-15')
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.estimated_minutes).toBeNull();
    expect(result.user_id).toEqual(user.id);
    expect(result.completed).toBe(false);
  });

  it('should save task to database', async () => {
    // Create a test user first
    const user = await createTestUser();
    
    const input: CreateTaskInput = {
      user_id: user.id,
      title: 'Database Task',
      description: 'Should be saved',
      estimated_minutes: 45,
      scheduled_date: new Date('2024-01-15')
    };

    const result = await createTask(input);

    // Verify it was saved to database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Task');
    expect(tasks[0].description).toEqual('Should be saved');
    expect(tasks[0].estimated_minutes).toEqual(45);
    expect(tasks[0].user_id).toEqual(user.id);
  });

  it('should handle date conversion correctly', async () => {
    // Create a test user first
    const user = await createTestUser();
    
    const scheduledDate = new Date('2024-03-20');
    const input: CreateTaskInput = {
      user_id: user.id,
      title: 'Date Test Task',
      scheduled_date: scheduledDate
    };

    const result = await createTask(input);

    expect(result.scheduled_date).toBeInstanceOf(Date);
    expect(result.scheduled_date.toISOString().split('T')[0]).toEqual('2024-03-20');
  });
});