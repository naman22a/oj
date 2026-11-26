import { createExecutionWorker } from './execution.worker.ts';

const worker = createExecutionWorker();

console.log('Execution worker started');

async function shutdown() {
    await worker.close();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
