import { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { DemoPicker } from '../components/DemoPicker';
import { SteppedLoader } from '../components/SteppedLoader';
import { uploadPolicyPdf, createPolicyFromDemo, getDemoPolicies } from '../services/api';
import { DemoPolicyItem, PolicyDocument } from '../types/policy';
import { AlertCircle } from 'lucide-react';

interface UploadPageProps {
  onPolicyLoaded: (policy: PolicyDocument) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onPolicyLoaded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demos, setDemos] = useState<DemoPolicyItem[]>([]);

  useEffect(() => {
    getDemoPolicies()
      .then(setDemos)
      .catch((err) => {
        console.warn('Could not fetch demo policies dynamically:', err);
        setDemos([
          {
            id: 'pol_demo_star',
            key: 'star-health',
            title: 'Star Health (Private)',
            insurer: 'Star Health',
            planName: 'Family Health Optima',
            policyType: 'private',
            description: 'Retail family floater with ₹3,00,000 Sum Insured, ₹3,000/day room limit, 10% co-pay, and proportionate deduction.',
            badge: 'Retail Floater'
          },
          {
            id: 'pol_demo_hdfc',
            key: 'hdfc-ergo',
            title: 'HDFC Ergo (Corporate Group)',
            insurer: 'HDFC ERGO',
            planName: 'Corporate Group Health Shield',
            policyType: 'corporate',
            description: 'Employer-provided policy with ₹5 Lakh Sum Insured, 1% room rent cap, zero co-pay, and restoration benefit.',
            badge: 'Employer Group'
          },
          {
            id: 'pol_demo_pmjay',
            key: 'pmjay',
            title: 'PM-JAY (Ayushman Bharat)',
            insurer: 'National Health Authority',
            planName: 'Pradhan Mantri Jan Arogya Yojana',
            policyType: 'pmjay',
            description: 'Government scheme: ₹5,00,000 family cover, no room limit, zero co-pay at empanelled public and private network hospitals (subject to PM-JAY package rates).',
            badge: 'Govt Scheme'
          },
          {
            id: 'pol_demo_esi',
            key: 'esi',
            title: 'ESI (Employee State Insurance)',
            insurer: 'Employees State Insurance Corporation',
            planName: 'ESIC Medical Benefit Scheme',
            policyType: 'esi',
            description: 'Statutory cover: full coverage at ESIC hospitals and tie-up centers, unlimited SI, zero room rent cap or co-pay.',
            badge: 'Statutory Cover'
          }
        ]);
      });
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await uploadPolicyPdf(file);
      onPolicyLoaded(response.policy);
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMessage(err.message || 'Could not analyze document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoSelect = async (key: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await createPolicyFromDemo(key);
      onPolicyLoaded(response.policy);
    } catch (err: any) {
      console.error('Demo policy error:', err);
      setErrorMessage(err.message || 'Failed to load demo policy.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {isProcessing && <SteppedLoader />}

      <section className="hero-section">
        <h1 className="hero-title">
          Know your <span>health cover</span> before you choose a hospital
        </h1>
        <p className="hero-subtitle">
          Upload your health insurance policy schedule. We extract your room limits, co-pay clauses, and deduction rules into a clean summary.
        </p>
      </section>

      {errorMessage && (
        <div className="alert-banner error">
          <AlertCircle size={20} className="text-danger" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="alert-banner-title">Document Processing Notice</div>
            <div className="alert-banner-desc">{errorMessage}</div>
          </div>
        </div>
      )}

      <UploadZone onFileSelected={handleFileUpload} disabled={isProcessing} />

      <DemoPicker demos={demos} onSelectDemo={handleDemoSelect} disabled={isProcessing} />
    </div>
  );
};
