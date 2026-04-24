import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaRegClock, FaClockRotateLeft } from 'react-icons/fa6';
import { MdDownloading } from 'react-icons/md';

import { AppState } from '../../store/configureStore';
import { setError } from '../../store/actions/errorsActions';
import {
    fetchOfflineDownloadListEarlyAccessActive,
    fetchDownloadFilesByServer_v2,
    fetchAddRecordToDatabase,
    fetchRemoveOfflineDownloadFileIntoOfflineDownloadList,
} from '../../api/civitaiSQL_api';

import type { OfflineDownloadEntry } from './OfflineWindow.types';
import { bookmarkThisUrl } from '../../utils/chromeUtils';

const PENDING_PATH_RE = /[/\\]@scan@[/\\]acg[/\\]pending([/\\]|$)/i;
const STORAGE_KEY = 'ea-auto-watch-enabled';

const EARLY_ACCESS_GRACE_MS = 30_000;      // wait 30 sec after EA time ends
const MAX_DOWNLOAD_ATTEMPTS = 10;          // 10 attempts max
const RETRY_DELAY_MS = 10_000;              // wait 10 sec between attempts
const FAILED_COOLDOWN_MS = 360 * 60 * 1000; // after 10 failed attempts, wait 6 hours before retry
const BETWEEN_DOWNLOADS_MS = 3_000;        // small gap between different models to reduce burst

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sameLocalDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function getEarlyAccessEndsAt(entry: OfflineDownloadEntry): Date | null {
    const s = entry.earlyAccessEndsAt?.trim();
    if (!s) return null;

    if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const m = s.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/
    );
    if (!m) return null;

    const [, y, mo, d, h, mi, se, frac] = m;
    const ms = frac ? Number(frac.padEnd(3, '0').slice(0, 3)) : 0;

    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se, ms));
    return Number.isNaN(dt.getTime()) ? null : dt;
}

function isPendingPath(path?: string) {
    return PENDING_PATH_RE.test((path || '').trim());
}

function getModelFileList(entry: OfflineDownloadEntry) {
    if (Array.isArray(entry.civitaiModelFileList) && entry.civitaiModelFileList.length > 0) {
        return entry.civitaiModelFileList;
    }

    const files = entry.modelVersionObject?.files;
    if (!Array.isArray(files)) return [];

    return files
        .map((file: any) => ({
            name: file?.name,
            downloadUrl: file?.downloadUrl,
        }))
        .filter((file: any) => file?.name && file?.downloadUrl);
}

function getSafeTensorFileName(entry: OfflineDownloadEntry) {
    if (entry.civitaiFileName) return entry.civitaiFileName;

    const files = entry.modelVersionObject?.files;
    if (!Array.isArray(files)) return '';

    return (
        files.find(
            (file: any) =>
                typeof file?.name === 'string' &&
                file.name.toLowerCase().endsWith('.safetensors')
        )?.name ||
        files.find((file: any) => typeof file?.name === 'string')?.name ||
        ''
    );
}

