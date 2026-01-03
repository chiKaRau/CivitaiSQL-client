// components/TopTagsDropdown.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
type ServerSource = Exclude<Source, 'other'>;

const toServerSource = (s: Source): ServerSource => (s === 'other' ? 'all' : s);

interface Props {
    filterText: string;
    setFilterText: (s: string) => void;
    isDarkMode: boolean;
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
    isDarkMode,
    filterText,
    setFilterText,
    tagSource,
    setTagSource,
    clientOtherTags,
    pageSize = 300,        // now this is "batch size" per fetch
    minLen = 3,
    allowNumbers = false,
    search,
    op,
    disabled
}) => {
    const dispatch = useDispatch();

    // dropdown open state (so we can attach observers only when open)
    const [open, setOpen] = useState(false);

    // exclude list
    const [excluded, setExcluded] = useState<string[]>([]);

    // edit title
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(filterText || '');

    // SERVER infinite-scroll state
    const [rows, setRows] = useState<TagCountDTO[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [nextPage, setNextPage] = useState(0); // next server page to fetch (0-based)
    const [initialLoading, setInitialLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // CLIENT infinite-scroll state (for tagSource === 'other' with clientOtherTags)
    const [visibleCount, setVisibleCount] = useState(pageSize);

    // scroll container refs
    const scrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const inflightRef = useRef(false);

    // load excluded list once
    useEffect(() => {
        (async () => {
            const list = await fetchGetPendingRemoveTagsList(dispatch);
            if (Array.isArray(list)) setExcluded(list.map((s: string) => s.toLowerCase()));
        })();
    }, [dispatch]);

    const isClientMode = (tagSource === 'other' && Array.isArray(clientOtherTags));

    const clientFiltered = useMemo(() => {
        const base = Array.isArray(clientOtherTags) ? clientOtherTags : [];
        return base.filter(({ tag }) => {
            if (!tag) return false;
            const t = tag.toLowerCase();
            if (excluded.includes(t)) return false;
            if (!allowNumbers && /^\d+$/.test(t)) return false;
            return tag.length >= minLen;
        });
    }, [clientOtherTags, excluded, allowNumbers, minLen]);

    const displayedRows = useMemo(() => {
        const base = isClientMode ? clientFiltered.slice(0, visibleCount) : rows;
        return base.filter(r => r.tag && !excluded.includes(r.tag.toLowerCase()));
    }, [isClientMode, clientFiltered, visibleCount, rows, excluded]);

    const canLoadMore = useMemo(() => {
        if (isClientMode) return visibleCount < clientFiltered.length;
        return nextPage < totalPages;
    }, [isClientMode, visibleCount, clientFiltered.length, nextPage, totalPages]);

    const titleText = useMemo(
        () => filterText || '-- Top Tags (choose one) --',
        [filterText]
    );

    const resetList = useCallback(() => {
        setRows([]);
        setTotalPages(1);
        setNextPage(0);
        setVisibleCount(pageSize);

        // reset scroll position (only if panel exists)
        const el = scrollRef.current as any;
        if (el) el.scrollTop = 0;
    }, [pageSize]);

    // Whenever inputs change, reset list.
    // If dropdown is open, also start loading immediately.
    useEffect(() => {
        resetList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagSource, pageSize, minLen, allowNumbers, search, op, isClientMode, resetList]);

    const loadMore = useCallback(async () => {
        if (!open) return;
        if (!canLoadMore) return;
        if (inflightRef.current) return;

        // client-mode: just reveal more
        if (isClientMode) {
            inflightRef.current = true;
            try {
                setVisibleCount(v => Math.min(v + pageSize, clientFiltered.length));
            } finally {
                inflightRef.current = false;
            }
            return;
        }

        // server-mode: fetch next page and append
        inflightRef.current = true;

        const isFirst = (rows.length === 0 && nextPage === 0);
        if (isFirst) setInitialLoading(true);
        else setLoadingMore(true);

        try {
            const req: TopTagsRequest = {
                page: nextPage,
                size: pageSize,
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

            setTotalPages(tp);
            setRows(prev => (nextPage === 0 ? content : [...prev, ...content]));
            setNextPage(p => p + 1);
        } catch (e) {
            console.error(e);
        } finally {
            setInitialLoading(false);
            setLoadingMore(false);
            inflightRef.current = false;
        }
    }, [
        open,
        canLoadMore,
        isClientMode,
        pageSize,
        clientFiltered.length,
        rows.length,
        nextPage,
        dispatch,
        tagSource,
        excluded,
        minLen,
        allowNumbers,
        search,
        op
    ]);

    // When dropdown opens: if empty, load first batch
    useEffect(() => {
        if (!open) return;
        if (displayedRows.length === 0) {
            loadMore();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // IntersectionObserver to auto-load when reaching bottom (root = scroll panel)
    useEffect(() => {
        if (!open) return;

        const root = scrollRef.current as any;
        const target = sentinelRef.current as any;
        if (!root || !target) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const hit = entries?.[0]?.isIntersecting;
                if (hit) loadMore();
            },
            {
                root,
                rootMargin: '500px', // start loading before you actually hit bottom
                threshold: 0
            }
        );

        obs.observe(target);
        return () => obs.disconnect();
    }, [open, loadMore]);

    // Also load on manual scroll near-bottom (fallback)
    const handleScroll = useCallback((e: any) => {
        const el = e.currentTarget;
        const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
        if (remaining < 500) loadMore();
    }, [loadMore]);

    // Prevent parent scroll from taking over (panel-only scrolling feel)
    const handleWheelCapture = useCallback((e: any) => {
        e.stopPropagation();
    }, []);

    const handleRemoveTag = async (tag: string) => {
        try {
            await fetchAddPendingRemoveTag(tag, dispatch);
            setExcluded(prev => [...prev, tag.toLowerCase()]);

            // remove instantly from current view (no need to refetch)
            setRows(prev => prev.filter(r => r.tag?.toLowerCase() !== tag.toLowerCase()));
        } catch (e) {
            console.error('remove tag failed', e);
        }
    };

    const refreshNow = useCallback(async () => {
        // always scroll panel to top
        const el = scrollRef.current as any;
        if (el) el.scrollTop = 0;

        // client mode: just reset how many are visible
        if (isClientMode) {
            setVisibleCount(pageSize);
            return;
        }

        // server mode: refetch page 0 without "resetting" through effects
        if (inflightRef.current) return;
        inflightRef.current = true;

        setInitialLoading(true);
        try {
            const req: TopTagsRequest = {
                page: 0,
                size: pageSize,
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

            setRows(content);
            setTotalPages(tp);
            setNextPage(1); // next loadMore() will fetch page 1
        } catch (e) {
            console.error(e);
        } finally {
            setInitialLoading(false);
            inflightRef.current = false;
        }
    }, [
        dispatch,
        isClientMode,
        pageSize,
        tagSource,
        excluded,
        minLen,
        allowNumbers,
        search,
        op
    ]);


    // --- Dark mode theme (inline, no CSS file needed) ---
    const theme = useMemo(() => {
        if (!isDarkMode) {
            return {
                menuBg: '#ffffff',
                menuText: '#111827',
                border: 'rgba(0,0,0,.12)',
                headerBg: '#f8fafc',
                headerText: '#0f172a',
                muted: 'rgba(15, 23, 42, .65)',

                chipBg: '#f8fafc',
                chipBorder: 'rgba(0,0,0,.18)',
                chipText: '#0f172a',
                chipHoverBg: '#eef2ff',

                countBg: 'rgba(37,99,235,.10)',
                countText: '#1d4ed8',

                danger: '#ef4444',
                dangerHoverBg: 'rgba(239,68,68,.10)',
            };
        }

        // Dark mode colors (modern "slate" look)
        return {
            menuBg: '#0b1220',               // deep navy
            menuText: '#e5e7eb',             // gray-200
            border: 'rgba(148,163,184,.22)', // slate-ish border
            headerBg: '#0f172a',             // slate-900
            headerText: '#e5e7eb',
            muted: 'rgba(226,232,240,.70)',  // slate-200-ish muted

            chipBg: '#111827',               // gray-900
            chipBorder: 'rgba(148,163,184,.22)',
            chipText: '#e5e7eb',
            chipHoverBg: '#172554',          // deep blue hover (subtle)

            countBg: 'rgba(96,165,250,.14)', // blue-400 tint
            countText: '#93c5fd',            // blue-300

            danger: '#fb7185',               // rose-400
            dangerHoverBg: 'rgba(251,113,133,.16)',
        };
    }, [isDarkMode]);

    const chipHoverStyle: React.CSSProperties = {
        background: theme.chipHoverBg,
        borderColor: theme.border,
    };


    // BIG PANEL styles (adjust as you like)
    const panelStyle: React.CSSProperties = {
        maxHeight: '70vh',
        minWidth: 520,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 0,
        overscrollBehavior: 'contain',
        background: theme.menuBg,
        color: theme.menuText,
    };


    const stickyHeaderStyle: React.CSSProperties = {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        padding: '10px 12px',
        background: theme.headerBg,
        color: theme.headerText,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
    };

    return (
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {/* LEFT: dropdown with big infinite-scroll panel */}
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
                <Dropdown
                    style={{ flex: 1 }}
                    show={open}
                    onToggle={(nextOpen) => setOpen(!!nextOpen)}
                >
                    <Dropdown.Toggle
                        disabled={disabled}
                        variant="secondary"
                        style={{ width: '100%' }}
                        onDoubleClick={() => { setEditValue(filterText); setIsEditing(true); }}
                    >
                        {titleText}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                        style={{ width: '100%', padding: 0 }}
                        popperConfig={{ strategy: 'fixed' }} // helps avoid clipping by parent overflow
                    >
                        <div
                            ref={scrollRef}
                            style={panelStyle}
                            onScroll={handleScroll}
                            onWheelCapture={handleWheelCapture}
                        >
                            {/* Sticky header */}
                            <div style={stickyHeaderStyle}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                    {(initialLoading) && (
                                        <>
                                            <Spinner animation="border" size="sm" />
                                            <span>Loading more tags...</span>
                                        </>
                                    )}
                                    {!initialLoading && (
                                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                                            Showing {displayedRows.length}
                                            {isClientMode ? ` / ${clientFiltered.length}` : ''}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                                        Scroll to load more
                                    </span>

                                    <Button
                                        size="sm"
                                        variant={isDarkMode ? 'outline-light' : 'outline-secondary'}
                                        disabled={initialLoading || loadingMore}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation(); // keep dropdown open
                                            refreshNow();
                                        }}
                                        style={{ padding: '2px 10px', lineHeight: 1.2 }}
                                        title="Reload from the beginning"
                                    >
                                        Refresh
                                    </Button>
                                </div>

                            </div>

                            {/* list */}
                            {displayedRows.length === 0 && !initialLoading && (
                                <div style={{ padding: 12, color: theme.muted }}>
                                    No tags found.
                                </div>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    padding: 10,
                                }}
                            >
                                {displayedRows.map(({ tag, count }) => (
                                    <div
                                        key={tag}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setFilterText(tag)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setFilterText(tag);
                                        }}
                                        onMouseEnter={(e) => {
                                            Object.assign(e.currentTarget.style, chipHoverStyle);
                                        }}
                                        onMouseLeave={(e) => {
                                            // reset
                                            e.currentTarget.style.background = theme.chipBg;
                                            e.currentTarget.style.borderColor = theme.chipBorder;
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            border: `1px solid ${theme.chipBorder}`,
                                            background: theme.chipBg,
                                            color: theme.chipText,
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            whiteSpace: 'nowrap',
                                            transition: 'background-color .12s ease, border-color .12s ease',
                                        }}
                                        title={`count: ${count}`}
                                    >
                                        <span style={{ color: theme.chipText }}>{tag}</span>

                                        {/* count pill */}
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 12,
                                                padding: '2px 8px',
                                                borderRadius: 999,
                                                background: theme.countBg,
                                                color: theme.countText,
                                            }}
                                        >
                                            {count}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveTag(tag);
                                            }}
                                            title="Exclude this tag next time"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = theme.dangerHoverBg;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                padding: 0,
                                                width: 18,
                                                height: 18,
                                                borderRadius: 6,
                                                lineHeight: 1,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: theme.danger,
                                                transition: 'background-color .12s ease',
                                            }}
                                        >
                                            <IoCloseOutline />
                                        </button>
                                    </div>
                                ))}
                            </div>


                            {/* sentinel for IntersectionObserver */}
                            <div ref={sentinelRef} style={{ height: 1 }} />

                            {/* bottom loader */}
                            {loadingMore && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: 12, gap: 8 }}>
                                    <Spinner animation="border" size="sm" />
                                    <span>Loading more...</span>
                                </div>
                            )}

                            {/* end indicator */}
                            {!loadingMore && displayedRows.length > 0 && !canLoadMore && (
                                <div style={{ textAlign: 'center', padding: 10, color: theme.muted, fontSize: 12 }}>
                                    End of list
                                </div>
                            )}
                        </div>
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
                    <Dropdown.Item onClick={() => { setTagSource('all'); }}>All</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setTagSource('tags'); }}>Tags</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setTagSource('fileName'); }}>File Name</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setTagSource('titles'); }}>Titles</Dropdown.Item>
                    <Dropdown.Item onClick={() => { setTagSource('other'); }}>Entries</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
};

export default TopTagsDropdown;
