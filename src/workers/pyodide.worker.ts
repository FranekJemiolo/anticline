import { loadPyodide, type PyodideInterface } from 'pyodide';

// Store the singleton instance
let pyodide: PyodideInterface | null = null;

// Initialize the Pyodide Environment (Run once on worker boot)
async function initPyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;

  // Load the base Pyodide WASM module
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  });

  // Load micropip, which allows us to install PyPI packages dynamically
  await pyodide.loadPackage('micropip');

  return pyodide;
}

// Listen for Messages from the Main UI Thread
self.onmessage = async (event: MessageEvent) => {
  const { action, manifestId, script, requirements } = event.data;

  if (action === 'EXECUTE_ETL') {
    try {
      // Notify UI we are starting
      self.postMessage({ status: 'initializing_environment', manifestId });

      const py = await initPyodide();
      const micropip = py.pyimport('micropip');

      // Dynamically Install Dependencies from the Manifest
      if (requirements && requirements.length > 0) {
        self.postMessage({
          status: 'installing_dependencies',
          manifestId,
          packages: requirements,
        });

        // Ensure critical bridging libraries are always present
        const coreDeps = ['pandas', 'pyarrow'];
        const allDeps = [...new Set([...coreDeps, ...requirements])];

        await micropip.install(allDeps);
      }

      self.postMessage({ status: 'executing_script', manifestId });

      // Execute the Python Script
      const resultBuffer = await py.runPythonAsync(script);

      // Return the raw Arrow buffer to the Main Thread via Zero-Copy transfer
      if (resultBuffer && resultBuffer.buffer instanceof ArrayBuffer) {
        (self as any).postMessage(
          { status: 'complete', manifestId, buffer: resultBuffer },
          [resultBuffer.buffer]
        );
      } else {
        self.postMessage({ status: 'complete', manifestId, buffer: resultBuffer });
      }
    } catch (error: any) {
      console.error('Pyodide execution failed:', error);
      self.postMessage({
        status: 'error',
        manifestId,
        error: error ? error.toString() : 'Unknown error',
      });
    }
  }
};
