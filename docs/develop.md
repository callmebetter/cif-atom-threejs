# 晶体学与微观图像科研辅助工具  
## 技术实现文档（增补：CIF 解析数据存储、本地文件管理及 Python 调用健壮性设计）  

---

### 一、文档目标  
在原有技术实现文档基础上，增补 **CIF 文件解析数据的本地存储方案**（SQLite 数据库设计）、**解析内容文件的本地目录管理**（路径关联存储），以及 **Python 程序调用的健壮性逻辑**（检测、失败重试等），确保数据持久化可靠、文件管理规范，同时提升外部依赖（Python 脚本）调用的稳定性。  

---

## 二、核心增补内容  

### 模块：CIF 解析数据存储与文件管理  

#### 1. 功能目标  
- **数据存储**：将 CIF 解析后的关键数据（原子坐标、晶胞参数、空间群等）存入本地 SQLite 数据库，支持结构化查询与关联检索。  
- **文件管理**：将解析后的 CIF 原始内容（或处理后的中间文件）存储到应用本地目录，便于后续审计或二次处理。  
- **关联绑定**：将文件存储路径与数据库记录关联（如通过文件唯一标识或用户自定义名称），确保用户操作（如查看解析结果）时能快速定位原始文件或处理后的数据。  

---

#### 2. 技术实现细节  

##### （1）SQLite 数据库设计（数据模型）  
**数据库文件**：`crystal_data.db`（存储于应用本地目录，如 `~/AppData/Local/YourApp/data/`（Windows）或 `~/Library/Application Support/YourApp/data/`（macOS））。  

**核心表结构**：  

