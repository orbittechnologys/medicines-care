// src/routes/private/importHandler.js
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Async import handler that spawns the import script in the background.
 * Returns 202 immediately with the child PID.
 *
 * Request body (JSON):
 * {
 *   "csvPath": "A_Z_medicines_dataset_of_India.csv" // optional - defaults to project root
 * }
 */
export async function importFromCsvHandler(req, res) {
  try {
    const csvPath = req.body?.csvPath || path.join(process.cwd(), "A_Z_medicines_dataset_of_India.csv");

    if (!fs.existsSync(csvPath)) {
      return res.status(400).json({ success: false, error: `CSV not found at ${csvPath}` });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "import-from-csv.js");

    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ success: false, error: `Import script not found at ${scriptPath}` });
    }

    // Spawn node to run the script. Use detached mode to avoid blocking HTTP response.
    // By default we detach and ignore stdio so Postman doesn't wait and server doesn't block.
    const child = spawn(process.execPath, [scriptPath, csvPath], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"], // no output in parent terminal
      env: process.env
    });

    // Let the child run independently
    child.unref();

    return res.status(202).json({
      success: true,
      message: "Import started in background",
      pid: child.pid,
      csvPath
    });
  } catch (e) {
    console.error("[IMPORT-ASYNC] error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
