import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';
export type TaskRecord = {
  id: string;
  [key: string]: any;
};

let db: SQLiteDatabase | null = null;
let dbOperationQueue: Promise<any> = Promise.resolve();

const getDb = async (): Promise<SQLiteDatabase> => {
  if (!db) {
    db = await openDatabaseAsync('tasks.db');
  }
  return db;
};

const executeWithQueue = async <T>(operation: () => Promise<T>): Promise<T> => {
  const currentOperation = dbOperationQueue.then(async () => {
    return await operation();
  });
  
  dbOperationQueue = currentOperation.catch(() => {
    // Continue with the next operation even if this one failed
  });
  
  return currentOperation;
};

const TasksDatabase = {
  async initialize() {
    return executeWithQueue(async () => {
      const database = await getDb();
      await database.execAsync(
        'CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);'
      );
      // カスタム順保存用のテーブルを作成
      await database.execAsync(
        'CREATE TABLE IF NOT EXISTS task_custom_orders (folder TEXT NOT NULL, task_id TEXT NOT NULL, custom_order INTEGER NOT NULL, PRIMARY KEY (folder, task_id));'
      );
    });
  },

  async saveTask(task: TaskRecord) {
    return executeWithQueue(async () => {
      const database = await getDb();
      const data = JSON.stringify(task);
      await database.runAsync(
        'REPLACE INTO tasks (id, data) VALUES (?, ?);',
        [task.id, data]
      );
    });
  },

  async getAllTasks(): Promise<string[]> {
    return executeWithQueue(async () => {
      const database = await getDb();
      const rows = await database.getAllAsync<{ data: string }>(
        'SELECT data FROM tasks;'
      );
      return rows.map(r => r.data);
    });
  },

  async deleteTask(id: string) {
    return executeWithQueue(async () => {
      const database = await getDb();
      await database.runAsync('DELETE FROM tasks WHERE id = ?;', [id]);
      // カスタム順も削除
      await database.runAsync('DELETE FROM task_custom_orders WHERE task_id = ?;', [id]);
    });
  },

  // カスタム順保存機能
  async updateTaskOrder(taskId: string, customOrder: number, folder: string = 'all') {
    return executeWithQueue(async () => {
      const database = await getDb();
      await database.runAsync(
        'REPLACE INTO task_custom_orders (folder, task_id, custom_order) VALUES (?, ?, ?);',
        [folder, taskId, customOrder]
      );
    });
  },

  // フォルダのカスタム順を取得
  async getCustomOrders(folder: string = 'all'): Promise<{ [taskId: string]: number }> {
    return executeWithQueue(async () => {
      const database = await getDb();
      const rows = await database.getAllAsync<{ task_id: string; custom_order: number }>(
        'SELECT task_id, custom_order FROM task_custom_orders WHERE folder = ?;',
        [folder]
      );
      const orders: { [taskId: string]: number } = {};
      rows.forEach(row => {
        orders[row.task_id] = row.custom_order;
      });
      return orders;
    });
  },

  // フォルダ削除時のクリーンアップ
  async cleanupCustomOrdersForFolder(folder: string) {
    return executeWithQueue(async () => {
      const database = await getDb();
      await database.runAsync('DELETE FROM task_custom_orders WHERE folder = ?;', [folder]);
    });
  },
};

export default TasksDatabase;
