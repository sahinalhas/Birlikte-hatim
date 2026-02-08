
import { supabase } from '@/lib/supabase';
import { groupsService, juzService } from '@/lib/database';

export async function apiRequest(method: string, url: string, body?: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Handle Group Counter API
    // Regex for /api/groups/:id/counter
    const groupCounterMatch = url.match(/^\/api\/groups\/([^/]+)\/counter$/);
    if (groupCounterMatch && method === 'POST') {
        const groupId = groupCounterMatch[1];
        const { count } = body;
        return await groupsService.incrementCount(groupId, count, user.id);
    }

    // Handle Group Detail / Delete API
    const groupMatch = url.match(/^\/api\/groups\/([^/]+)$/);
    if (groupMatch) {
        const groupId = groupMatch[1];
        if (method === 'GET') {
            return await groupsService.getGroupDetail(groupId, user?.id);
        }
        if (method === 'DELETE') {
            return await groupsService.deleteGroup(groupId);
        }
    }

    // Handle Juz Assign API
    const juzAssignMatch = url.match(/^\/api\/juz\/([^/]+)\/assign$/);
    if (juzAssignMatch && method === 'POST') {
        const juzId = juzAssignMatch[1];
        return await juzService.assignJuz(juzId, user.id);
    }

    // Handle Juz Complete API
    const juzCompleteMatch = url.match(/^\/api\/juz\/([^/]+)\/complete$/);
    if (juzCompleteMatch && method === 'POST') {
        const juzId = juzCompleteMatch[1];
        return await juzService.completeJuz(juzId, user.id);
    }

    throw new Error(`Unhandled API request: ${method} ${url}`);
}
