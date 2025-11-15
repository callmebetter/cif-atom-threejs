"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseManager = getDatabaseManager;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseManager {
    constructor() {
        this.db = null;
        const userDataPath = electron_1.app.getPath('userData');
        const dbDir = path_1.default.join(userDataPath, 'database');
        // 确保数据库目录存在
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'crystallography.db');
    }
    connect() {
        try {
            this.db = new better_sqlite3_1.default(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.initTables();
            console.log('Database connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to database:', error);
            throw error;
        }
    }
    disconnect() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Database disconnected');
        }
    }
    initTables() {
        if (!this.db)
            throw new Error('Database not connected');
        // 创建项目表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        cif_file_path TEXT,
        tif_file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);
        // 创建分析记录表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        analysis_type TEXT NOT NULL CHECK (analysis_type IN ('cif', 'tif', 'component')),
        analysis_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);
        // 创建设置表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 创建索引
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_project_id ON analysis_records(project_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_records_type ON analysis_records(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);
        // 插入默认设置
        this.insertDefaultSettings();
    }
    insertDefaultSettings() {
        if (!this.db)
            throw new Error('Database not connected');
        const defaultSettings = [
            { key: 'theme', value: 'light' },
            { key: 'language', value: 'zh-CN' },
            { key: 'auto_save', value: 'true' },
            { key: 'export_quality', value: 'high' },
            { key: 'default_atom_size', value: '1.0' },
            { key: 'default_bond_thickness', value: '0.3' }
        ];
        const insertSetting = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);
        const transaction = this.db.transaction(() => {
            for (const setting of defaultSettings) {
                insertSetting.run(setting.key, setting.value);
            }
        });
        transaction();
    }
    // 项目相关操作
    createProject(project) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, cif_file_path, tif_file_path, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
        const result = stmt.run(project.name, project.description || null, project.cif_file_path || null, project.tif_file_path || null, project.metadata || null);
        return result.lastInsertRowid;
    }
    getProject(id) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `);
        return stmt.get(id) || null;
    }
    getAllProjects() {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      SELECT * FROM projects ORDER BY updated_at DESC
    `);
        return stmt.all();
    }
    updateProject(id, updates) {
        if (!this.db)
            throw new Error('Database not connected');
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        if (fields.length === 0)
            return false;
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const stmt = this.db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `);
        const result = stmt.run(...values);
        return result.changes > 0;
    }
    deleteProject(id) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      DELETE FROM projects WHERE id = ?
    `);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    // 分析记录相关操作
    createAnalysisRecord(analysis) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      INSERT INTO analysis_records (project_id, analysis_type, analysis_data, notes)
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(analysis.project_id, analysis.analysis_type, analysis.analysis_data, analysis.notes || null);
        return result.lastInsertRowid;
    }
    getAnalysisRecords(projectId, analysisType) {
        if (!this.db)
            throw new Error('Database not connected');
        let query = `
      SELECT * FROM analysis_records WHERE project_id = ?
    `;
        const params = [projectId];
        if (analysisType !== undefined) {
            query += ` AND analysis_type = ?`;
            params.push(analysisType);
        }
        query += ` ORDER BY created_at DESC`;
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    deleteAnalysisRecord(id) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      DELETE FROM analysis_records WHERE id = ?
    `);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    // 设置相关操作
    getSetting(key) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      SELECT value FROM settings WHERE key = ?
    `);
        const result = stmt.get(key);
        return result ? result.value : null;
    }
    setSetting(key, value) {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(key, value);
    }
    getAllSettings() {
        if (!this.db)
            throw new Error('Database not connected');
        const stmt = this.db.prepare(`
      SELECT key, value FROM settings
    `);
        const records = stmt.all();
        const settings = {};
        for (const record of records) {
            settings[record.key] = record.value;
        }
        return settings;
    }
    // 数据库维护操作
    async backup(backupPath) {
        if (!this.db)
            throw new Error('Database not connected');
        try {
            const backup = this.db.backup(backupPath);
            await backup.step(-1); // 复制整个数据库
            await backup.finish();
            console.log(`Database backed up to: ${backupPath}`);
        }
        catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }
    getDatabaseStats() {
        if (!this.db)
            throw new Error('Database not connected');
        const projectsCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
        const analysisRecordsCount = this.db.prepare('SELECT COUNT(*) as count FROM analysis_records').get().count;
        let databaseSize = 0;
        try {
            const stats = fs_1.default.statSync(this.dbPath);
            databaseSize = stats.size;
        }
        catch (error) {
            console.warn('Failed to get database size:', error);
        }
        return {
            projectsCount,
            analysisRecordsCount,
            databaseSize
        };
    }
    vacuum() {
        if (!this.db)
            throw new Error('Database not connected');
        this.db.exec('VACUUM');
        console.log('Database vacuumed');
    }
}
// 单例模式
let databaseManager = null;
function getDatabaseManager() {
    if (!databaseManager) {
        databaseManager = new DatabaseManager();
    }
    return databaseManager;
}
exports.default = DatabaseManager;
