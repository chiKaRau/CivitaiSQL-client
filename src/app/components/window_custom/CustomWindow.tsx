import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store/configureStore';
import { Container, Row, Col, Form, Button, Toast } from 'react-bootstrap';
import { fetchAddRecordToDatabaseInCustom, fetchDownloadFilesByServer_v2ForCustom } from '../../api/civitaiSQL_api';

import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { CiWarning } from 'react-icons/ci';
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from 'react-icons/ai';

import CategoriesListSelector from '../CategoriesListSelector';
import DownloadFilePathOptionPanel from '../DownloadFilePathOptionPanel';

const CustomWindow: React.FC = () => {
    const dispatch = useDispatch();
    const { downloadFilePath, selectedCategory } = useSelector((s: AppState) => s.chrome);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

    // Required fields
    const [name, setName] = useState('');
    const [mainModelName, setMainModelName] = useState('');
    const [url, setUrl] = useState('');
    const [versionNumber, setVersionNumber] = useState('');
    const [modelNumber, setModelNumber] = useState('');
    const [type, setType] = useState('');
    const [baseModel, setBaseModel] = useState('');

    // Dynamic Image URLs (must have at least 1)
    const [imageUrls, setImageUrls] = useState<string[]>(['']);

    // Optional fields
    const [tags, setTags] = useState('');
    const [localTags, setLocalTags] = useState('');
    const [aliases, setAliases] = useState('');
    const [triggerWords, setTriggerWords] = useState('');
    const [description, setDescription] = useState('');
    const [stats, setStats] = useState('');
    const [hash, setHash] = useState('');
    const [usageTips, setUsageTips] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [nsfw, setNsfw] = useState(false);
    const [flag, setFlag] = useState(false);
    const [urlAccessable, setUrlAccessable] = useState(false);

    const [downloadUrlInput, setDownloadUrlInput] = useState('');

    const toArray = (s: string) =>
        s.split(',').map(x => x.trim()).filter(Boolean);

    // Add/remove image URL inputs
    const handleAddImage = () => setImageUrls(prev => [...prev, '']);
    const handleRemoveImage = () => {
        if (imageUrls.length > 1) setImageUrls(prev => prev.slice(0, -1));
    };
    const handleImageChange = (i: number, v: string) =>
        setImageUrls(prev => prev.map((val, idx) => idx === i ? v : val));

    // Reset everything
    const handleClear = () => {
        setName(''); setMainModelName(''); setUrl('');
        setVersionNumber(''); setModelNumber(''); setType(''); setBaseModel('');
        setImageUrls(['']);
        setTags(''); setLocalTags(''); setAliases(''); setTriggerWords('');
        setDescription(''); setStats(''); setHash(''); setUsageTips('');
        setCreatorName(''); setNsfw(false); setFlag(false); setUrlAccessable(false);
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dto: any = {
            name,
            mainModelName,
            url,
            category: selectedCategory,
            versionNumber,
            modelNumber,
            type,
            baseModel,
            imageUrls: imageUrls.map(u => ({ url: u })),
            tags: toArray(tags),
            localTags: toArray(localTags),
            aliases: toArray(aliases),
            triggerWords: toArray(triggerWords),
            description: description || null,
            stats: stats || null,
            localPath: downloadFilePath,
            uploaded: null,
            hash: hash || null,
            usageTips: usageTips || null,
            creatorName: creatorName || null,
            nsfw,
            flag,
            urlAccessable,
        };

        try {
            await fetchAddRecordToDatabaseInCustom(dto);
            setToastMsg('Submit successful');
            setToastVariant('success');
        } catch (err: any) {
            console.error('API error:', err);
            setToastMsg(err.message || 'Submit failed');
            setToastVariant('danger');
        } finally {
            setShowToast(true);
        }
    };

    // Force-refresh DownloadFilePath panel when needed
    const [isHandleRefresh, setIsHandleRefresh] = useState(false);

    return (
        <Container fluid className="bg-dark text-light p-4 rounded" style={{ maxWidth: 900 }}>
            <h2 className="text-center mb-4">Adding Custom Model</h2>

            <Form onSubmit={handleSubmit}>
                {/* Row 1: Name, Main Model */}
                <Row>
                    <Col md={6} className="mb-3">
                        <Form.Group controlId="name">
                            <Form.Label>Name*</Form.Label>
                            <Form.Control
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6} className="mb-3">
                        <Form.Group controlId="mainModelName">
                            <Form.Label>Main Model Name*</Form.Label>
                            <Form.Control
                                type="text"
                                value={mainModelName}
                                onChange={e => setMainModelName(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {/* Row 2 */}
                <Row>
                    <Col md={12} className="mb-3">
                        <Form.Group controlId="url">
                            <Form.Label>Model URL*</Form.Label>
                            <Form.Control
                                type="url" value={url}
                                onChange={e => setUrl(e.target.value)} required
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {/* Combined Category + Download Path in white box */}
                <Row className="mb-3">
                    <Col>
                        <div
                            style={{
                                backgroundColor: '#fff',
                                color: '#000',
                                padding: 12,
                                borderRadius: 4,
                                display: 'flex',
                                gap: '1rem',
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <Form.Label>Category*</Form.Label>
                                <CategoriesListSelector />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Form.Label>Download File Path*</Form.Label>
                                <DownloadFilePathOptionPanel
                                    isHandleRefresh={isHandleRefresh}
                                    setIsHandleRefresh={setIsHandleRefresh}
                                />
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Row 2: Version, Model#, Type, Base Model */}
                <Row>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="versionNumber">
                            <Form.Label>Version Number*</Form.Label>
                            <Form.Control
                                type="text"
                                value={versionNumber}
                                onChange={e => setVersionNumber(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="modelNumber">
                            <Form.Label>Model Number*</Form.Label>
                            <Form.Control
                                type="text"
                                value={modelNumber}
                                onChange={e => setModelNumber(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="type">
                            <Form.Label>Type*</Form.Label>
                            <Form.Control
                                type="text"
                                value={type}
                                onChange={e => setType(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="baseModel">
                            <Form.Label>Base Model*</Form.Label>
                            <Form.Control
                                type="text"
                                value={baseModel}
                                onChange={e => setBaseModel(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {/* Image URLs with + and – */}
                <Form.Group className="mb-3">
                    <Form.Label>Image URLs*</Form.Label>
                    {imageUrls.map((u, i) => (
                        <div key={i} className="d-flex align-items-center mb-2">
                            <Form.Control
                                type="url"
                                value={u}
                                onChange={e => handleImageChange(i, e.target.value)}
                                required
                            />
                            <Button
                                variant="outline-light"
                                onClick={handleAddImage}
                                className="ms-2"
                            >
                                +
                            </Button>
                            <Button
                                variant="outline-light"
                                onClick={handleRemoveImage}
                                className="ms-1"
                                disabled={imageUrls.length === 1}
                            >
                                -
                            </Button>
                        </div>
                    ))}
                </Form.Group>

                {/* Non-required fields */}
                <Row>
                    <Col md={4} className="mb-3">
                        <Form.Group controlId="tags">
                            <Form.Label>Tags</Form.Label>
                            <Form.Control
                                type="text"
                                value={tags}
                                onChange={e => setTags(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} className="mb-3">
                        <Form.Group controlId="localTags">
                            <Form.Label>Local Tags</Form.Label>
                            <Form.Control
                                type="text"
                                value={localTags}
                                onChange={e => setLocalTags(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} className="mb-3">
                        <Form.Group controlId="aliases">
                            <Form.Label>Aliases</Form.Label>
                            <Form.Control
                                type="text"
                                value={aliases}
                                onChange={e => setAliases(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={6} className="mb-3">
                        <Form.Group controlId="triggerWords">
                            <Form.Label>Trigger Words</Form.Label>
                            <Form.Control
                                type="text"
                                value={triggerWords}
                                onChange={e => setTriggerWords(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6} className="mb-3">
                        <Form.Group controlId="stats">
                            <Form.Label>Stats</Form.Label>
                            <Form.Control
                                type="text"
                                value={stats}
                                onChange={e => setStats(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={12} className="mb-3">
                        <Form.Group controlId="description">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={8} className="mb-3">
                        <Form.Group controlId="hash">
                            <Form.Label>Hash</Form.Label>
                            <Form.Control
                                type="text"
                                value={hash}
                                onChange={e => setHash(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} className="mb-3">
                        <Form.Group controlId="usageTips">
                            <Form.Label>Usage Tips</Form.Label>
                            <Form.Control
                                type="text"
                                value={usageTips}
                                onChange={e => setUsageTips(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="mb-3">
                    <Col md={6}>
                        <Form.Group controlId="creatorName">
                            <Form.Label>Creator Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={creatorName}
                                onChange={e => setCreatorName(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Check
                            type="checkbox"
                            label="NSFW"
                            checked={nsfw}
                            onChange={e => setNsfw(e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="Flag"
                            checked={flag}
                            onChange={e => setFlag(e.target.checked)}
                        />
                        <Form.Check
                            type="checkbox"
                            label="URL Accessible"
                            checked={urlAccessable}
                            onChange={e => setUrlAccessable(e.target.checked)}
                        />
                    </Col>
                </Row>

                <Row className="mt-4 align-items-end">
                    <Col md={8}>
                        <Form.Group controlId="downloadUrlInput">
                            <Form.Label>Download URL</Form.Label>
                            <Form.Control
                                type="url"
                                placeholder="https://example.com/file.safetensors"
                                value={downloadUrlInput}
                                onChange={e => setDownloadUrlInput(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-center">
                        {(() => {
                            const fields = [
                                { label: 'Download Path', ok: !!downloadFilePath },
                                { label: 'Name', ok: !!name },
                                { label: 'Model URL', ok: !!url },
                                { label: 'Model Number', ok: !!modelNumber },
                                { label: 'Version Number', ok: !!versionNumber },
                                { label: 'Base Model', ok: !!baseModel },
                                { label: 'Download URL', ok: !!downloadUrlInput },
                                { label: 'At least one Image URL', ok: imageUrls.some(u => !!u) },
                            ];
                            const missing = fields.filter(f => !f.ok).map(f => f.label);
                            const canDownload = missing.length === 0;

                            return (
                                <>
                                    <Button
                                        variant="light"
                                        onClick={async () => {
                                            try {
                                                const ok = await fetchDownloadFilesByServer_v2ForCustom(
                                                    {
                                                        downloadFilePath,
                                                        civitaiFileName: name,
                                                        civitaiModelID: modelNumber,
                                                        civitaiVersionID: versionNumber,
                                                        civitaiUrl: url,
                                                        baseModel,
                                                        downloadUrl: downloadUrlInput,
                                                        imageUrls
                                                    }
                                                );
                                                setToastMsg(ok ? 'Download started' : 'Download failed');
                                                setToastVariant(ok ? 'success' : 'danger');
                                            } catch (err: any) {
                                                setToastMsg(err.message || 'Download failed');
                                                setToastVariant('danger');
                                            } finally {
                                                setShowToast(true);
                                            }
                                        }}
                                        disabled={!canDownload}
                                        className="me-2"
                                    >
                                        Download
                                    </Button>

                                    {!canDownload && (
                                        <OverlayTrigger
                                            placement="top"
                                            trigger={['hover', 'focus']}
                                            overlay={
                                                <Tooltip id="download-missing-tooltip">
                                                    <div>
                                                        {fields.map(f => (
                                                            <div
                                                                key={f.label}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    color: f.ok ? 'green' : 'red',
                                                                    margin: '2px 0',
                                                                }}
                                                            >
                                                                {f.ok
                                                                    ? <AiOutlineCheckCircle className="me-1" />
                                                                    : <AiOutlineCloseCircle className="me-1" />
                                                                }
                                                                {f.label}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Tooltip>
                                            }
                                        >
                                            <span className="d-inline-block">
                                                <CiWarning size={24} className="text-warning" style={{ cursor: 'pointer' }} />
                                            </span>
                                        </OverlayTrigger>
                                    )}
                                </>
                            );
                        })()}
                    </Col>
                </Row>

                {/* Submit + Clear */}
                <div className="d-flex justify-content-between mt-4">
                    <Button variant="light" type="submit">
                        Submit
                    </Button>
                    <Button variant="outline-light" onClick={handleClear}>
                        Clear
                    </Button>
                </div>
            </Form>

            {/* Toast */}
            <Toast
                onClose={() => setShowToast(false)}
                show={showToast}
                bg={toastVariant}
                delay={3000}
                autohide
                className="position-fixed bottom-0 end-0 m-3"
            >
                <Toast.Body className="text-light">{toastMsg}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default CustomWindow;
