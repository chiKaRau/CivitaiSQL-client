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
import FolderDropdown from '../FolderDropdown';

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
    const [urlAccessable, setUrlAccessable] = useState(true);

    const [downloadUrlInput, setDownloadUrlInput] = useState('');

    const [prevData, setPrevData] = useState<any>(null);

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
        // 1) snapshot current values
        setPrevData({
            name,
            mainModelName,
            url,
            versionNumber,
            modelNumber,
            type,
            baseModel,
            imageUrls,
            tags,
            localTags,
            aliases,
            triggerWords,
            description,
            stats,
            hash,
            usageTips,
            creatorName,
            nsfw,
            flag,
            urlAccessable,
            downloadUrlInput,
        });
        // 2) then clear
        setName(''); setMainModelName(''); setUrl('');
        setVersionNumber(''); setModelNumber(''); setType(''); setBaseModel('');
        setImageUrls(['']);
        setTags(''); setLocalTags(''); setAliases(''); setTriggerWords('');
        setDescription(''); setStats(''); setHash(''); setUsageTips('');
        setCreatorName(''); setNsfw(false); setFlag(false); setUrlAccessable(false);
        setDownloadUrlInput('');
    };

    const handleUndo = () => {
        if (!prevData) return;
        // prevData is now `any`, so no TS errors:
        setName(prevData.name);
        setMainModelName(prevData.mainModelName);
        setUrl(prevData.url);
        setVersionNumber(prevData.versionNumber);
        setModelNumber(prevData.modelNumber);
        setType(prevData.type);
        setBaseModel(prevData.baseModel);
        setImageUrls(prevData.imageUrls);
        setTags(prevData.tags);
        setLocalTags(prevData.localTags);
        setAliases(prevData.aliases);
        setTriggerWords(prevData.triggerWords);
        setDescription(prevData.description);
        setStats(prevData.stats);
        setHash(prevData.hash);
        setUsageTips(prevData.usageTips);
        setCreatorName(prevData.creatorName);
        setNsfw(prevData.nsfw);
        setFlag(prevData.flag);
        setUrlAccessable(prevData.urlAccessable);
        setDownloadUrlInput(prevData.downloadUrlInput);
        // clear the snapshot so Undo only works once
        setPrevData(null);
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
                                placeholder='illustrious_XL_zuihou.safetensors'
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
                                placeholder='model title'
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
                                placeholder='https://civitaiarchive.com/models/1722778?modelVersionId=1949611'
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
                                <FolderDropdown />
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Row 2: Version, Model#, Type, Base Model */}
                <Row>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="modelNumber">
                            <Form.Label>Model Number*</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder='1722778'
                                value={modelNumber}
                                onChange={e => setModelNumber(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="versionNumber">
                            <Form.Label>Version Number*</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder='1949611'
                                value={versionNumber}
                                onChange={e => setVersionNumber(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="mb-3">
                        <Form.Group controlId="type">
                            <Form.Label>Type*</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder='LORA'
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
                                placeholder='Illustrious'
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
                                placeholder='https://image.civitai.com/xG1n/width=1536/84884709.jpeg'
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
                                placeholder='anime, style, woman, onimai, anime style, styles, onii-chan wa oshimai!'
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
                                placeholder='Miki'
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
                                placeholder='Style'
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
                                placeholder='onimastyle'
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
                                placeholder='{"downloadCount":704,"ratingCount":1,"rating":5}'
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
                                placeholder='{"SHA256":null,"CRC32":null,"AutoV1":null,"AutoV2":"253A861FE4","AutoV3":null,"BLAKE3":null}'
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
                                placeholder='Clip Skip: 2'
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
                                placeholder='ShadowxArt'
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
                                                setToastMsg(ok ? 'Download Successful' : 'Download failed');
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
                    <div>
                        <Button
                            variant="outline-light"
                            onClick={handleUndo}
                            disabled={!prevData}
                            className="me-2"
                        >
                            Undo
                        </Button>
                        <Button variant="outline-light" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>
                    <Button variant="light" type="submit">
                        Submit
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
