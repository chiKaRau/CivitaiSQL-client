import React from 'react';
import { OfflineDownloadEntry } from './OfflineWindow';

type CivitaiStats = {
    downloadCount?: number;
    ratingCount?: number;
    rating?: number;
    thumbsUpCount?: number;
};

type SimilarResult = {
    modelNumber: number | string;
    versionNumber: number | string;
    baseModel?: string | null;
    mainModelName?: string | null;
    creatorName?: string | null;
    uploaded?: string | null;
    imageUrls?: Array<{ url: string; width?: number; height?: number; nsfw?: any }> | string | null;
    stats?: CivitaiStats | string | null;
    myRating?: number | null;
};

const SimilarSearchPanel: React.FC<{
    entry: OfflineDownloadEntry;
    isDarkMode: boolean;
}> = ({ entry, isDarkMode }) => {
    const [simInput, setSimInput] = React.useState('');
    const [simAvailableTokens, setSimAvailableTokens] = React.useState<string[]>([]);
    const [simSelectedSet, setSimSelectedSet] = React.useState<Set<string>>(new Set());
    const [simLoading, setSimLoading] = React.useState(false);
    const [simError, setSimError] = React.useState<string | null>(null);
    const [simResults, setSimResults] = React.useState<SimilarResult[]>([]);

    const [simBaseModels, setSimBaseModels] = React.useState<Map<string, string>>(new Map());
    const [simSelectedBaseModels, setSimSelectedBaseModels] = React.useState<Set<string>>(new Set());

    // per-card carousel index, keyed by model-version
    const [carouselIndex, setCarouselIndex] = React.useState<Record<string, number>>({});

    // styles
    const panelWrap: React.CSSProperties = {
        marginTop: 14,
        padding: 12,
        borderRadius: 8,
        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
        background: isDarkMode ? '#111827' : '#ffffff',
        color: isDarkMode ? '#f9fafb' : '#111827'
    };
    const sectionTitle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontWeight: 700,
        fontSize: '1rem'
    };
    const grid: React.CSSProperties = { display: 'grid', rowGap: 10, columnGap: 12 };
    const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center' };
    const input: React.CSSProperties = {
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
        background: isDarkMode ? '#0b1220' : '#fff',
        color: isDarkMode ? '#fff' : '#111'
    };
    const hint: React.CSSProperties = { fontSize: 12, opacity: 0.75, marginTop: 6 };
    const chip: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999,
        border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
        margin: '4px 6px 0 0', cursor: 'pointer', userSelect: 'none'
    };
    const chipActive: React.CSSProperties = {
        ...chip, background: isDarkMode ? '#1e3a8a' : '#e0e7ff', borderColor: isDarkMode ? '#1e3a8a' : '#6366f1'
    };
    const btn: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer' };
    const btnPrimary: React.CSSProperties = { ...btn, background: '#0ea5e9', color: '#fff' };
    const btnGhost: React.CSSProperties = {
        ...btn, background: isDarkMode ? '#111827' : '#fff',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`, color: 'inherit'
    };
    const filterbar: React.CSSProperties = { marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}` };
    const filterGroup: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 };
    const checkboxChip: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 999, border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`
    };
    const cardGrid: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 350px)',
        gap: 12,
        marginTop: 10,
        justifyContent: 'space-between'
    };

    const cardSlot: React.CSSProperties = { position: 'relative' };
    const fileCard: React.CSSProperties = {
        borderRadius: 10,
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
        background: isDarkMode ? '#0b1220' : '#fff',
        color: isDarkMode ? '#f9fafb' : '#111827',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: 350
    };
    const badge: React.CSSProperties = {
        position: 'absolute', top: 8, padding: '2px 6px', borderRadius: 6,
        background: isDarkMode ? 'rgba(17,24,39,.8)' : 'rgba(255,255,255,.85)',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`, fontSize: 12, fontWeight: 700
    };
    const footer: React.CSSProperties = {
        padding: 10, backdropFilter: 'blur(2px)',
        background: isDarkMode ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.7)'
    };
    const stats: React.CSSProperties = { display: 'flex', gap: 10, fontSize: 12, opacity: .9, marginTop: 6 };
    const loadingMsg: React.CSSProperties = { padding: 10, opacity: .8 };
    const errMsg: React.CSSProperties = { padding: 10, color: '#ef4444' };

    // carousel styles
    const carouselWrap = (h = 400): React.CSSProperties => ({
        position: 'relative',
        width: '100%',
        height: '100%',
        background: isDarkMode ? '#0b1220' : '#f3f4f6'
    });

    const imgStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
    };
    const arrowBtn: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 34,
        height: 34,
        borderRadius: '999px',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
        background: isDarkMode ? 'rgba(17,24,39,.65)' : 'rgba(255,255,255,.8)',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        userSelect: 'none'
    };

    const PLACEHOLDER =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="400" viewBox="0 0 350 400">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${isDarkMode ? '#111827' : '#e5e7eb'}"/>
          <stop offset="1" stop-color="${isDarkMode ? '#0b1220' : '#f3f4f6'}"/>
        </linearGradient>
      </defs>
      <rect width="350" height="400" fill="url(#g)"/>
      <g fill="${isDarkMode ? '#6b7280' : '#9ca3af'}">
        <circle cx="175" cy="170" r="34"/>
        <rect x="80" y="230" width="190" height="10" rx="5"/>
        <rect x="110" y="250" width="130" height="10" rx="5"/>
      </g>
    </svg>`
        );

    const viewport: React.CSSProperties = {
        position: 'relative',
        width: 350,
        height: 400,
        background: isDarkMode ? '#0b1220' : '#f3f4f6'
    };




    // helpers
    const tokenizeToWords = React.useCallback((s: string): string[] => {
        try { return s.split(/[^\p{L}\p{N}]+/u).map(t => t.trim()).filter(Boolean); }
        catch { return s.split(/[^A-Za-z0-9]+/).map(t => t.trim()).filter(Boolean); }
    }, []);

    const deDupePreserveCase = (arr: string[]): string[] => {
        const seen = new Set<string>(); const out: string[] = [];
        for (const t of arr) { const k = t.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(t); } }
        return out;
    };

    const canonBaseModel = (v: any) => {
        const s = String(v ?? '').trim();
        return s ? s.toLowerCase() : 'unknown';
    };
    const displayBaseModel = (v: any) => {
        const s = String(v ?? '').trim();
        return s || 'Unknown';
    };

    const buildSuggestionsFromEntry = React.useCallback((e: OfflineDownloadEntry): string[] => {
        const bag: string[] = [];
        if (Array.isArray(e.civitaiTags)) bag.push(...e.civitaiTags);
        if (e.civitaiFileName) bag.push(...tokenizeToWords(e.civitaiFileName));
        if (e.modelVersionObject?.name) bag.push(...tokenizeToWords(e.modelVersionObject.name));
        if (e.modelVersionObject?.model?.name) bag.push(...tokenizeToWords(e.modelVersionObject.model.name));
        return deDupePreserveCase(bag).sort((a, b) => a.localeCompare(b));
    }, [tokenizeToWords]);

    React.useEffect(() => {
        if (!entry) return;
        const tokens = buildSuggestionsFromEntry(entry);
        setSimAvailableTokens(tokens);
        setSimSelectedSet(new Set());
        setSimInput('');
        setSimResults([]);
        setSimBaseModels(new Map());
        setSimSelectedBaseModels(new Set());
        setSimError(null);
        setCarouselIndex({});
    }, [entry, buildSuggestionsFromEntry]);

    const isTokenSelected = (t: string) => simSelectedSet.has(t.toLowerCase());
    const toggleToken = (t: string) => {
        const key = t.toLowerCase();
        const next = new Set(simSelectedSet);
        if (next.has(key)) next.delete(key); else next.add(key);
        setSimSelectedSet(next);
        const selected = simAvailableTokens.filter(x => next.has(x.toLowerCase()));
        setSimInput(selected.join(' '));
    };

    const syncSelectionFromInput = (val: string) => {
        setSimInput(val);
        const tokens = tokenizeToWords(val);
        const wanted = new Set(tokens.map(x => x.toLowerCase()));
        const next = new Set<string>();
        for (const t of simAvailableTokens) if (wanted.has(t.toLowerCase())) next.add(t.toLowerCase());
        setSimSelectedSet(next);
    };

    const hasAnyInputTokens = tokenizeToWords(simInput).length > 0;

    const submitSimilar = async () => {
        const tagsList = tokenizeToWords(simInput);
        if (!tagsList.length) return;
        setSimLoading(true); setSimError(null);
        try {
            const res = await fetch('http://localhost:3000/api/find-list-of-models-dto-from-all-table-by-tagsList-tampermonkey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagsList })
            });
            const json = await res.json();
            const list: SimilarResult[] = json?.payload?.modelsList ?? [];
            setSimResults(list);

            const map = new Map<string, string>();
            for (const m of list) {
                const key = canonBaseModel(m?.baseModel);
                const label = displayBaseModel(m?.baseModel);
                if (!map.has(key)) map.set(key, label);
            }
            setSimBaseModels(map);
            setSimSelectedBaseModels(new Set(map.keys()));

            // reset carousel indices for the new results
            setCarouselIndex({});
        } catch (e) {
            console.error(e);
            setSimError('Search failed. Please try again.');
        } finally {
            setSimLoading(false);
        }
    };

    const clearSimilar = () => {
        setSimInput('');
        setSimSelectedSet(new Set());
        setSimResults([]);
        setSimBaseModels(new Map());
        setSimSelectedBaseModels(new Set());
        setSimError(null);
        setCarouselIndex({});
    };

    const isBaseModelSelected = (k: string) => simSelectedBaseModels.has(k);
    const onBaseModelCheckboxChange = (k: string, checked: boolean) => {
        const next = new Set(simSelectedBaseModels);
        if (checked) next.add(k); else next.delete(k);
        setSimSelectedBaseModels(next);
    };
    const selectAllBaseModels = () => setSimSelectedBaseModels(new Set(simBaseModels.keys()));
    const clearBaseModels = () => setSimSelectedBaseModels(new Set());

    const uploadedTime = (d: any) => {
        if (!d) return 0; const t = Date.parse(String(d));
        return Number.isFinite(t) ? t : 0;
    };

    const nothingSelected = React.useMemo(
        () => simBaseModels.size > 0 && simSelectedBaseModels.size === 0,
        [simBaseModels, simSelectedBaseModels]
    );

    const filteredAndSorted = React.useMemo(() => {
        if (!simResults?.length) return [];

        const hasAnyOptions = simBaseModels.size > 0;
        const hasSelection = simSelectedBaseModels.size > 0;

        const base = !hasAnyOptions
            ? simResults
            : hasSelection
                ? simResults.filter(m => simSelectedBaseModels.has(canonBaseModel(m?.baseModel)))
                : []; // nothing selected → show nothing

        return base.slice().sort((a, b) => uploadedTime(b?.uploaded) - uploadedTime(a?.uploaded));
    }, [simResults, simSelectedBaseModels, simBaseModels]);


    const simGetParsedStats = (m: SimilarResult): CivitaiStats | null =>
        safeParse<CivitaiStats | null>(m?.stats, null);

    function toImageArray(m: SimilarResult): Array<{ url: string }> {
        if (Array.isArray(m?.imageUrls)) {
            const arr = m.imageUrls as Array<any>;
            return arr.map(x => (typeof x === 'string' ? { url: x } : { url: x?.url })).filter(x => !!x.url);
        }
        const parsed = safeParse<Array<{ url: string }> | Array<string>>(m?.imageUrls, []);
        if (Array.isArray(parsed)) {
            return parsed.map(x => (typeof x === 'string' ? { url: x } : { url: (x as any)?.url })).filter(x => !!x.url);
        }
        return [];
    }

    const simGetMyRating = (m: SimilarResult) => {
        const n = Number(m?.myRating);
        return Number.isFinite(n) ? Math.max(0, Math.min(20, Math.trunc(n))) : 0;
    };

    function safeParse<T>(input: any, fallback: T): T {
        if (input == null) return fallback;
        if (typeof input !== 'string') return input as T;
        try { return JSON.parse(input) as T; } catch { return fallback; }
    }

    function keyFor(m: SimilarResult) {
        return `${m.modelNumber}_${m.versionNumber}`;
    }
    function getIdx(k: string, len: number) {
        const cur = carouselIndex[k] ?? 0;
        return len ? ((cur % len) + len) % len : 0;
    }
    function prevImg(k: string, len: number) {
        setCarouselIndex(ci => ({ ...ci, [k]: getIdx(k, len) - 1 }));
    }
    function nextImg(k: string, len: number) {
        setCarouselIndex(ci => ({ ...ci, [k]: getIdx(k, len) + 1 }));
    }

    return (
        <div style={panelWrap}>
            <div style={sectionTitle}>
                <span>Search Similar</span>
            </div>

            <div style={grid}>
                <div style={row}>
                    <label>Query</label>
                    <div>
                        <input
                            style={input}
                            type="text"
                            value={simInput}
                            placeholder="type or click tags… (space-separated)"
                            onChange={(e) => syncSelectionFromInput(e.target.value)}
                        />
                        <div style={hint}>Selected tags appear here. Press space to separate.</div>
                    </div>
                </div>

                <div style={row}>
                    <label>Suggestions</label>
                    <div>
                        {simAvailableTokens.length ? (
                            simAvailableTokens.map(t => (
                                <span
                                    key={t}
                                    style={isTokenSelected(t) ? chipActive : chip}
                                    onClick={() => toggleToken(t)}
                                >
                                    {t}
                                </span>
                            ))
                        ) : (
                            <span>—</span>
                        )}
                    </div>
                </div>

                <div style={row}>
                    <label></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={btnPrimary} disabled={!hasAnyInputTokens || simLoading} onClick={submitSimilar}>
                            {simLoading ? 'Searching…' : 'Submit Tags'}
                        </button>
                        <button style={btnGhost} disabled={simLoading} onClick={clearSimilar}>
                            Clear
                        </button>
                    </div>
                </div>

                {Array.from(simBaseModels.keys()).length > 0 && (
                    <div style={filterbar}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Filter by Base Model</div>
                        <div style={filterGroup}>
                            {Array.from(simBaseModels.entries())
                                .map(([key, label]) => ({ key, label }))
                                .sort((a, b) => a.label.localeCompare(b.label))
                                .map(opt => (
                                    <label key={opt.key} style={checkboxChip}>
                                        <input
                                            type="checkbox"
                                            checked={isBaseModelSelected(opt.key)}
                                            onChange={(e) => onBaseModelCheckboxChange(opt.key, e.currentTarget.checked)}
                                        />
                                        <span>{opt.label}</span>
                                    </label>
                                ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button style={btnGhost} onClick={selectAllBaseModels}>Select all</button>
                            <button style={btnGhost} onClick={clearBaseModels}>Clear</button>
                        </div>
                    </div>
                )}

                {filteredAndSorted.length > 0 ? (
                    <div style={cardGrid}>
                        {filteredAndSorted.map((m, i) => {
                            const imgs = toImageArray(m);
                            const k = keyFor(m);
                            const len = imgs.length;
                            const idx = getIdx(k, len);
                            const curUrl = len ? imgs[(idx % len + len) % len].url : '';

                            const statsObj = simGetParsedStats(m);
                            const r = simGetMyRating(m);

                            return (
                                <div key={`${k}_${i}`} style={cardSlot}>
                                    <div style={fileCard}>
                                        <div style={carouselWrap(400)}>
                                            {curUrl ? (
                                                <img
                                                    src={curUrl || PLACEHOLDER}
                                                    alt="preview"
                                                    style={imgStyle}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={(e) => {
                                                        const t = e.currentTarget as HTMLImageElement;
                                                        if (t.src !== PLACEHOLDER) t.src = PLACEHOLDER;
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ ...imgStyle, display: 'grid', placeItems: 'center', fontSize: 12, opacity: .6 }}>No image</div>
                                            )}

                                            <div style={{ ...badge, left: 8 }}>ID: {m.modelNumber} / {m.versionNumber}</div>
                                            <div style={{ ...badge, right: 8 }}>{m.baseModel || 'N/A'}</div>

                                            {len > 1 && (
                                                <>
                                                    <button
                                                        aria-label="Prev"
                                                        style={{ ...arrowBtn, left: 8 }}
                                                        onClick={() => prevImg(k, len)}
                                                    >
                                                        ‹
                                                    </button>
                                                    <button
                                                        aria-label="Next"
                                                        style={{ ...arrowBtn, right: 8 }}
                                                        onClick={() => nextImg(k, len)}
                                                    >
                                                        ›
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div style={footer}>
                                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.mainModelName || 'N/A'}
                                            </div>
                                            <div style={{ fontSize: 13, opacity: .85 }}>
                                                {m.creatorName || '—'}
                                            </div>
                                            <div style={stats}>
                                                <span>⬇ {statsObj?.downloadCount ?? 'N/A'}</span>
                                                <span>📝 {statsObj?.ratingCount ?? 'N/A'}</span>
                                                <span>⭐ {statsObj?.rating ?? 'N/A'}</span>
                                                <span>👍 {statsObj?.thumbsUpCount ?? 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {r > 0 && (
                                        <div title={`${r} / 20`} style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                                <path fill={isDarkMode ? '#facc15' : '#f59e0b'}
                                                    d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
                                            </svg>
                                            <div style={{ fontWeight: 700 }}>{r}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {simLoading && <div style={loadingMsg}>Searching…</div>}
                        {!simLoading && nothingSelected && (
                            <div style={loadingMsg}>No base models selected — check some filters or press “Select all”.</div>
                        )}
                        {!simLoading && !nothingSelected && (
                            <div style={loadingMsg}>No results yet — choose tags and Submit.</div>
                        )}
                    </>
                )}

                {simError && (
                    <div style={row}>
                        <label></label>
                        <div style={errMsg}>{simError}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimilarSearchPanel;