| 表名 | 字段 | 类型 | 描述 | 约束 |  
|------|------|------|------|------|  
| `cif_records` | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | 记录唯一标识 | NOT NULL |  
|  | `file_name` | TEXT | 原始 CIF 文件名（如 `sample.cif`） | NOT NULL |  
|  | `file_path` | TEXT | CIF 原始文件在应用本地目录的存储路径（如 `/data/uploads/sample.cif`） | NOT NULL |  
|  | `parsed_atoms` | TEXT | 解析后的原子数据（JSON 格式，包含元素、坐标等） | NOT NULL |  
|  | `parsed_lattice` | TEXT | 解析后的晶胞参数（JSON 格式，包含 a/b/c/α/β/γ） | NOT NULL |  
|  | `space_group` | TEXT | 空间群（可能为 NULL，若 CIF 未定义） | - |  
|  | `parse_status` | TEXT | 解析状态（`success`/`failed`/`partial`） | NOT NULL |  
|  | `parse_error` | TEXT | 解析失败时的错误信息（如字段缺失、格式错误） | - |  
|  | `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | 记录创建时间 | - |  

**说明**：  
- 原子数据（`parsed_atoms`）与晶胞参数（`parsed_lattice`）以 JSON 格式存储（便于前端直接读取，避免复杂 SQL 查询）。  
- `parse_status` 用于标记解析结果（如成功/失败），支持后续统计或错误排查。  

##### （2）本地文件目录管理  
**存储路径规则**：  
- 应用启动时，在本地用户数据目录下创建固定子目录（如 `uploads/` 用于原始 CIF 文件，`processed/` 用于处理后的中间文件）。  
  - 示例路径：  
    - Windows: `%APPDATA%\YourApp\data\uploads\`  
    - macOS: `~/Library/Application Support/YourApp/data/uploads/`  
    - Linux: `~/.config/YourApp/data/uploads/`  
- **文件命名规则**：保留原始文件名（如 `sample.cif`），若重复上传同名文件，则追加时间戳（如 `sample_20240601_1200.cif`）。  

**关键操作**：  
- **保存原始 CIF 文件**：用户上传的 CIF 文件首先被复制到 `uploads/` 目录，保存为 `<原始文件名>` 或 `<原始文件名_时间戳>`。  
- **关联数据库记录**：解析完成后，将文件的本地路径（如 `/data/uploads/sample.cif`）与解析数据一起存入 `cif_records` 表的 `file_path` 字段。  

##### （3）数据存储流程（代码逻辑概要）  
```typescript
// 前端或主进程（解析完成后调用）
async function saveCifDataToDb(parsedData: ParsedCifData, originalFilePath: string) {
  const db = await openSqliteDb(); // 打开本地 SQLite 数据库
  const fileName = path.basename(originalFilePath);
  const targetPath = path.join(appDataDir, 'uploads', fileName); // 复制文件到本地目录

  // 1. 将原始 CIF 文件复制到本地 uploads 目录
  fs.copyFileSync(originalFilePath, targetPath);

  // 2. 构造 JSON 格式的原子与晶胞数据
  const parsedAtomsJson = JSON.stringify(parsedData.atoms);
  const parsedLatticeJson = JSON.stringify(parsedData.latticeParams);

  // 3. 插入数据库记录
  const query = `
    INSERT INTO cif_records 
    (file_name, file_path, parsed_atoms, parsed_lattice, space_group, parse_status) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await db.run(query, [
    fileName,
    targetPath,
    parsedAtomsJson,
    parsedLatticeJson,
    parsedData.spaceGroup || null,
    'success' // 假设解析成功
  ]);
}

// 示例：调用保存函数（在 CIF 解析完成后）
const parsedCifData = await parseCifWithSdk(cifFile); // 前端 SDK 解析
await saveCifDataToDb(parsedCifData, cifFile.path); // 存储到本地目录与数据库
```

---

### 模块：Python 程序调用的健壮性设计  

#### 1. 功能目标  
- **调用检测**：确保 Python 环境可用（解释器存在、依赖库已安装），避免因环境问题导致调用失败。  
- **失败重试**：对临时性错误（如 Python 进程超时、资源竞争）自动重试，提升工具可靠性。  
- **错误隔离**：捕获 Python 执行异常（如语法错误、逻辑错误），避免主进程崩溃，并返回友好错误信息给用户。  

---

#### 2. 技术实现细节  

##### （1）Python 环境检测（调用前校验）  
```typescript
// 主进程（main.ts）：检查 Python 是否可用
function checkPythonEnvironment(): { hasPython: boolean; version?: string } {
  try {
    const { execSync } = require('child_process');
    const versionOutput = execSync('python --version').toString(); // 或 'python3 --version'
    const versionMatch = versionOutput.match(/Python (\d+\.\d+\.\d+)/);
    return { 
      hasPython: true, 
      version: versionMatch ? versionMatch[1] : 'unknown' 
    };
  } catch (error) {
    return { hasPython: false }; // Python 未安装或不在 PATH 中
  }
}

// 使用示例（应用启动时检查）
const pythonCheck = checkPythonEnvironment();
if (!pythonCheck.hasPython) {
  console.error('Python 环境未找到，请确保已安装 Python 3.8+ 并配置环境变量');
  // 可选：在前端提示用户“当前系统未检测到 Python，请联系管理员安装”
}
```

##### （2）Python 调用与失败重试逻辑  
```typescript
// 主进程（main.ts）：调用 Python 脚本（带重试机制）
async function callPythonScriptWithRetry(
  scriptPath: string, 
  args: string[], 
  maxRetries: number = 3, 
  timeoutMs: number = 10000 // 单次调用超时 10 秒
): Promise<{ status: 'success' | 'error'; data?: any; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { spawn } = require('child_process');
      const pythonProcess = spawn('python', [scriptPath, ...args], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs // 设置超时
      });

      let resultData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => { resultData += data.toString(); });
      pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const parsed = JSON.parse(resultData);
              resolve({ status: 'success', data: parsed });
            } catch (e) {
              resolve({ status: 'error', error: 'Python 输出不是有效的 JSON' });
            }
          } else {
            const errorMsg = errorData || `Python 进程退出码: ${code}`;
            lastError = errorMsg;
            if (attempt < maxRetries) {
              console.warn(`Python 调用失败（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${errorMsg}`);
              setTimeout(() => {}, 1000 * attempt); // 指数退避（可选）
            } else {
              resolve({ status: 'error', error: `Python 调用最终失败: ${errorMsg}` });
            }
          }
        });

        pythonProcess.on('error', (err) => {
          lastError = `Python 进程启动错误: ${err.message}`;
          if (attempt < maxRetries) {
            console.warn(`Python 启动失败（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${lastError}`);
            setTimeout(() => {}, 1000 * attempt);
          } else {
            resolve({ status: 'error', error: `Python 启动最终失败: ${lastError}` });
          }
        });
      });

    } catch (error) {
      lastError = `Python 调用异常: ${error instanceof Error ? error.message : String(error)}`;
      if (attempt < maxRetries) {
        console.warn(`Python 调用异常（尝试 ${attempt}/${maxRetries}），重试中... 错误: ${lastError}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 延迟后重试
      }
    }
  }

  return { status: 'error', error: lastError || '未知错误' };
}

