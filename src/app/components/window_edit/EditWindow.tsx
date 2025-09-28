import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container, Row, Col, Form, Button, Toast } from 'react-bootstrap';
import { fetchFullRecordFromAllTableModelIDandVersionID, fetchUpdateFullRecord } from '../../api/civitaiSQL_api';
import { setError, clearError } from '../../store/actions/errorsActions';

const EditWindow: React.FC = () => {
    const dispatch = useDispatch();

    // toast
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

    // lookup keys
    const [modelNumber, setModelNumber] = useState('');
    const [versionNumber, setVersionNumber] = useState('');
    const [url, setUrl] = useState('');

    // models_table
    const [id, setId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [mainModelName, setMainModelName] = useState('');
    const [tags, setTags] = useState('');           // JSON-ish string
    const [localTags, setLocalTags] = useState(''); // JSON-ish string
    const [aliases, setAliases] = useState('');     // JSON-ish string
    const [localPath, setLocalPath] = useState('');
    const [category, setCategory] = useState('');
    const [triggerWords, setTriggerWords] = useState(''); // JSON-ish string
    const [nsfw, setNsfw] = useState<boolean>(false);
    const [urlAccessable, setUrlAccessable] = useState<boolean>(false);
    const [flag, setFlag] = useState<boolean>(false);
    const [myRating, setMyRating] = useState<number | ''>('');

    // other tables
    const [description, setDescription] = useState('');
    const [modelUrl, setModelUrl] = useState('');
    const [type, setType] = useState('');
    const [stats, setStats] = useState('');
    const [uploaded, setUploaded] = useState(''); // yyyy-mm-dd
    const [baseModel, setBaseModel] = useState('');
    const [hash, setHash] = useState('');
    const [usageTips, setUsageTips] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [imageUrls, setImageUrls] = useState('');

    // at top with other state
    const [isLoaded, setIsLoaded] = useState(false);


    const popToast = (msg: string, variant: 'success' | 'danger' = 'success') => {
        setToastMsg(msg);
        setToastVariant(variant);
        setShowToast(true);
    };

    // tiny helpers
    const str = (v: any) => (v == null ? '' : String(v));

    // load when helper returns FULL DTO: { model, description, url, details, images }
    const loadFromFullDTO = (full: any) => {
        const m = full?.model ?? {};
        setId(typeof m.id === 'number' ? m.id : null); // <— add this
        setName(str(m.name));
        setMainModelName(str(m.mainModelName));
        setTags(str(m.tags));
        setLocalTags(str(m.localTags));
        setAliases(str(m.aliases));
        setLocalPath(str(m.localPath));
        setCategory(str(m.category));
        setTriggerWords(str(m.triggerWords));
        setNsfw(!!m.nsfw);
        setUrlAccessable(!!m.urlAccessable);
        setFlag(!!m.flag);
        setMyRating(Number.isInteger(m.myRating) ? m.myRating : '');

        const dsc = full?.description ?? {};
        setDescription(str(dsc.description));

        const urec = full?.url ?? {};
        setModelUrl(str(urec.url));

        const det = full?.details ?? {};
        setType(str(det.type));
        setStats(str(det.stats));
        setUploaded(str(det.uploaded)); // "YYYY-MM-DD" is fine for <input type="date">
        setBaseModel(str(det.baseModel));
        setHash(str(det.hash));
        setUsageTips(str(det.usageTips));
        setCreatorName(str(det.creatorName));

        const img = full?.images ?? {};
        setImageUrls(str(img.imageUrls));
    };

    // load when helper returns only the MODEL entity
    const loadFromModelOnly = (m: any) => {
        setId(typeof m.id === 'number' ? m.id : null); // <— add this
        setName(str(m.name));
        setMainModelName(str(m.mainModelName));
        setTags(str(m.tags));
        setLocalTags(str(m.localTags));
        setAliases(str(m.aliases));
        setLocalPath(str(m.localPath));
        setCategory(str(m.category));
        setTriggerWords(str(m.triggerWords));
        setNsfw(!!m.nsfw);
        setUrlAccessable(!!m.urlAccessable);
        setFlag(!!m.flag);
        setMyRating(Number.isInteger(m.myRating) ? m.myRating : '');

        // clear non-model tables since we didn't receive them
        setDescription('');
        setModelUrl('');
        setType('');
        setStats('');
        setUploaded('');
        setBaseModel('');
        setHash('');
        setUsageTips('');
        setCreatorName('');
        setImageUrls('');
    };

    // scrape model/version from active tab URL
    const handleScrapeIDs = async () => {
        try {
            // @ts-ignore
            if (!chrome?.tabs) throw new Error('Chrome extension APIs not available');
            const windows = await chrome.windows.getAll({ populate: false });
            const normal = windows.find(w => w.type === 'normal');
            if (!normal) throw new Error('No normal window found');
            const [activeTab] = await chrome.tabs.query({ active: true, windowId: normal.id });
            if (!activeTab?.url) throw new Error('No active tab URL');

            setUrl(activeTab.url);

            const u = new URL(activeTab.url);
            const v = u.searchParams.get('modelVersionId');            // may be null
            const mMatch = u.pathname.match(/\/models\/(\d+)/);         // captures ID from /models/<id>
            const m = mMatch?.[1] ?? null;

            if (!m) throw new Error('Could not parse model ID from URL.');

            // Always set modelID if found
            setModelNumber(m);

            if (v) {
                // URL already has versionID
                setVersionNumber(v);
                popToast('Scraped Model & Version IDs from URL', 'success');
                return;
            }

            // No versionID in URL → fetch from Civitai API
            const fetchedV = await fetchVersionIdForModel(m);
            if (!fetchedV) throw new Error('No modelVersions found from Civitai API.');
            setVersionNumber(fetchedV);
            popToast('Scraped Model ID from URL and Version ID from API', 'success');
        } catch (e: any) {
            popToast(e?.message || 'Scrape failed', 'danger');
        }
    };


    const fetchVersionIdForModel = async (modelId: string): Promise<string | null> => {
        const resp = await fetch(`https://civitai.com/api/v1/models/${modelId}`, { method: 'GET' });
        if (!resp.ok) throw new Error(`Civitai API ${resp.status}`);
        const data = await resp.json();
        const arr = Array.isArray(data?.modelVersions) ? data.modelVersions : [];
        if (!arr.length || !arr[0]?.id) return null;
        return String(arr[0].id); // use first element's id as versionID
    };

    const fetchCivitaiModel = async (modelId: string) => {
        const resp = await fetch(`https://civitai.com/api/v1/models/${modelId}`, { method: 'GET' });
        if (!resp.ok) throw new Error(`Civitai API ${resp.status}`);
        return resp.json();
    };

    const pickVersion = (api: any, wantedVersionId?: string | null) => {
        const versions: any[] = Array.isArray(api?.modelVersions) ? api.modelVersions : [];
        if (!versions.length) return null;
        if (wantedVersionId) {
            const exact = versions.find(v => String(v.id) === String(wantedVersionId));
            if (exact) return exact;
        }
        return versions[0];
    };

    const toYYYYMMDD = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    };


    const handleSyncFromAPI = async () => {
        try {
            if (!modelNumber) throw new Error('Model ID is required to sync from API.');

            const api = await fetchCivitaiModel(modelNumber);
            const ver = pickVersion(api, versionNumber);
            if (!ver) throw new Error('No modelVersions found on API response.');

            // Tags (API array -> JSON string)
            if (Array.isArray(api.tags)) setTags(JSON.stringify(api.tags));

            // Trigger Words (from version.trainedWords array -> JSON string)
            if (Array.isArray(ver.trainedWords)) setTriggerWords(JSON.stringify([ver.trainedWords.join(', ')]));

            // Description
            if (typeof api.description === 'string') setDescription(api.description);

            // Details
            if (typeof api.type === 'string') setType(api.type);
            if (typeof ver.baseModel === 'string') setBaseModel(ver.baseModel);
            setUploaded(toYYYYMMDD(ver.publishedAt)); // may be empty if invalid/missing
            if (ver.stats) setStats(JSON.stringify(ver.stats));

            // Hashes (from primary file, else first file)
            const files: any[] = Array.isArray(ver.files) ? ver.files : [];
            const primary = files.find(f => f.primary) || files[0];
            if (primary?.hashes) setHash(JSON.stringify(primary.hashes));

            // Images -> {url, nsfw, width, height}
            const imgs: any[] = Array.isArray(ver.images) ? ver.images : [];
            const mappedImgs = imgs
                .filter(i => i?.url)
                .map(i => ({
                    url: i.url,
                    nsfw: (typeof i.nsfwLevel === 'number' ? i.nsfwLevel > 1 : false),
                    width: typeof i.width === 'number' ? i.width : undefined,
                    height: typeof i.height === 'number' ? i.height : undefined,
                }));
            if (mappedImgs.length) setImageUrls(JSON.stringify(mappedImgs));

            // nsfw (top-level)
            if (typeof api.nsfw === 'boolean') setNsfw(api.nsfw);

            // creator
            const creatorUser = api?.creator?.username;
            if (creatorUser) setCreatorName(creatorUser);

            // Optional: set page URL if we want to store a canonical one
            // setModelUrl(`https://civitai.com/models/${modelNumber}?modelVersionId=${ver.id}`);

            popToast('Synced fields from Civitai API', 'success');
        } catch (err: any) {
            popToast(err?.message || 'Sync failed', 'danger');
        }
    };


    // load record — uses YOUR helper only
    const handleFetchRecord = async (e?: React.FormEvent) => {
        e?.preventDefault();
        try {
            if (!modelNumber || !versionNumber) throw new Error('Model ID and Version ID are required.');
            dispatch(clearError());

            const res = await fetchFullRecordFromAllTableModelIDandVersionID(modelNumber, versionNumber, dispatch);

            // res could be either:
            //  - FULL DTO (has .model/.description/.url/.details/.images)
            //  - MODEL entity (has fields like name/category/etc.)
            if (res && (res.model || res.description || res.url || res.details || res.images)) {
                loadFromFullDTO(res);
            } else if (res) {
                loadFromModelOnly(res);
            } else {
                throw new Error('Record not found');
            }

            // after loadFromFullDTO/res logic succeeds:
            setIsLoaded(true);
            popToast('Record loaded', 'success');

        } catch (err: any) {
            console.error(err);
            dispatch(setError({ hasError: true, errorMessage: err?.message || String(err) }));
            popToast(err?.message || 'Load failed', 'danger');
        }
    };

    const handleClear = () => {
        setId(null);
        setModelNumber('');
        setVersionNumber('');
        setUrl('');

        // models_table
        setName('');
        setMainModelName('');
        setTags('');
        setLocalTags('');
        setAliases('');
        setLocalPath('');
        setCategory('');
        setTriggerWords('');
        setNsfw(false);
        setUrlAccessable(false);
        setFlag(false);
        setMyRating('');

        // other tables
        setDescription('');
        setModelUrl('');
        setType('');
        setStats('');
        setUploaded('');
        setBaseModel('');
        setHash('');
        setUsageTips('');
        setCreatorName('');
        setImageUrls('');

        setIsLoaded(false);
        popToast('Cleared', 'success');
    };


    // …inside your component file

    // --- helpers for shaping payload ---
    const isBlank = (v: any) => v == null || String(v).trim() === '';

    /** For JSON columns: return undefined if blank (omit), else validate + canonicalize. */
    const jsonOrUndef = (label: string, value: string): string | undefined => {
        if (isBlank(value)) return undefined;               // don't send "" to JSON columns
        const trimmed = value.trim();
        try {
            const parsed = JSON.parse(trimmed);
            return JSON.stringify(parsed);                    // canonical JSON string
        } catch {
            throw new Error(`${label} must be valid JSON (or left empty).`);
        }
    };


    const handleSaveChanges = async () => {
        try {
            dispatch(clearError());

            // Validate/normalize JSON fields; undefined = omit from payload
            const normTags = jsonOrUndef('Tags', tags);
            const normLocalTags = jsonOrUndef('Local Tags', localTags);
            const normAliases = jsonOrUndef('Aliases', aliases);
            const normTrigger = jsonOrUndef('Trigger Words', triggerWords);
            const normImageUrls = jsonOrUndef('Image URLs', imageUrls);

            // Base model payload (include JSON fields only if defined)
            const modelPayload: any = {
                modelNumber,
                versionNumber,
                name,
                mainModelName,
                localPath,
                category,
                nsfw,
                urlAccessable,
                flag,
                myRating: myRating === '' ? null : Number(myRating),
            };
            if (normTags !== undefined) modelPayload.tags = normTags;
            if (normLocalTags !== undefined) modelPayload.localTags = normLocalTags;
            if (normAliases !== undefined) modelPayload.aliases = normAliases;
            if (normTrigger !== undefined) modelPayload.triggerWords = normTrigger;

            // Build DTO; add sections only if user provided data
            const dto: any = { model: modelPayload };

            // description (LONGTEXT) — send only if user typed something
            if (!isBlank(description)) {
                dto.description = { description };
            }

            // url — send ONLY if user entered/changed it (avoids server upsert/link when blank)
            if (!isBlank(modelUrl)) {
                dto.url = { url: modelUrl };
            }

            // details — include only the fields that are non-blank
            const hasDetails =
                !isBlank(type) || !isBlank(stats) || !isBlank(uploaded) ||
                !isBlank(baseModel) || !isBlank(hash) || !isBlank(usageTips) || !isBlank(creatorName);

            if (hasDetails) {
                const details: any = {};
                if (!isBlank(type)) details.type = type;
                if (!isBlank(stats)) details.stats = stats;         // stored as String in DB
                if (!isBlank(uploaded)) details.uploaded = uploaded;   // yyyy-mm-dd
                if (!isBlank(baseModel)) details.baseModel = baseModel;
                if (!isBlank(hash)) details.hash = hash;           // String in DB
                if (!isBlank(usageTips)) details.usageTips = usageTips;
                if (!isBlank(creatorName)) details.creatorName = creatorName;
                dto.details = details;
            }

            // images (JSON) — include only if non-blank & valid JSON
            if (normImageUrls !== undefined) {
                dto.images = { imageUrls: normImageUrls };
            }

            const updated = await fetchUpdateFullRecord(dispatch, dto);
            if (!updated) throw new Error('Update failed');

            popToast('Changes saved', 'success');
        } catch (err: any) {
            dispatch(setError({ hasError: true, errorMessage: err?.message || String(err) }));
            popToast(err?.message || 'Save failed', 'danger');
        }
    };



    return (
        <Container fluid className="bg-dark text-light p-4 rounded" style={{ maxWidth: 1100 }}>
            <Form onSubmit={handleFetchRecord}>
                {/* keys */}
                <Row className="gy-3 align-items-end">
                    <Col md={4}>
                        <Form.Label>Model ID</Form.Label>
                        <Form.Control value={modelNumber} onChange={e => setModelNumber(e.target.value)} placeholder="e.g. 1033906" />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Version ID</Form.Label>
                        <Form.Control value={versionNumber} onChange={e => setVersionNumber(e.target.value)} placeholder="e.g. 1159595" />
                    </Col>
                    <Col md="auto">
                        <Button variant="secondary" type="button" onClick={handleScrapeIDs}>
                            Scrape IDs
                        </Button>
                    </Col>
                    <Row className="gy-3 align-items-end">
                        {/* ... Model ID / Version ID inputs (and optional Scrape IDs button) ... */}

                        <Col md="auto" className="d-flex gap-2">
                            <Button variant="primary" type="submit">
                                Submit (Load)
                            </Button>

                            <Button
                                variant="outline-info"
                                type="button"
                                onClick={handleSyncFromAPI}
                                disabled={!isLoaded}
                                title={isLoaded ? '' : 'Load a record first'}
                            >
                                Sync From Civitai API
                            </Button>

                            <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={handleClear}
                            >
                                Clear
                            </Button>
                        </Col>
                    </Row>


                </Row>

                <hr className="my-4" />

                {/* models_table */}
                <h5 className="mb-3">Model (models_table)</h5>
                <Row className="gy-3">
                    <Col md={4}>
                        <Form.Label>ID</Form.Label>
                        <Form.Control value={id ?? ''} readOnly plaintext={false} />
                    </Col>

                    <Col md={8}>
                        <Form.Label>Name</Form.Label>
                        <Form.Control value={name} onChange={e => setName(e.target.value)} />
                    </Col>

                    <Col md={6}>
                        <Form.Label>Main Model Name</Form.Label>
                        <Form.Control value={mainModelName} onChange={e => setMainModelName(e.target.value)} />
                    </Col>
                    <Col md={6}>
                        <Form.Label>Category</Form.Label>
                        <Form.Control value={category} onChange={e => setCategory(e.target.value)} />
                    </Col>
                    <Col md={6}>
                        <Form.Label>Local Path</Form.Label>
                        <Form.Control value={localPath} onChange={e => setLocalPath(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Check type="switch" id="nsfw" label="NSFW" checked={nsfw} onChange={e => setNsfw(e.target.checked)} />
                    </Col>
                    <Col md={4}>
                        <Form.Check
                            type="switch"
                            id="urlAccessable"
                            label="URL Accessible"
                            checked={urlAccessable}
                            onChange={e => setUrlAccessable(e.target.checked)}
                        />
                    </Col>
                    <Col md={4}>
                        <Form.Check type="switch" id="flag" label="Flag" checked={flag} onChange={e => setFlag(e.target.checked)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>My Rating (0-20)</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            max={20}
                            value={myRating}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === '') return setMyRating('');
                                const n = Number(v);
                                if (!Number.isNaN(n)) setMyRating(n);
                            }}
                        />
                    </Col>
                    <Col md={8}>
                        <Form.Label>Page URL (reference)</Form.Label>
                        <Form.Control value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                    </Col>
                </Row>

                <Row className="gy-3 mt-3">
                    <Col md={4}>
                        <Form.Label>Tags (JSON)</Form.Label>
                        <Form.Control as="textarea" rows={3} value={tags} onChange={e => setTags(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Local Tags (JSON)</Form.Label>
                        <Form.Control as="textarea" rows={3} value={localTags} onChange={e => setLocalTags(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Aliases (JSON)</Form.Label>
                        <Form.Control as="textarea" rows={3} value={aliases} onChange={e => setAliases(e.target.value)} />
                    </Col>
                </Row>

                <Row className="gy-3 mt-3">
                    <Col md={12}>
                        <Form.Label>Trigger Words (JSON)</Form.Label>
                        <Form.Control as="textarea" rows={2} value={triggerWords} onChange={e => setTriggerWords(e.target.value)} />
                    </Col>
                </Row>

                <hr className="my-4" />

                {/* models_descriptions_table */}
                <h5 className="mb-3">Description (models_descriptions_table)</h5>
                <Form.Group className="mb-3">
                    <Form.Control
                        as="textarea"
                        rows={6}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Long description / HTML acceptable"
                    />
                </Form.Group>

                <hr className="my-4" />

                {/* models_urls_table */}
                <h5 className="mb-3">URL (models_urls_table)</h5>
                <Row className="gy-3">
                    <Col md={12}>
                        <Form.Label>Model URL</Form.Label>
                        <Form.Control value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="https://..." />
                    </Col>
                </Row>

                <hr className="my-4" />

                {/* models_details_table */}
                <h5 className="mb-3">Details (models_details_table)</h5>
                <Row className="gy-3">
                    <Col md={4}>
                        <Form.Label>Type</Form.Label>
                        <Form.Control value={type} onChange={e => setType(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Uploaded</Form.Label>
                        <Form.Control type="date" value={uploaded || ''} onChange={e => setUploaded(e.target.value)} />
                    </Col>
                    <Col md={4}>
                        <Form.Label>Base Model</Form.Label>
                        <Form.Control value={baseModel} onChange={e => setBaseModel(e.target.value)} />
                    </Col>
                    <Col md={6}>
                        <Form.Label>Stats</Form.Label>
                        <Form.Control value={stats} onChange={e => setStats(e.target.value)} placeholder='e.g. {"downloadCount":22}' />
                    </Col>
                    <Col md={6}>
                        <Form.Label>Hash</Form.Label>
                        <Form.Control value={hash} onChange={e => setHash(e.target.value)} />
                    </Col>
                    <Col md={12}>
                        <Form.Label>Usage Tips</Form.Label>
                        <Form.Control as="textarea" rows={3} value={usageTips} onChange={e => setUsageTips(e.target.value)} />
                    </Col>
                    <Col md={6}>
                        <Form.Label>Creator Name</Form.Label>
                        <Form.Control value={creatorName} onChange={e => setCreatorName(e.target.value)} />
                    </Col>
                </Row>

                <hr className="my-4" />

                {/* models_images_table */}
                <h5 className="mb-3">Images (models_images_table)</h5>
                <Row className="gy-3">
                    <Col md={12}>
                        <Form.Label>Image URLs (JSON)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            value={imageUrls}
                            onChange={e => setImageUrls(e.target.value)}
                            placeholder='e.g. [{"url":"https://...","width":768,"height":1280}]'
                        />
                    </Col>
                </Row>

                <Row className="gy-3 mt-4">
                    <Col md="auto">
                        <Button variant="success" type="button" onClick={handleSaveChanges}>
                            Save Changes
                        </Button>
                    </Col>
                </Row>
            </Form>

            {/* toast */}
            <Toast
                bg={toastVariant === 'success' ? 'success' : 'danger'}
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={2500}
                autohide
                className="position-fixed"
                style={{ bottom: 16, right: 16, minWidth: 320 }}
            >
                <Toast.Body className="text-white">{toastMsg}</Toast.Body>
            </Toast>
        </Container>
    );
};

export default EditWindow;
