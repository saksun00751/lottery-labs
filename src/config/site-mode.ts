import { publicEnv } from './env.public';

/**
 * UI/routing gates only — these control what's linked in nav and which
 * routes redirect away, not what the backend will accept. The API has no
 * concept of site mode, so a disabled vertical's endpoints still work if
 * called directly.
 */

/** True unless the deployment is running in games-only mode. */
export const lotteryEnabled = publicEnv.siteMode !== 'games';

/** True unless the deployment is running in lottery-only mode. */
export const gamesEnabled = publicEnv.siteMode !== 'lottery';
