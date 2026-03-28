import React, { useEffect, useMemo, useState } from 'react';
import { Spinner, Button } from 'react-bootstrap';

interface SmartImageProps {
    src: string;
    fallbackSources?: string[];
    srcSet?: string;
    sizes?: string;
    alt: string;
    isDarkMode: boolean;
    width?: number;
    height?: number;
    loading?: 'eager' | 'lazy';
    maxHeight?: string | number;
    borderRadius?: string | number;
    showRetryButton?: boolean;
}

const CIVITAI_IMAGE_SEGMENT = 'anim=false,width=450,optimized=true';

const rewriteCivitaiImageUrl = (value: string) => {
    const url = (value || '').trim();
    if (!url) return '';

    if (!url.includes('image.civitai.com')) {
        return url;
    }

    return url.replace(
        /(https:\/\/image\.civitai\.com\/[^/]+\/[^/]+\/)([^/]+)(\/[^?#]+)(\?[^#]*)?(#.*)?$/i,
        `$1${CIVITAI_IMAGE_SEGMENT}$3$4$5`
    );
};

const rewriteCivitaiSrcSet = (value?: string) => {
    if (!value) return value;

    return value
        .split(',')
        .map(part => {
            const trimmed = part.trim();
            const match = trimmed.match(/^(\S+)(\s+.+)?$/);
            if (!match) return trimmed;

            const urlPart = match[1];
            const descriptor = match[2] || '';
            return `${rewriteCivitaiImageUrl(urlPart)}${descriptor}`;
        })
        .join(', ');
};

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    fallbackSources = [],
    srcSet,
    sizes,
    alt,
    isDarkMode,
    width,
    height,
    loading = 'lazy',
    maxHeight = '300px',
    borderRadius = 6,
    showRetryButton = true,
}) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [retryNonce, setRetryNonce] = useState(0);

    const fallbackKey = fallbackSources.join('|||');

    const normalizedSrcSet = useMemo(() => rewriteCivitaiSrcSet(srcSet), [srcSet]);

    const candidates = useMemo(() => {
        const seen = new Set<string>();

        return [src, ...fallbackSources]
            .map(x => rewriteCivitaiImageUrl((x || '').trim()))
            .filter(Boolean)
            .filter(url => {
                if (seen.has(url)) return false;
                seen.add(url);
                return true;
            });
    }, [src, fallbackKey]);

    useEffect(() => {
        setStatus('loading');
        setCurrentIndex(0);
        setRetryNonce(0);
    }, [src, fallbackKey]);

    const activeSrc = useMemo(() => {
        const selected = candidates[currentIndex] || '';

        if (!selected) return '';

        if (!retryNonce) return selected;

        const separator = selected.includes('?') ? '&' : '?';
        return `${selected}${separator}smartImageRetry=${retryNonce}`;
    }, [candidates, currentIndex, retryNonce]);

    const hasNextFallback = currentIndex < candidates.length - 1;

    const handleLoad = () => {
        setStatus('loaded');
    };

    const handleError = () => {
        if (hasNextFallback) {
            setCurrentIndex(prev => prev + 1);
            setStatus('loading');
            return;
        }

        setStatus('error');
    };

    const handleRetry = () => {
        setStatus('loading');
        setRetryNonce(prev => prev + 1);
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                minHeight: maxHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDarkMode ? '#444' : '#f3f4f6',
                borderRadius,
                overflow: 'hidden',
            }}
        >
            {status === 'loading' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: isDarkMode
                            ? 'rgba(0,0,0,0.25)'
                            : 'rgba(255,255,255,0.65)',
                        zIndex: 2,
                    }}
                >
                    <Spinner animation="border" size="sm" variant={isDarkMode ? 'light' : 'dark'} />
                    <span style={{ fontSize: 12, color: isDarkMode ? '#fff' : '#000' }}>
                        {currentIndex > 0 ? `Trying fallback image ${currentIndex + 1}...` : 'Loading image...'}
                    </span>
                </div>
            )}

            {status === 'error' ? (
                <div
                    style={{
                        width: '100%',
                        height: maxHeight,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDarkMode ? '#fff' : '#000',
                        textAlign: 'center',
                        padding: 12,
                        gap: 10,
                    }}
                >
                    <div>Failed to load image</div>

                    {showRetryButton && (
                        <Button
                            size="sm"
                            variant={isDarkMode ? 'outline-light' : 'outline-dark'}
                            onClick={handleRetry}
                        >
                            Retry
                        </Button>
                    )}
                </div>
            ) : (
                <img
                    className="d-block w-100"
                    src={activeSrc}
                    srcSet={currentIndex === 0 ? normalizedSrcSet : undefined}
                    sizes={currentIndex === 0 ? sizes : undefined}
                    loading={loading}
                    decoding="async"
                    width={width ?? undefined}
                    height={height ?? undefined}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        maxHeight,
                        objectFit: 'contain',
                        margin: '0 auto',
                        opacity: status === 'loaded' ? 1 : 0.15,
                        transition: 'opacity 0.2s ease',
                    }}
                />
            )}
        </div>
    );
};

export default React.memo(SmartImage);