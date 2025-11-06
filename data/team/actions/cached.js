// data/team/actions/cached.js
// Cached team actions để share data giữa layout và pages

import { cache } from 'react';
import { getByIdAction } from './server.js';

/**
 * Cached version of getByIdAction
 * Sử dụng React.cache để deduplicate requests trong cùng render tree
 * Layout và page có thể gọi cùng lúc mà chỉ fetch 1 lần
 */
export const getCachedTeamById = cache(async (teamId) => {
    return await getByIdAction(teamId);
});
