import { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';

async function globalTeardown(config: FullConfig) {
    console.log('Running global teardown: tearing down Docker Compose...');
    try {
        // Executes `docker compose down --volumes` from the root directory
        execSync('docker compose down --volumes', { stdio: 'inherit' });
        console.log('Docker compose down completed successfully.');
    } catch (error) {
        console.error('Failed to run docker compose down:', error);
        process.exit(1);
    }
}

export default globalTeardown;