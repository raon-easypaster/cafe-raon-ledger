
/**
 * Cafe Raon Ledger - Google Drive Sync Utility
 */

let tokenClient;
let accessToken = null;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const SYNC_FILE_NAME = 'cafe_raon_ledger_sync.json';

export const initGoogleDrive = (clientId, onStatusChange) => {
    if (!window.google) return;

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) {
                console.error('Google Auth Error:', response);
                onStatusChange('error', response.error);
                return;
            }
            accessToken = response.access_token;
            onStatusChange('authenticated', accessToken);
        },
    });
};

export const authenticate = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
};

const driveRequest = async (url, options = {}) => {
    if (!accessToken) throw new Error('Not authenticated');

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        if (response.status === 401) {
            accessToken = null;
            throw new Error('AUTH_EXPIRED');
        }
        throw new Error(`Drive API Error: ${response.statusText}`);
    }
    return response.json();
};

export const findSyncFile = async () => {
    const data = await driveRequest(`https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FILE_NAME}' and trashed=false&fields=files(id,name)`);
    return data.files.length > 0 ? data.files[0] : null;
};

export const syncToDrive = async (content) => {
    const file = await findSyncFile();
    const metadata = {
        name: SYNC_FILE_NAME,
        mimeType: 'application/json'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (file) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=multipart`;
        method = 'PATCH';
    }

    const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
    });

    if (!response.ok) throw new Error('Sync failed');
    return response.json();
};

export const downloadFromDrive = async (fileId) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Download failed');
    return response.json();
};
