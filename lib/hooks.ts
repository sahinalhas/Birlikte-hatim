import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    groupsService,
    juzService,
    activitiesService,
    realtimeService,
    Group,
    JuzAssignment,
} from './database';
import { supabase } from './supabase';

// ============================================
// USE GROUPS HOOK
// ============================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// QUERY KEYS
// ============================================
export const QUERY_KEYS = {
    groups: (userId?: string) => ['groups', userId],
    publicGroups: ['publicGroups'],
    groupDetail: (groupId: string) => ['groupDetail', groupId],
    groupMembers: (groupId: string) => ['groupMembers', groupId],
    groupActivities: (groupId: string) => ['groupActivities', groupId],
    juzAssignments: (groupId: string) => ['juzAssignments', groupId],
};

// ============================================
// USE GROUPS HOOK (Optimized with React Query)
// ============================================
export function useGroups() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch User Groups
    const {
        data: groups = [],
        isLoading: isLoadingMyGroups,
        error: errorMyGroups,
        refetch: refetchMyGroups
    } = useQuery({
        queryKey: QUERY_KEYS.groups(user?.id),
        queryFn: async () => {
            if (!user) return [];
            return await groupsService.getMyGroups(user.id);
        },
        enabled: !!user,
    });

    // 2. Fetch Public Groups
    const {
        data: publicGroups = [],
        isLoading: isLoadingPublic,
        error: errorPublic,
        refetch: refetchPublicGroups
    } = useQuery({
        queryKey: QUERY_KEYS.publicGroups,
        queryFn: async () => {
            return await groupsService.getPublicGroups(20);
        },
    });

    // Combined loading & error states
    const isLoading = isLoadingMyGroups || isLoadingPublic;
    const error = errorMyGroups || errorPublic;

    // 3. Mutations (Create, Join, Leave, Delete)
    const createGroupMutation = useMutation({
        mutationFn: async (groupData: Parameters<typeof groupsService.createGroup>[0]) => {
            let currentUser = user;
            if (!currentUser) {
                const { data } = await supabase.auth.getUser();
                currentUser = data.user as any;
            }
            if (!currentUser) throw new Error('Not authenticated');

            return await groupsService.createGroup({
                ...groupData,
                creator_id: currentUser.id,
            });
        },
        onSuccess: (newGroup) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups(user?.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicGroups });
            if (newGroup?.id) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(newGroup.id) });
            }
            // Ensure any local state or other components using useGroups are notified
            queryClient.refetchQueries({ queryKey: ['groups'] });
        },
    });

    const joinGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            let currentUser = user;
            if (!currentUser) {
                const { data } = await supabase.auth.getUser();
                currentUser = data.user as any;
            }
            if (!currentUser) throw new Error('Not authenticated');

            await groupsService.joinGroup(groupId, currentUser.id);
        },
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicGroups });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        },
    });

    const leaveGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            let currentUser = user;
            if (!currentUser) {
                const { data } = await supabase.auth.getUser();
                currentUser = data.user as any;
            }
            if (!currentUser) throw new Error('Not authenticated');

            await groupsService.leaveGroup(groupId, currentUser.id);
        },
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicGroups });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            await groupsService.deleteGroup(groupId);
        },
        onSuccess: (_, groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicGroups });
            queryClient.removeQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        },
    });

    // Helper to refresh all
    const refetchAll = async () => {
        await Promise.all([refetchMyGroups(), refetchPublicGroups()]);
    };

    return {
        groups,
        publicGroups,
        isLoading,
        error: error as Error | null,
        refetch: refetchAll,
        createGroup: createGroupMutation.mutateAsync,
        joinGroup: joinGroupMutation.mutateAsync,
        leaveGroup: leaveGroupMutation.mutateAsync,
        deleteGroup: deleteGroupMutation.mutateAsync,
        isCreating: createGroupMutation.isPending,
        isJoining: joinGroupMutation.isPending,
    };
}

