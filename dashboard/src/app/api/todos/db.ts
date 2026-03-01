import { Pool } from 'pg';

const pool = new Pool({
  database: 'openclaw_db',
  user: 'openclaw',
  host: '/var/run/postgresql'
});

export interface Todo {
  id: number;
  user_id?: number;
  parent_id?: number;
  title: string;
  description?: string;
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  position: number;
  subtasks?: Todo[];
  checklist_items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: number;
  todo_id: number;
  title: string;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
  position: number;
}

// Get all top-level todos (no parent_id) with their subtasks and checklist items
export async function getAllTodos() {
  const { rows: todos } = await pool.query<Todo>(
    'SELECT * FROM ops.todos WHERE parent_id IS NULL ORDER BY position ASC, created_at DESC'
  );

  // Fetch subtasks and checklist items for each todo
  for (const todo of todos) {
    const { rows: subtasks } = await pool.query<Todo>(
      'SELECT * FROM ops.todos WHERE parent_id = $1 ORDER BY position ASC, created_at DESC',
      [todo.id]
    );
    todo.subtasks = subtasks;

    const { rows: checklistItems } = await pool.query<ChecklistItem>(
      'SELECT * FROM ops.todo_checklist_items WHERE todo_id = $1 ORDER BY position ASC, created_at ASC',
      [todo.id]
    );
    todo.checklist_items = checklistItems;
  }

  return todos;
}

// Get a specific todo by ID with its subtasks and checklist items
export async function getTodoById(id: number) {
  const { rows } = await pool.query<Todo>('SELECT * FROM ops.todos WHERE id = $1', [id]);

  if (rows.length === 0) return null;

  const todo = rows[0];

  // Fetch subtasks
  const { rows: subtasks } = await pool.query<Todo>(
    'SELECT * FROM ops.todos WHERE parent_id = $1 ORDER BY position ASC, created_at DESC',
    [todo.id]
  );
  todo.subtasks = subtasks;

  // Fetch checklist items
  const { rows: checklistItems } = await pool.query<ChecklistItem>(
    'SELECT * FROM ops.todo_checklist_items WHERE todo_id = $1 ORDER BY position ASC, created_at ASC',
    [todo.id]
  );
  todo.checklist_items = checklistItems;

  return todo;
}

// Create a new todo
export async function createTodo(data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  parent_id?: number;
  due_date?: Date;
}) {
  const { rows } = await pool.query<Todo>(
    `INSERT INTO ops.todos (title, description, status, priority, parent_id, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.status || 'new',
      data.priority || 'medium',
      data.parent_id || null,
      data.due_date || null
    ]
  );

  return rows[0];
}

// Update a todo
export async function updateTodo(id: number, data: Partial<Todo>) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return getTodoById(id);

  values.push(id);
  const { rows } = await pool.query<Todo>(
    `UPDATE ops.todos SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return rows[0] || null;
}

// Delete a todo
export async function deleteTodo(id: number) {
  await pool.query('DELETE FROM ops.todos WHERE id = $1', [id]);
}

// Bulk operations
export async function bulkCompleteTodos(ids: number[]) {
  await pool.query(
    'UPDATE ops.todos SET status = $1, completed_at = NOW() WHERE id = ANY($2)',
    ['completed', ids]
  );
}

export async function bulkDeleteTodos(ids: number[]) {
  await pool.query('DELETE FROM ops.todos WHERE id = ANY($1)', [ids]);
}

// Get subtasks for a specific todo
export async function getSubtasks(parentId: number) {
  const { rows } = await pool.query<Todo>(
    'SELECT * FROM ops.todos WHERE parent_id = $1 ORDER BY position ASC, created_at DESC',
    [parentId]
  );
  return rows;
}

// Get checklist items for a specific todo
export async function getChecklistItems(todoId: number) {
  const { rows } = await pool.query<ChecklistItem>(
    'SELECT * FROM ops.todo_checklist_items WHERE todo_id = $1 ORDER BY position ASC, created_at ASC',
    [todoId]
  );
  return rows;
}

// Create a checklist item
export async function createChecklistItem(data: {
  todo_id: number;
  title: string;
  position?: number;
}) {
  const { rows } = await pool.query<ChecklistItem>(
    `INSERT INTO ops.todo_checklist_items (todo_id, title, position)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.todo_id, data.title, data.position || 0]
  );

  return rows[0];
}

// Update a checklist item
export async function updateChecklistItem(id: number, data: { title?: string; is_completed?: boolean }) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }

  if (data.is_completed !== undefined) {
    fields.push(`is_completed = $${paramIndex++}`);
    values.push(data.is_completed);
  }

  if (fields.length === 0) return null;

  values.push(id);
  const { rows } = await pool.query<ChecklistItem>(
    `UPDATE ops.todo_checklist_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return rows[0] || null;
}

// Delete a checklist item
export async function deleteChecklistItem(id: number) {
  await pool.query('DELETE FROM ops.todo_checklist_items WHERE id = $1', [id]);
}
