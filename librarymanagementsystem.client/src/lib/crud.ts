import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';

export interface CrudHooks<TDto, TRequest> {
    useList: () => ReturnType<typeof useQuery<TDto[]>>;
    useCreate: () => ReturnType<typeof useMutation<TDto, Error, TRequest>>;
    useUpdate: () => ReturnType<typeof useMutation<TDto, Error, { id: string; body: TRequest }>>;
    useRemove: () => ReturnType<typeof useMutation<void, Error, string>>;
}

/** Query + mutation hooks for a REST resource served at `/api/{resource}`. */
export function createCrudHooks<TDto, TRequest>(resource: string): CrudHooks<TDto, TRequest> {
    const listKey = [resource] as const;

    function useList() {
        return useQuery({
            queryKey: listKey,
            queryFn: async () => (await api.get<TDto[]>(`/${resource}`)).data,
        });
    }

    function useInvalidatingMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
        const queryClient = useQueryClient();
        return useMutation<TResult, Error, TVars>({
            mutationFn: fn,
            // Genres/authors feed the book list (names), so refresh everything that may show them.
            onSuccess: () => queryClient.invalidateQueries(),
        });
    }

    return {
        useList,
        useCreate: () =>
            useInvalidatingMutation(async (body: TRequest) => (await api.post<TDto>(`/${resource}`, body)).data),
        useUpdate: () =>
            useInvalidatingMutation(
                async ({ id, body }: { id: string; body: TRequest }) => (await api.put<TDto>(`/${resource}/${id}`, body)).data,
            ),
        useRemove: () =>
            useInvalidatingMutation(async (id: string) => {
                await api.delete(`/${resource}/${id}`);
            }),
    };
}
