import chalk from 'chalk';

export function log(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' | 'warn' = 'info',
): void {
    const prefix = {
        info: chalk.blue('ℹ'),
        success: chalk.green('✔'),
        error: chalk.red('✖'),
        warn: chalk.yellow('⚠'),
        warning: chalk.yellow('⚠'),
    }[type];

    console.log(`${prefix} ${message}`);
}
