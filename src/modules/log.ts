import chalk from 'chalk';

export function log(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
): void {
    const prefix = {
        info: chalk.blue('ℹ'),
        success: chalk.green('✔'),
        error: chalk.red('✖'),
        warning: chalk.yellow('⚠'),
    }[type];

    console.log(`${prefix} ${message}`);
}
