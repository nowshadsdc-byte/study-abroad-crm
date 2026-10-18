import apiCandidates from '@/routes/api/candidates';
import apiLeads from '@/routes/api/leads';

export const MIN_RECORD_QUERY_LENGTH = 2;

export type RecordHit = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

async function fetchHits(
    url: string,
    limit: number,
    signal: AbortSignal,
): Promise<RecordHit[]> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        return [];
    }

    const body = (await response.json()) as { data: RecordHit[] };

    return body.data.slice(0, limit);
}

/**
 * Search leads or clients (candidates) by name, email or phone through the
 * existing list endpoints. Returns at most `limit` hits.
 */
export function searchRecords(
    type: 'lead' | 'client',
    query: string,
    signal: AbortSignal,
    limit = 5,
): Promise<RecordHit[]> {
    const options = { query: { search: query, per_page: 10 } };
    const url =
        type === 'lead'
            ? apiLeads.index.url(options)
            : apiCandidates.index.url(options);

    return fetchHits(url, limit, signal);
}
