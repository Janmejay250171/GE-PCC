import { PolicyDocument, DemoPolicyItem } from '../types/policy';

export interface UploadResponse {
  policy: PolicyDocument;
  missingRequired: string[];
  lowConfidence: string[];
  warning?: string;
  details?: any;
}

export async function uploadPolicyPdf(
  file: File,
  onProgressStep?: (stepText: string) => void,
  signal?: AbortSignal
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (onProgressStep) onProgressStep('Uploading policy document...');

  const res = await fetch('/api/policy/upload', {
    method: 'POST',
    body: formData,
    signal
  });

  const data = await res.json();

  if (!res.ok && res.status !== 422) {
    throw new Error(data.error?.message || 'Failed to upload and analyze policy.');
  }

  return data;
}

export async function getDemoPolicies(): Promise<DemoPolicyItem[]> {
  const res = await fetch('/api/policy/demo');
  if (!res.ok) {
    throw new Error('Failed to fetch demo policies.');
  }
  return res.json();
}

export async function createPolicyFromDemo(key: string): Promise<UploadResponse> {
  const res = await fetch(`/api/policy/demo/${key}`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to initialize demo policy.');
  }
  return data;
}

export async function getPolicy(id: string): Promise<PolicyDocument> {
  const res = await fetch(`/api/policy/${id}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Policy not found.');
  }
  return data;
}

export async function updatePolicy(id: string, updates: Partial<PolicyDocument>): Promise<PolicyDocument> {
  const res = await fetch(`/api/policy/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error?.message || 'Failed to save policy updates.');
    err.details = data.missingRequired || data.error?.details;
    throw err;
  }
  return data;
}