// 使用示例（调用 TIF 处理脚本）
const result = await callPythonScriptWithRetry(
  path.join(__dirname, 'python_scripts', 'process_tif.py'),
  [tifFilePath, JSON.stringify(tifParams)]
);

if (result.status === 'success') {
  console.log('处理成功，输出路径:', result.data.outputPath);
} else {
  console.error('处理失败:', result.error);
  // 前端提示用户“TIF 处理失败，请检查文件格式或联系支持”
}
```

##### （3）关键健壮性设计点  
- **超时控制**：单次 Python 调用设置超时（如 10 秒），避免因脚本死锁导致主进程阻塞。  
- **指数退避重试**：重试间隔逐渐增加（如第 1 次 1 秒，第 2 次 2 秒），减少短时间内重复失败的概率。  
- **错误分类**：区分“Python 未安装”（环境问题）、“脚本语法错误”（代码问题）、“参数传递错误”（调用问题），返回明确的错误类型给用户。  
- **日志记录**：记录每次 Python 调用的详细日志（如参数、输出、错误），便于后续排查（可存储到本地日志文件）。  

---

## 三、目录结构增补（本地存储相关）  
```bash
your-app-appdata/          # 应用本地数据目录（根据操作系统自动定位）
├── data/                  # 核心数据存储
│   ├── uploads/           # 原始上传文件（CIF/TIF/ZIP）
│   │   ├── sample.cif     # 用户上传的原始 CIF 文件
│   │   └── sample_20240601_1200.cif # 重复上传的同名文件（带时间戳）
│   ├── processed/         # 处理后的中间文件（如 8-bit TIF、3D 模型缓存）
│   │   └── processed_8bit.tif
│   └── crystal_data.db    # SQLite 数据库（存储解析结果与文件路径关联）
├── logs/                  # 可选：Python 调用日志/错误日志
│   └── python_calls.log
```

---

## 四、总结与最佳实践  

### 1. 数据存储最佳实践  
- **JSON 序列化**：原子/晶胞等结构化数据以 JSON 格式存入 SQLite，平衡查询效率与开发便利性（前端可直接解析）。  
- **状态标记**：通过 `parse_status` 字段区分成功/失败记录，支持后续统计或错误排查。  
- **路径关联**：数据库记录与本地文件路径强绑定，确保数据可追溯（如用户删除文件时同步清理数据库记录）。  

### 2. Python 调用健壮性最佳实践  
- **环境预检**：应用启动时检测 Python 可用性，提前告知用户潜在问题。  
- **重试机制**：对网络波动、资源竞争等临时错误自动重试，提升用户体验。  
- **错误隔离**：主进程捕获 Python 异常（如进程崩溃、输出格式错误），避免工具整体崩溃。  

### 3. 代码可维护性  
- **配置集中管理**：数据库路径、本地存储目录、Python 脚本路径等通过 `constants.ts` 集中定义，避免硬编码。  
- **单一职责函数**：每个函数仅完成一个任务（如 `saveCifDataToDb` 仅处理存储逻辑，不包含解析）。  

---

**智能体执行提示**：  
- 开发阶段优先验证 SQLite 数据库的读写操作（如插入/查询记录），再集成 Python 调用逻辑；  
- 测试阶段重点覆盖异常场景（如 Python 未安装、CIF 文件解析失败），确保错误提示清晰；  
- 生产环境建议定期备份 `crystal_data.db` 与 `uploads/` 目录，防止数据丢失。  

如需进一步细化某环节（如 SQLite 索引优化、Python 脚本超时参数调整），可随时补充需求！ 🗃️🐍