import { Transaction, Expense } from '../types';

export interface DriveBackupData {
  transactions: Transaction[];
  expenses: Expense[];
  shopName: string;
  updatedAt: number;
  exportDate: string;
  creator?: string;
}

/**
 * Search for the backup file named 'hisab_khata_backup.json' in Google Drive
 */
export async function findBackupFile(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent("name = 'hisab_khata_backup.json' and trashed = false");
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Drive search failed:', errText);
      throw new Error('Search failed');
    }

    const data = await res.json();
    const files = data.files || [];
    if (files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (error) {
    console.error('findBackupFile error:', error);
    throw error;
  }
}

/**
 * Create a new backup file in Google Drive using multipart upload
 */
export async function createBackupFile(
  accessToken: string,
  backupData: DriveBackupData
): Promise<string> {
  const metadata = {
    name: 'hisab_khata_backup.json',
    mimeType: 'application/json',
  };

  const boundary = 'hisab_khata_boundary_xyz_987';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData) +
    closeDelimiter;

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Drive create failed:', errText);
      throw new Error('Create failed');
    }

    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error('createBackupFile error:', error);
    throw error;
  }
}

/**
 * Update an existing backup file in Google Drive
 */
export async function updateBackupFile(
  accessToken: string,
  fileId: string,
  backupData: DriveBackupData
): Promise<void> {
  try {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupData),
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Drive update failed:', errText);
      throw new Error('Update failed');
    }
  } catch (error) {
    console.error('updateBackupFile error:', error);
    throw error;
  }
}

/**
 * Download the content of a backup file from Google Drive
 */
export async function downloadBackupFile(
  accessToken: string,
  fileId: string
): Promise<DriveBackupData> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Drive download failed:', errText);
      throw new Error('Download failed');
    }

    return await res.json() as DriveBackupData;
  } catch (error) {
    console.error('downloadBackupFile error:', error);
    throw error;
  }
}
