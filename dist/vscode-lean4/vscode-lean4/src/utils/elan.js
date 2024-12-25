import { batchExecuteWithProgress } from './batch';
export async function elanSelfUpdate(channel) {
    return await batchExecuteWithProgress('elan', ['self', 'update'], 'Updating Elan', { channel });
}
