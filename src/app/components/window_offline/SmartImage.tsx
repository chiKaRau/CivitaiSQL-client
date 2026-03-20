import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';

interface SmartImageProps {
    src: string;
    srcSet?: string;
    sizes?: string;
    alt: string;
    isDarkMode: boolean;
    width?: number;
    height?: number;
    loading?: 'eager' | 'lazy';
    maxHeight?: string | number;
    borderRadius?: string | number;
}

const SmartImage: React.FC<SmartImageProps> = ({
    src,
    srcSet,
    sizes,
    alt,
    isDarkMode,
    width,
    height,
    loading = 'lazy',
    maxHeight = '300px',
    borderRadius = 6,
}) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    useEffect(() => {
        setStatus('loading');
    }, [src]);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                minHeight: 220,
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
                        Loading image...
                    </span>
                </div>
            )}

            {status === 'error' ? (
                <div
                    style={{
                        width: '100%',
                        height: maxHeight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDarkMode ? '#fff' : '#000',
                        textAlign: 'center',
                        padding: 12,
                    }}
                >
                    Failed to load image
                </div>
            ) : (
                <img
                    className="d-block w-100"
                    src={src}
                    srcSet={srcSet}
                    sizes={sizes}
                    loading={loading}
                    decoding="async"
                    width={width ?? undefined}
                    height={height ?? undefined}
                    alt={alt}
                    onLoad={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
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

export default SmartImage;