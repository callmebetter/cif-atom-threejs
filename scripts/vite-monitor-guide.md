# Vite Development Server Monitor

A Node.js script to monitor the Vite development server and track errors, warnings, and server performance.

## Overview

The Vite Monitor script (`vite-monitor.js`) provides comprehensive monitoring of the `npm run dev:vite` command, helping developers quickly identify and diagnose issues during development.

## Features

- ✅ **Server Detection**: Captures server URLs (localhost and network), port, and startup time
- ✅ **Error Detection**: Identifies import errors, build failures, syntax errors, and compilation issues
- ✅ **Warning Tracking**: Monitors deprecation warnings and other alerts
- ✅ **Real-time Logging**: Outputs all terminal activity with timestamps
- ✅ **Summary Report**: Generates a complete summary when the server stops
- ✅ **File Logging**: Saves all output to `vite-monitor.log`
- ✅ **JSON Summary**: Creates `vite-monitor-summary.json` with detailed error analysis
- ✅ **Sound Notifications**: Makes a beep sound on Windows when errors are detected
- ✅ **Graceful Shutdown**: Handles Ctrl+C properly with cleanup

## Usage

### Starting the Monitor

```bash
# Run the monitor
node scripts/vite-monitor.js
```

### Viewing Help

```bash
# Show help message
node scripts/vite-monitor.js --help
# or
node scripts/vite-monitor.js -h
```

## Stopping the Monitor

### Method 1: Keyboard Shortcut (Recommended)
Press **Ctrl + C** in the terminal where the monitor is running

### Method 2: Task Manager / Command Line
```bash
# Find running Node processes
tasklist | findstr node

# Kill specific process by PID
taskkill /PID <PROCESS_ID> /F

# Kill all Node processes
taskkill /IM node.exe /F
```

## Output Files

### 1. Vite Monitor Log (`vite-monitor.log`)
- Location: Project root directory
- Format: Timestamped entries with log levels
- Contains: All stdout/stderr output from Vite server
- Example entry:
  ```
  [2025-11-16T10:55:02.351Z] [OUTPUT] [STDOUT] VITE v5.4.21 ready in 280ms
  [2025-11-16T10:55:02.352Z] [SERVER] 🌐 Local server: http://localhost:3000
  ```

### 2. Summary JSON (`vite-monitor-summary.json`)
- Location: Project root directory
- Format: JSON structure with comprehensive statistics
- Contains:
  ```json
  {
    "runtime": 12345,
    "serverInfo": {
      "localUrl": "http://localhost:3000",
      "networkUrls": ["http://172.31.0.1:3000"],
      "port": 3000,
      "readyTime": 280
    },
    "errors": [],
    "warnings": [],
    "summary": {
      "totalErrors": 0,
      "totalWarnings": 1,
      "status": "SUCCESS"
    }
  }
  ```

## Error Detection

The monitor automatically detects and categorizes the following error types:

### Import Errors
- Failed to resolve imports (e.g., `@/components/MyComponent.vue`)
- Module not found errors
- Path resolution issues

### Build Errors
- Compilation failures
- Syntax errors
- Type errors
- Build process failures

### General Errors
- Runtime errors
- Configuration errors
- Dependency issues

### Example Error Detection
```
🚨 ERROR DETECTED: Failed to resolve import "@/views/ComponentAnalysis.vue" from "src/router/index.ts"
[ERROR] [STDERR] Module not found: Error: Can't resolve '@/views/ComponentAnalysis.vue'
```

## Server Information Tracking

The script captures:
- **Local Server URL**: Usually `http://localhost:3000`
- **Network URLs**: Available network interfaces
- **Port Number**: The port the server is running on
- **Startup Time**: Time taken for server to be ready
- **Runtime Duration**: How long the server has been running

## Log Levels

- **START**: Monitor startup messages
- **INFO**: General information
- **OUTPUT**: Standard Vite output
- **WARN**: Warnings (from stderr)
- **ERROR**: Errors detected
- **SERVER**: Server-related information
- **SUMMARY**: Final summary report
- **SHUTDOWN**: Shutdown messages
- **EXIT**: Process exit information

## Performance Metrics

The script tracks:
- Server startup time (in milliseconds)
- Total runtime duration
- Error and warning counts
- Success/failure status

## Troubleshooting

### Common Issues

1. **Script won't start**
   - Ensure Node.js is installed
   - Check if `scripts/vite-monitor.js` exists
   - Verify you're in the project root directory

2. **No server information detected**
   - Vite may have failed to start
   - Check for errors in the log file
   - Verify your `vite.config.ts` configuration

3. **Missing log files**
   - Check write permissions in project directory
   - Ensure the script completes gracefully (Ctrl+C)
   - Look for log files in project root

### Log Analysis

To analyze issues:
1. Check `vite-monitor.log` for detailed timeline
2. Review `vite-monitor-summary.json` for quick overview
3. Look for ERROR entries in the log
4. Check server startup sequence

## Integration with Development Workflow

### Recommended Usage
1. Start monitor before making significant changes
2. Monitor for immediate error feedback
3. Review summary reports after development sessions
4. Use log files for debugging persistent issues

### Best Practices
- Use monitor for testing new features
- Run before committing code changes
- Monitor during refactoring sessions
- Check error patterns for common issues

## Technical Details

### Dependencies
- Node.js (built-in modules only)
- No external dependencies required

### Platform Support
- Windows (primary testing environment)
- macOS (should work)
- Linux (should work)

### Process Management
- Spawns child process for `npm run dev:vite`
- Captures stdout/stderr streams
- Handles graceful shutdown signals
- Implements proper cleanup procedures

## Example Session

```bash
$ node scripts/vite-monitor.js

[2025-11-16T10:55:02.000Z] [START] 🚀 Starting Vite Development Server Monitor...
[2025-11-16T10:55:02.001Z] [INFO] ⏰ Monitor started at: 2025-11-16T10:55:02.001Z
[2025-11-16T10:55:02.001Z] [INFO] 📝 Log file: /path/to/project/vite-monitor.log

[2025-11-16T10:55:02.350Z] [OUTPUT] [STDOUT] VITE v5.4.21 ready in 280ms
[2025-11-16T10:55:02.351Z] [SERVER] ⌡ Local:   http://localhost:3000/
[2025-11-16T10:55:02.352Z] [SERVER] 🌐 Local server: http://localhost:3000
[2025-11-16T10:55:02.352Z] [SERVER] ⚡ Ready in: 280ms

^C
[2025-11-16T10:56:30.000Z] [SHUTDOWN] 🛑 Received SIGINT, shutting down gracefully...
[2025-11-16T10:56:30.001Z] [EXIT] 🛑 Process exited with code: 0

📊 MONITOR SUMMARY
==================================================
⏱️  Runtime: 88s
🌐 Server: http://localhost:3000
🚨 Errors: 0
⚠️  Warnings: 1
📈 Status: SUCCESS
```

## Future Enhancements

Potential improvements for future versions:
- Web dashboard interface
- Real-time browser notifications
- Integration with IDEs
- Performance benchmarking
- Automated error categorization
- Integration with CI/CD pipelines