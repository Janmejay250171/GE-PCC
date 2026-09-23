import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Policy } from '../models/Policy.js';
import { isMongoConnected } from '../config/db.js';
import { inMemoryPolicyStore } from '../services/inMemoryPolicyStore.js';
import { geminiService } from '../services/geminiService.js';
import { applySchemeOverrides, applyTier2Defaults } from '../services/overrideService.js';
import { getMissingTier1Fields, getLowConfidenceFields } from '../schemas/policySchema.js';
import { DEMO_POLICIES } from '../utils/demoData.js';
import { normalizeExtractionPayload, normalizePartialPolicyUpdate } from '../services/normalizerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadPolicy(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: {
          code: 'FILE_REQUIRED',
          message: 'Please provide a policy PDF file under field name "file".'
        }
      });
      return;
    }

    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      res.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Only PDF documents are supported.'
        }
      });
      return;
    }

    const policyId = `pol_${Date.now()}_${uuidv4().substring(0, 6)}`;
    const savedPdfPath = path.join(uploadsDir, `${policyId}.pdf`);
    fs.writeFileSync(savedPdfPath, file.buffer);

    // AI Extraction
    const extraction = await geminiService.extractPolicy(file.buffer);
    const extractedData = extraction.data;

    // Apply Scheme Overrides (PM-JAY, ESI)
    applySchemeOverrides(extractedData);

    // Apply Tier 2 Defaults
    applyTier2Defaults(extractedData);

    extractedData.rawTextRef = `uploads/${policyId}.pdf`;

    let policyJson: any;
    if (isMongoConnected) {
      const policyDoc = await Policy.create({
        _id: policyId,
        confirmedByUser: false,
        ...extractedData
      });
      policyJson = policyDoc.toJSON();
    } else {
      policyJson = inMemoryPolicyStore.set(policyId, {
        _id: policyId,
        confirmedByUser: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...extractedData
      });
    }

    const missingRequired = getMissingTier1Fields(policyJson);
    const lowConfidence = getLowConfidenceFields(policyJson);

    if (extraction.isPartialFallback) {
      res.status(422).json({
        policy: policyJson,
        missingRequired,
        lowConfidence,
        warning: 'AI extraction had issues. Please review and fill in the missing details manually.',
        details: extraction.validationError
      });
      return;
    }

    res.status(200).json({
      policy: policyJson,
      missingRequired,
      lowConfidence
    });
  } catch (err: any) {
    console.error('[Upload Policy Error]:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An error occurred while analyzing your policy document.'
      }
    });
  }
}

export async function getDemoPolicies(_req: Request, res: Response): Promise<void> {
  try {
    const list = DEMO_POLICIES.map((d) => ({
      id: d.id,
      key: d.key,
      title: d.title,
      insurer: d.insurer,
      planName: d.planName,
      policyType: d.policyType,
      description: d.description,
      badge: d.badge
    }));

    res.status(200).json(list);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message
      }
    });
  }
}

export async function createPolicyFromDemo(req: Request, res: Response): Promise<void> {
  try {
    const key = req.params.key;
    const demo = DEMO_POLICIES.find((d) => d.key === key || d.id === key);

    if (!demo) {
      res.status(404).json({
        error: {
          code: 'DEMO_NOT_FOUND',
          message: `Demo policy key "${key}" not found.`
        }
      });
      return;
    }

    // Create a new instance cloned from the demo data
    const newId = `pol_${Date.now()}_${uuidv4().substring(0, 6)}`;
    const clonedData = JSON.parse(JSON.stringify(demo.data));

    applySchemeOverrides(clonedData);
    applyTier2Defaults(clonedData);

    let policyJson: any;
    if (isMongoConnected) {
      const doc = await Policy.create({
        _id: newId,
        confirmedByUser: false,
        ...clonedData
      });
      policyJson = doc.toJSON();
    } else {
      policyJson = inMemoryPolicyStore.set(newId, {
        _id: newId,
        confirmedByUser: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...clonedData
      });
    }

    const missingRequired = getMissingTier1Fields(policyJson);
    const lowConfidence = getLowConfidenceFields(policyJson);

    res.status(200).json({
      policy: policyJson,
      missingRequired,
      lowConfidence
    });
  } catch (err: any) {
    console.error('[Create From Demo Error]:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message
      }
    });
  }
}

export async function getPolicyById(req: Request, res: Response): Promise<void> {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || '';
    let policyJson: any = null;

    if (isMongoConnected) {
      try {
        const policy = await Policy.findById(id);
        if (policy) policyJson = policy.toJSON();
      } catch {}
    }

    if (!policyJson) {
      policyJson = inMemoryPolicyStore.get(id);
    }

    if (!policyJson) {
      const demo = DEMO_POLICIES.find((d) => d.id === id || d.key === id);
      if (demo) {
        policyJson = {
          _id: demo.id,
          confirmedByUser: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...demo.data
        };
      }
    }

    if (!policyJson) {
      res.status(404).json({
        error: {
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id "${id}" was not found.`
        }
      });
      return;
    }

    res.status(200).json(policyJson);
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message
      }
    });
  }
}

export async function updatePolicy(req: Request, res: Response): Promise<void> {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || '';
    let existingJson: any = null;

    if (isMongoConnected) {
      try {
        const policy = await Policy.findById(id);
        if (policy) existingJson = policy.toJSON();
      } catch {}
    }

    if (!existingJson) {
      existingJson = inMemoryPolicyStore.get(id);
    }

    if (!existingJson) {
      res.status(404).json({
        error: {
          code: 'POLICY_NOT_FOUND',
          message: `Policy with id "${id}" was not found.`
        }
      });
      return;
    }

    const updates = req.body;
    const normalized = normalizePartialPolicyUpdate(updates);

    // Merge updates
    const mergedData = {
      ...existingJson,
      ...normalized
    };

    // Apply scheme overrides if policyType was modified
    if (updates.policyType) {
      mergedData.policyType = updates.policyType;
      applySchemeOverrides(mergedData);
    }

    const missingRequired = getMissingTier1Fields(mergedData);

    if (missingRequired.length > 0) {
      res.status(400).json({
        error: {
          code: 'TIER_1_REQUIRED_FIELDS_MISSING',
          message: 'All required Tier 1 fields must be filled before confirming policy coverage.',
          details: missingRequired
        },
        missingRequired
      });
      return;
    }

    mergedData.confirmedByUser = true;
    mergedData.updatedAt = new Date().toISOString();

    let updatedJson: any = null;
    if (isMongoConnected) {
      try {
        const updated = await Policy.findByIdAndUpdate(id, mergedData, { new: true });
        if (updated) updatedJson = updated.toJSON();
      } catch {}
    }

    if (!updatedJson) {
      updatedJson = inMemoryPolicyStore.set(id, mergedData);
    }

    res.status(200).json(updatedJson);
  } catch (err: any) {
    console.error('[Update Policy Error]:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message
      }
    });
  }
}