const EarlyAccessAutoWatchButton: React.FC = () => {
    const dispatch = useDispatch();
    const isDarkMode = useSelector((state: AppState) => state.chrome.isDarkMode);

    const [isEnabled, setIsEnabled] = useState(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            return raw == null ? true : raw === 'true';
        } catch {
            return true;
        }
    });

    const [watchEntries, setWatchEntries] = useState<OfflineDownloadEntry[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadedCount, setDownloadedCount] = useState(0);

    const downloadedIdsRef = useRef<Set<string>>(new Set());
    const inFlightIdsRef = useRef<Set<string>>(new Set());

    // key = version id, value = timestamp after which retry is allowed again
    const retryAfterRef = useRef<Map<string, number>>(new Map());

    const scheduledTimerRef = useRef<number | null>(null);
    const pollTimerRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(isEnabled));
        } catch {
            // ignore
        }
    }, [isEnabled]);

    const fetchWatchList = useCallback(async () => {
        try {
            const payload = await fetchOfflineDownloadListEarlyAccessActive(dispatch);
            setWatchEntries(Array.isArray(payload) ? (payload as OfflineDownloadEntry[]) : []);
        } catch (err: any) {
            console.error('Early Access watch fetch failed:', err?.message || err);
            setWatchEntries([]);
        }
    }, [dispatch]);

    useEffect(() => {
        void fetchWatchList();

        pollTimerRef.current = window.setInterval(() => {
            void fetchWatchList();
        }, 60_000);

        return () => {
            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [fetchWatchList]);

    const totalEndingToday = useMemo(() => {
        const now = new Date();
        return watchEntries.filter((entry) => {
            const ends = getEarlyAccessEndsAt(entry);
            return !!ends && sameLocalDay(ends, now);
        }).length;
    }, [watchEntries]);

    const dueEntries = useCallback((entries: OfflineDownloadEntry[]) => {
        const now = Date.now();

        return entries
            .filter((entry) => {
                const ends = getEarlyAccessEndsAt(entry);
                const vid = entry.civitaiVersionID;
                const path = entry.downloadFilePath;

                if (!ends) return false;
                if (!vid) return false;
                if (isPendingPath(path)) return false;
                if (downloadedIdsRef.current.has(vid)) return false;
                if (inFlightIdsRef.current.has(vid)) return false;

                const retryAfter = retryAfterRef.current.get(vid);
                if (retryAfter && retryAfter > now) return false;

                return ends.getTime() + EARLY_ACCESS_GRACE_MS <= now;
            })
            .sort((a, b) => {
                const aEnds = getEarlyAccessEndsAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                const bEnds = getEarlyAccessEndsAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                return aEnds - bEnds; // oldest overdue first
            });
    }, []);

    const runDownloads = useCallback(async (entries: OfflineDownloadEntry[]) => {
        if (!entries.length) return;

        setIsDownloading(true);

        try {
            for (const entry of entries) {
                const civitaiVersionID = entry.civitaiVersionID;
                if (!civitaiVersionID) continue;
                if (downloadedIdsRef.current.has(civitaiVersionID)) continue;
                if (inFlightIdsRef.current.has(civitaiVersionID)) continue;

                const retryAfter = retryAfterRef.current.get(civitaiVersionID);
                if (retryAfter && retryAfter > Date.now()) continue;

                const civitaiModelFileList = getModelFileList(entry);
                const civitaiFileName = getSafeTensorFileName(entry);
                const downloadFilePath = (entry.downloadFilePath || '').trim();

                if (
                    !entry.civitaiUrl ||
                    !entry.civitaiModelID ||
                    !entry.civitaiVersionID ||
                    !downloadFilePath ||
                    isPendingPath(downloadFilePath) ||
                    !civitaiFileName ||
                    !civitaiModelFileList.length
                ) {
                    continue;
                }

                inFlightIdsRef.current.add(civitaiVersionID);

                try {
                    let ok = false;
                    let lastErrorMessage = '';

                    for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
                        try {
                            console.log(
                                `[EA Auto] Attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS} for version ${civitaiVersionID}`
                            );

                            const result = await fetchDownloadFilesByServer_v2(
                                {
                                    civitaiUrl: entry.civitaiUrl,
                                    civitaiFileName,
                                    civitaiModelID: entry.civitaiModelID,
                                    civitaiVersionID: entry.civitaiVersionID,
                                    downloadFilePath,
                                    civitaiModelFileList,
                                },
                                dispatch
                            );

                            ok = result.success;

                            if (ok) {
                                break;
                            }

                            lastErrorMessage =
                                result.message ||
                                `fetchDownloadFilesByServer_v2 failed on attempt ${attempt}`;
                        } catch (err: any) {
                            lastErrorMessage =
                                err?.response?.data?.message ||
                                err?.message ||
                                'Unknown error';

                            console.error(
                                `[EA Auto] Download failed on attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS} for version ${civitaiVersionID}:`,
                                lastErrorMessage
                            );
                        }

                        if (attempt < MAX_DOWNLOAD_ATTEMPTS) {
                            await sleep(RETRY_DELAY_MS);
                        }
                    }

                    if (ok) {
                        const isAddRecordSuccessful = await fetchAddRecordToDatabase(
                            entry.selectedCategory,
                            entry.civitaiUrl,
                            downloadFilePath,
                            dispatch
                        );

                        if (!isAddRecordSuccessful) {
                            throw new Error(
                                `Add record failed for ${entry.civitaiModelID}_${entry.civitaiVersionID}`
                            );
                        }

                        await fetchRemoveOfflineDownloadFileIntoOfflineDownloadList(
                            {
                                civitaiModelID: entry.civitaiModelID,
                                civitaiVersionID: entry.civitaiVersionID,
                            },
                            dispatch
                        );

                        downloadedIdsRef.current.add(civitaiVersionID);
                        retryAfterRef.current.delete(civitaiVersionID);
                        setDownloadedCount((prev) => prev + 1);

                        bookmarkThisUrl(
                            entry?.modelVersionObject?.model?.type ?? 'N/A',
                            entry.civitaiUrl,
                            `${entry?.modelVersionObject?.model?.name ?? 'N/A'} - ${entry?.civitaiModelID} | Stable Diffusion LoRA | Civitai`
                        );

                        console.log(
                            `[EA Auto] Download succeeded for version ${civitaiVersionID}`
                        );
                    } else {
                        const nextRetryAt = Date.now() + FAILED_COOLDOWN_MS;
                        retryAfterRef.current.set(civitaiVersionID, nextRetryAt);

                        console.warn(
                            `[EA Auto] Version ${civitaiVersionID} failed after ${MAX_DOWNLOAD_ATTEMPTS} attempts. Cooling down until ${new Date(nextRetryAt).toLocaleString()}`
                        );

                        dispatch(
                            setError({
                                hasError: true,
                                errorMessage:
                                    `Early Access auto-download failed after ${MAX_DOWNLOAD_ATTEMPTS} attempts for version ${civitaiVersionID}. ` +
                                    `Will retry after cooldown. Last error: ${lastErrorMessage || 'Unknown error'}`,
                            })
                        );
                    }
                } catch (err: any) {
                    const errorMessage =
                        err?.response?.data?.message ||
                        err?.message ||
                        'Unknown error';

                    const nextRetryAt = Date.now() + FAILED_COOLDOWN_MS;
                    retryAfterRef.current.set(civitaiVersionID, nextRetryAt);

                    dispatch(
                        setError({
                            hasError: true,
                            errorMessage:
                                `Early Access auto-download failed for version ${civitaiVersionID}. ` +
                                `Will retry after cooldown. Last error: ${errorMessage}`,
                        })
                    );

                    console.error(
                        `[EA Auto] Final failure for version ${civitaiVersionID}:`,
                        errorMessage
                    );
                } finally {
                    inFlightIdsRef.current.delete(civitaiVersionID);
                }

                await sleep(BETWEEN_DOWNLOADS_MS);
            }
        } finally {
            setIsDownloading(false);
            void fetchWatchList();
        }
    }, [dispatch, fetchWatchList]);

    useEffect(() => {
        if (scheduledTimerRef.current !== null) {
            window.clearTimeout(scheduledTimerRef.current);
            scheduledTimerRef.current = null;
        }

        if (!isEnabled) return;
        if (isDownloading) return;

        const readyNow = dueEntries(watchEntries);
        if (readyNow.length > 0) {
            void runDownloads(readyNow);
            return;
        }

        const nextFuture = watchEntries
            .map((entry) => ({
                entry,
                ends: getEarlyAccessEndsAt(entry),
            }))
            .filter(
                (x): x is { entry: OfflineDownloadEntry; ends: Date } => {
                    if (!x.ends) return false;
                    if (!x.entry.civitaiVersionID) return false;
                    if (isPendingPath(x.entry.downloadFilePath)) return false;
                    if (downloadedIdsRef.current.has(x.entry.civitaiVersionID)) return false;
                    if (inFlightIdsRef.current.has(x.entry.civitaiVersionID)) return false;

                    const retryAfter = retryAfterRef.current.get(x.entry.civitaiVersionID);
                    if (retryAfter && retryAfter > Date.now()) return false;

                    return x.ends.getTime() + EARLY_ACCESS_GRACE_MS > Date.now();
                }
            )
            .sort((a, b) => a.ends.getTime() - b.ends.getTime());

        if (!nextFuture.length) return;

        const waitMs = Math.max(
            250,
            nextFuture[0].ends.getTime() + EARLY_ACCESS_GRACE_MS - Date.now()
        );

        scheduledTimerRef.current = window.setTimeout(() => {
            void runDownloads(dueEntries(watchEntries));
        }, waitMs);

        return () => {
            if (scheduledTimerRef.current !== null) {
                window.clearTimeout(scheduledTimerRef.current);
                scheduledTimerRef.current = null;
            }
        };
    }, [isEnabled, isDownloading, watchEntries, dueEntries, runDownloads]);

    const tooltipText = isDownloading
        ? `Auto-downloading Early Access now - Downloaded this session: ${downloadedCount} - Ending today: ${totalEndingToday}`
        : isEnabled
            ? `Early Access Auto-download watcher is ON - Downloaded this session: ${downloadedCount} - Ending today: ${totalEndingToday}`
            : `Early Access Auto-download watcher is OFF - Downloaded this session: ${downloadedCount} - Ending today: ${totalEndingToday}`;

    const buttonVariant = isDownloading ? 'warning' : isEnabled ? 'warning' : 'secondary';
    const Icon = isDownloading ? MdDownloading : isEnabled ? FaClockRotateLeft : FaRegClock;

    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="ea-auto-watch-tooltip">{tooltipText}</Tooltip>}
        >
            <div
                style={{
                    position: 'relative',
                    display: 'inline-flex',
                }}
            >
                <Button
                    variant={buttonVariant}
                    onClick={() => setIsEnabled((prev) => !prev)}
                    aria-label={
                        isDownloading
                            ? 'Early Access auto downloading'
                            : isEnabled
                                ? 'Early Access auto downloading on'
                                : 'Early Access auto downloading off'
                    }
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        padding: 0,
                        position: 'relative',
                        overflow: 'visible',
                    }}
                >
                    {isDownloading ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Spinner animation="border" size="sm" />
                            <Icon size={16} />
                        </span>
                    ) : (
                        <Icon size={18} />
                    )}
                </Button>

                <span
                    title="Auto-downloaded in this app session"
                    style={{
                        position: 'absolute',
                        top: -8,
                        left: -8,
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        background: '#198754',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.25)',
                        pointerEvents: 'none',
                    }}
                >
                    {downloadedCount}
                </span>

                <span
                    title="Early Access ending today"
                    style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        background: '#f59e0b',
                        color: '#111',
                        border: '1px solid rgba(255,255,255,0.25)',
                        pointerEvents: 'none',
                    }}
                >
                    {totalEndingToday}
                </span>
            </div>
        </OverlayTrigger>
    );
};

export default EarlyAccessAutoWatchButton;