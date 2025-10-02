// components/TopTagsDropdown.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, FormControl, Spinner } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { IoCloseOutline } from "react-icons/io5";

import {
    fetchGetPendingRemoveTagsList,
    fetchAddPendingRemoveTag,
    fetchTopTagsPage,
    TagCountDTO,
    TopTagsRequest
} from '../../api/civitaiSQL_api';

type Source = 'all' | 'tags' | 'fileName' | 'titles' | 'other';
type ServerSource = Exclude<Source, 'other'>; // what the API accepts

const toServerSource = (s: Source): ServerSource => (s === 'other' ? 'all' : s);

interface Props {
    filterText: string;
    setFilterText: (s: string) => void;

    tagSource: Source;
    setTagSource: (s: Source) => void;

    pageSize?: number;
    minLen?: number;
    allowNumbers?: boolean;

    search?: string;
    op?: TopTagsRequest['op'];

    disabled?: boolean;

    /** Optional: if provided and tagSource === 'other', we page these client-side. */
    clientOtherTags?: TagCountDTO[];
}

const TopTagsDropdown: React.FC<Props> = ({
    filterText,
    setFilterText,
    tagSource,
    setTagSource,
    clientOtherTags,
    pageSize = 100,
    minLen = 3,
    allowNumbers = false,
    search,
    op,
    disabled
}) => {
    const dispatch = useDispatch();

    // pagination (0-based)
    const [page, setPage] = useState(0);

    // rows + page count
    const [rows, setRows] = useState<TagCountDTO[]>([]);
    const [totalPages, setTotalPages] = useState(1);

    // exclude list
    const [excluded, setExcluded] = useState<string[]>([]);

    // edit title
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(filterText || '');

    // loading flag for spinner (menu stays interactive)
    const [loading, setLoading] = useState(false);

    // inline pager editing
    const [isPageEditing, setIsPageEditing] = useState(false);
    const [pageInput, setPageInput] = useState<string>('');

    // load excluded list once
    useEffect(() => {
        (async () => {
            const list = await fetchGetPendingRemoveTagsList(dispatch);
            if (Array.isArray(list)) setExcluded(list.map((s: string) => s.toLowerCase()));
        })();
    }, [dispatch]);

    // fetch/paginate rows whenever inputs change
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // Use server for everything unless we explicitly have clientOtherTags for 'other'
            const useServer = tagSource !== 'other' || !clientOtherTags;

            setLoading(useServer);

            if (!useServer) {
                // client-side paging for Entries
                const base = Array.isArray(clientOtherTags) ? clientOtherTags : [];
                const filtered = base.filter(({ tag }) => {
                    if (!tag) return false;
                    const t = tag.toLowerCase();
                    if (excluded.includes(t)) return false;
                    if (!allowNumbers && /^\d+$/.test(t)) return false;
                    return tag.length >= minLen;
                });

                const tp = Math.max(1, Math.ceil(filtered.length / pageSize));
                const safePage = page >= tp ? 0 : page;

                if (!cancelled) {
                    if (safePage !== page) setPage(0);
                    setRows(filtered.slice((safePage) * pageSize, (safePage) * pageSize + pageSize));
                    setTotalPages(tp);
                }
                return;
            }

            try {
                const req: TopTagsRequest = {
                    page,
                    size: pageSize,
                    // 👇 map 'other' → 'all' so it matches API type
                    source: toServerSource(tagSource),
                    exclude: excluded,
                    minLen,
                    allowNumbers,
                    search,
                    op
                };

                const data = await fetchTopTagsPage(dispatch, req);
                const content: TagCountDTO[] = Array.isArray(data?.content) ? data.content : [];
                const tp = Math.max(1, data?.totalPages || 1);

                if (!cancelled) {
                    setRows(content);
                    setTotalPages(tp);
                    if (page >= tp) setPage(0);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [dispatch, page, pageSize, tagSource, excluded, minLen, allowNumbers, search, op, clientOtherTags]);

    const canPrev = page > 0;
    const canNext = (page + 1 < totalPages);

    const handleRemoveTag = async (tag: string) => {
        try {
            await fetchAddPendingRemoveTag(tag, dispatch);
            setExcluded(prev => [...prev, tag.toLowerCase()]);
        } catch (e) {
            console.error('remove tag failed', e);
        }
    };

    const titleText = useMemo(
        () => filterText || '-- Top Tags (choose one) --',
        [filterText]
    );

    const clampToPage = (n: number) =>
        Math.min(Math.max(1, n), Math.max(1, totalPages));

    const commitPageInput = () => {
        const n = clampToPage(Number(pageInput));
        if (!Number.isNaN(n)) setPage(n - 1);
        setIsPageEditing(false);
    };

    const Pager: React.FC = () => (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: 8 }}>
            <Button
                size="sm"
                disabled={!canPrev}
                onClick={e => { e.stopPropagation(); setPage(p => Math.max(0, p - 1)); }}
            >
                Prev
            </Button>

            <span style={{ flex: 1, textAlign: 'center' }}>
                {isPageEditing ? (
                    <input
                        type="number"
                        min={1}
                        max={totalPages || 1}
                        value={pageInput}
                        autoFocus
                        onChange={e => setPageInput(e.target.value)}
                        onBlur={commitPageInput}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitPageInput();
                            if (e.key === 'Escape') setIsPageEditing(false);
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: 80,
                            textAlign: 'center',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #ccc'
                        }}
                    />
                ) : (
                    <span
                        onDoubleClick={e => {
                            e.stopPropagation();
                            setPageInput(String(page + 1));
                            setIsPageEditing(true);
                        }}
                        title="Double-click to jump to a page"
                        style={{ userSelect: 'none', cursor: 'text' }}
                    >
                        {page + 1} / {totalPages}
                    </span>
                )}
            </span>

            <Button
                size="sm"
                disabled={!canNext}
                onClick={e => { e.stopPropagation(); setPage(p => p + 1); }}
            >
                Next
            </Button>
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {/* LEFT: dropdown with paged top tags */}
            {isEditing ? (
                <FormControl
                    style={{ flex: 1 }}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                    onBlur={() => { setFilterText(editValue); setIsEditing(false); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { setFilterText(editValue); setIsEditing(false); }
                        if (e.key === 'Escape') { setIsEditing(false); }
                    }}
                />
            ) : (
                <Dropdown style={{ flex: 1 }}>
                    <Dropdown.Toggle
                        disabled={disabled}
                        variant="secondary"
                        style={{ width: '100%' }}
                        onDoubleClick={() => { setEditValue(filterText); setIsEditing(true); }}
                    >
                        {titleText}
                    </Dropdown.Toggle>

                    <Dropdown.Menu style={{ width: '100%', maxHeight: 420, overflowY: 'auto' }}>
                        {/* spinner row at the very top (menu stays interactive) */}
                        {loading && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                                    <Spinner animation="border" size="sm" />
                                    <span style={{ marginLeft: 8 }}>Loading…</span>
                                </div>
                                <Dropdown.Divider />
                            </>
                        )}

                        {/* pager controls (top) */}
                        <Pager />

                        <Dropdown.Divider />

                        {rows.map(({ tag, count }) => (
                            <Dropdown.Item
                                as="div"
                                key={tag}
                                onClick={() => setFilterText(tag)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer'
                                }}
                            >
                                <span>{tag}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <b>{count}</b>
                                    <Button
                                        variant="link"
                                        style={{ color: 'red', textDecoration: 'none', padding: 0 }}
                                        onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                                        title="Exclude this tag next time"
                                    >
                                        <IoCloseOutline />
                                    </Button>
                                </span>
                            </Dropdown.Item>
                        ))}

                        <Dropdown.Divider />

                        {/* pager controls (bottom) */}
                        <Pager />
                    </Dropdown.Menu>
                </Dropdown>
            )}

            {/* RIGHT: source selector */}
            <Dropdown style={{ width: 220 }}>
                <Dropdown.Toggle disabled={disabled} variant="secondary" style={{ width: '100%' }}>
                    {tagSource === 'all'
                        ? 'All'
                        : tagSource === 'tags'
                            ? 'Tags'
                            : tagSource === 'fileName'
                                ? 'File Name'
                                : tagSource === 'titles'
                                    ? 'Titles'
                                    : 'Entries'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ width: '100%' }}>
                    <Dropdown.Item onClick={() => { setPage(0); setTagSource('all'); }}>All</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setPage(0); setTagSource('tags'); }}>Tags</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setPage(0); setTagSource('fileName'); }}>File Name</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setPage(0); setTagSource('titles'); }}>Titles</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setPage(0); setTagSource('other'); }}>Entries</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
};

export default TopTagsDropdown;