// ============================================
// USE GROUP DETAIL HOOK (Refactored to React Query)
// ============================================
export function useGroupDetail(groupId: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Group Core Info
    const {
        data: group = null,
        isLoading: isLoadingGroup,
        refetch: refetchGroup
    } = useQuery({
        queryKey: QUERY_KEYS.groupDetail(groupId),
        queryFn: () => groupsService.getGroupDetail(groupId, user?.id),
        enabled: !!groupId,
    });

    // 2. Members
    const {
        data: members = [],
        isLoading: isLoadingMembers
    } = useQuery({
        queryKey: QUERY_KEYS.groupMembers(groupId),
        queryFn: () => groupsService.getMembers(groupId),
        enabled: !!groupId,
    });

    // 3. Juz Assignments
    const {
        data: juzAssignments = [],
        isLoading: isLoadingJuz
    } = useQuery({
        queryKey: QUERY_KEYS.juzAssignments(groupId),
        queryFn: () => juzService.getJuzAssignments(groupId),
        enabled: !!groupId,
    });

    // 4. Activities
    const {
        data: activities = [],
        isLoading: isLoadingActivities,
        refetch: refetchActivities
    } = useQuery({
        queryKey: QUERY_KEYS.groupActivities(groupId),
        queryFn: () => activitiesService.getGroupActivities(groupId),
        enabled: !!groupId,
    });

    // Realtime subscription
    useEffect(() => {
        if (!groupId) return;

        // Subscribe to realtime updates for juz assignments
        const juzChannel = realtimeService.subscribeToJuzAssignments(groupId, () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.juzAssignments(groupId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        });

        // Subscribe to group info changes
        const groupChannel = realtimeService.subscribeToGroup(groupId, () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        });

        // Subscribe to activity updates
        const activityChannel = realtimeService.subscribeToActivities(groupId, () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupActivities(groupId) });
        });

        return () => {
            realtimeService.unsubscribe(juzChannel);
            realtimeService.unsubscribe(groupChannel);
            realtimeService.unsubscribe(activityChannel);
        };
    }, [groupId, queryClient]);

    const [isBusy, setIsBusy] = useState(false);

    // Helpers
    const selectJuz = useCallback(async (juzNumbers: number[]) => {
        if (!user) throw new Error('Not authenticated');
        setIsBusy(true);
        try {
            await juzService.assignMultipleJuz(groupId, juzNumbers, user.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.juzAssignments(groupId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        } finally {
            setIsBusy(false);
        }
    }, [groupId, user, queryClient]);

    const completeJuz = useCallback(async (juzId: string, notes?: string) => {
        if (!user) throw new Error('Not authenticated');
        setIsBusy(true);
        try {
            await juzService.completeJuz(juzId, user.id, notes);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.juzAssignments(groupId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        } finally {
            setIsBusy(false);
        }
    }, [groupId, user, queryClient]);

    const abandonJuz = useCallback(async (juzId: string) => {
        if (!user) throw new Error('Not authenticated');
        setIsBusy(true);
        try {
            await juzService.abandonJuz(juzId, user.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.juzAssignments(groupId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        } finally {
            setIsBusy(false);
        }
    }, [groupId, user, queryClient]);

    const addCount = useCallback(async (count: number) => {
        if (!user) throw new Error('Not authenticated');
        setIsBusy(true);
        try {
            await groupsService.incrementCount(groupId, count, user.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupDetail(groupId) });
        } finally {
            setIsBusy(false);
        }
    }, [groupId, user, queryClient]);

    const addReaction = useCallback(async (activityId: string, emoji: string) => {
        if (!user) throw new Error('Not authenticated');
        setIsBusy(true);
        try {
            await activitiesService.addReaction(activityId, user.id, emoji);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupActivities(groupId) });
        } finally {
            setIsBusy(false);
        }
    }, [groupId, user, queryClient]);

    // Progress calculation remains the same
    const progress = group?.type === 'hatim'
        ? (juzAssignments.filter((j: any) => j.status === 'completed').length / 30) * 100
        : group?.target_count
            ? ((group.current_count || 0) / group.target_count) * 100
            : 0;

    return {
        group,
        juzAssignments,
        members,
        activities,
        progress,
        isLoading: isLoadingGroup || isLoadingMembers || isLoadingJuz || isLoadingActivities,
        isBusy,
        refetch: async () => {
            await Promise.all([refetchGroup(), refetchActivities()]);
        },
        selectJuz,
        completeJuz,
        abandonJuz,
        addCount,
        addReaction,
    };
}

// ============================================
// USE INVITE LINK HOOK
// ============================================
export function useInviteLink(inviteCode: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: group = null, isLoading } = useQuery({
        queryKey: ['groupInvite', inviteCode],
        queryFn: () => groupsService.getGroupByInviteCode(inviteCode),
        enabled: !!inviteCode,
    });

    const { data: members = [] } = useQuery({
        queryKey: QUERY_KEYS.groupMembers(group?.id || ''),
        queryFn: () => groupsService.getMembers(group!.id),
        enabled: !!group?.id,
    });

    const isJoined = members.some((m: any) => m.user_id === user?.id);

    const join = useCallback(async () => {
        if (!user || !group) throw new Error('Cannot join');
        await groupsService.joinGroup(group.id, user.id);
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groupMembers(group.id) });
        return group;
    }, [user, group, queryClient]);

    return {
        group,
        isLoading,
        isJoined,
        join,
    };
}
