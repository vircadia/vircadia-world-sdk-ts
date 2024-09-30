import EC from 'eight-colors';

export function log(data: {
    message: string,
    type?: 'info' | 'success' | 'error' | 'warning' | 'warn' | 'debug',
    debug?: boolean,
}): void {
    if (!data.type) {
        console.log(data.message);
        return;
    }

    switch (data.type) {
        case 'debug':
            if (data.debug) {
                console.debug(EC.blue(`ℹ ${data.message}`));
            }
            break;
        case 'info':
            console.info(EC.blue(`ℹ ${data.message}`));
            break;
        case 'success':
            console.log(EC.green(`✔ ${data.message}`));
            break;
        case 'error':
            console.error(EC.red(`✖ ${data.message}`));
            break;
        case 'warn':
        case 'warning':
            console.warn(EC.yellow(`⚠ ${data.message}`));
            break;
        default:
            console.info(EC.white(`? ${data.message}`));
            break;
    }
}
