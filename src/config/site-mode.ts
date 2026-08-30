import { publicEnv } from './env.public';

/** True unless the deployment is running in games-only mode. */
export const lotteryEnabled = publicEnv.siteMode !== 'games';

/** True unless the deployment is running in lottery-only mode. */
export const gamesEnabled = publicEnv.siteMode !== 'lottery';
