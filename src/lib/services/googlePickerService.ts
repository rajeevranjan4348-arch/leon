import { getAccessToken } from '../firebase';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  description?: string;
  sizeBytes?: number;
  iconUrl?: string;
}

let isGapiLoaded = false;
let gapiLoadingPromise: Promise<void> | null = null;

export const loadGooglePickerApi = (): Promise<void> => {
  if (isGapiLoaded && window.google?.picker) {
    return Promise.resolve();
  }

  if (gapiLoadingPromise) {
    return gapiLoadingPromise;
  }

  gapiLoadingPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // Check if script is already present
    const existingScript = document.getElementById('google-picker-sdk');
    if (existingScript) {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => {
            isGapiLoaded = true;
            resolve();
          },
          onerror: () => reject(new Error('Failed to load Google Picker SDK')),
        });
      } else {
        existingScript.addEventListener('load', () => {
          window.gapi.load('picker', {
            callback: () => {
              isGapiLoaded = true;
              resolve();
            },
            onerror: () => reject(new Error('Failed to load Google Picker SDK')),
          });
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-picker-sdk';
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => {
            isGapiLoaded = true;
            resolve();
          },
          onerror: () => reject(new Error('Failed to load Google Picker SDK module')),
        });
      } else {
        reject(new Error('gapi not available after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.body.appendChild(script);
  });

  return gapiLoadingPromise;
};

export const openGoogleDrivePicker = async (
  onPicked: (files: PickedFile[]) => void,
  onCancel?: () => void
): Promise<void> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google authentication required to open Google Drive Picker. Please sign in with Google first.');
  }

  await loadGooglePickerApi();

  if (!window.google?.picker) {
    throw new Error('Google Picker is not initialized.');
  }

  const pickerOrigin =
    window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  const viewAllDocs = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false);

  const viewImages = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_IMAGES);
  const viewPdfs = new window.google.picker.DocsView(window.google.picker.ViewId.PDFS);
  const viewUpload = new window.google.picker.DocsUploadView();

  const picker = new window.google.picker.PickerBuilder()
    .addView(viewAllDocs)
    .addView(viewImages)
    .addView(viewPdfs)
    .addView(viewUpload)
    .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
    .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
    .setOAuthToken(token)
    .setOrigin(pickerOrigin)
    .setTitle('Select Google Drive Documents or Files')
    .setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const docs = data.docs || [];
        const pickedFiles: PickedFile[] = docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          url: doc.url,
          description: doc.description,
          sizeBytes: doc.sizeBytes,
          iconUrl: doc.iconUrl,
        }));
        onPicked(pickedFiles);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    })
    .build();

  picker.setVisible(true);
};
