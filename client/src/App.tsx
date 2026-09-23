import { useState, useEffect } from 'react';
import { Sidebar, AppView } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingPage } from './pages/LandingPage';
import { PolicyXRayPage } from './pages/PolicyXRayPage';
import { FinancialImpactPage } from './pages/FinancialImpactPage';
import { FindHospitalsPage } from './pages/FindHospitalsPage';
import { HospitalComparisonPage } from './pages/HospitalComparisonPage';
import { RoomComparisonPage } from './pages/RoomComparisonPage';
import { CareJourneyPage } from './pages/CareJourneyPage';
import { WhatToVerifyPage } from './pages/WhatToVerifyPage';
import { UploadPolicyModal } from './components/UploadPolicyModal';
import { PolicyDocument } from './types/policy';
import { RankedHospitalItem, RoomCategory } from './types/hospital';
import { createPolicyFromDemo, getPolicy } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activePolicy, setActivePolicy] = useState<PolicyDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

  // Cross-screen selected state
  const [selectedHospital, setSelectedHospital] = useState<RankedHospitalItem | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomCategory>('General Ward');
  const [selectedProcedure, setSelectedProcedure] = useState<string | undefined>('Neurology - Brain Tumor Surgery');
  const [comparisonHospitals, setComparisonHospitals] = useState<RankedHospitalItem[]>([]);

  // Check URL path for direct policy navigation e.g. /policy/:id
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/policy\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const policyId = match[1];
      getPolicy(policyId)
        .then((doc) => {
          setActivePolicy(doc);
          setCurrentView('policy-xray');
        })
        .catch((err) => {
          console.warn('Could not fetch policy from URL:', err);
        });
    }
  }, []);

  // 1-Click Try Demo Policy Handler (Loads HDFC ERGO Corporate Group Health Shield demo)
  const handleTryDemoPolicy = async () => {
    setLoadingDemo(true);
    try {
      const res = await createPolicyFromDemo('hdfc-ergo');
      setActivePolicy(res.policy);
      setCurrentView('policy-xray');
      window.history.pushState({}, '', `/policy/${res.policy._id}`);
    } catch (err) {
      console.error('Failed to load demo policy:', err);
      // Fallback: try star health or mock
      try {
        const res2 = await createPolicyFromDemo('star-health');
        setActivePolicy(res2.policy);
        setCurrentView('policy-xray');
      } catch (err2) {
        alert('Could not initialize demo policy. Please verify the backend is running.');
      }
    } finally {
      setLoadingDemo(false);
    }
  };

  const handlePolicyLoaded = (policy: PolicyDocument) => {
    setActivePolicy(policy);
    setSelectedHospital(null);
    setSelectedRoom('General Ward');
    setSelectedProcedure(undefined);
    setComparisonHospitals([]);
    setIsUploadModalOpen(false);
    setCurrentView('policy-xray');
    window.history.pushState({}, '', `/policy/${policy._id}`);
  };

  const handleResetPolicy = () => {
    setActivePolicy(null);
    setSelectedHospital(null);
    setSelectedRoom('General Ward');
    setSelectedProcedure(undefined);
    setComparisonHospitals([]);
    setCurrentView('landing');
    window.history.pushState({}, '', '/');
  };

  const handleStartCareJourney = (hospital: RankedHospitalItem, room: RoomCategory, procedure?: string) => {
    setSelectedHospital(hospital);
    setSelectedRoom(room);
    if (procedure) setSelectedProcedure(procedure);
    setCurrentView('care-journey');
  };

  const handleNavigateToComparison = (hospitals: RankedHospitalItem[]) => {
    setComparisonHospitals(hospitals);
    setCurrentView('hospital-comparison');
  };

  const handleToggleCompareHospital = (item: RankedHospitalItem) => {
    setComparisonHospitals((prev) => {
      const exists = prev.some(
        (h) =>
          h.hospital.hospital_name === item.hospital.hospital_name &&
          h.hospital.address === item.hospital.address
      );
      if (exists) {
        return prev.filter(
          (h) =>
            !(
              h.hospital.hospital_name === item.hospital.hospital_name &&
              h.hospital.address === item.hospital.address
            )
        );
      } else {
        if (prev.length >= 3) {
          alert('You can compare up to 3 hospitals at a time. Please remove one before adding another.');
          return prev;
        }
        return [...prev, item];
      }
    });
  };

  const handleRemoveCompareHospital = (item: RankedHospitalItem) => {
    setComparisonHospitals((prev) =>
      prev.filter(
        (h) =>
          !(
            h.hospital.hospital_name === item.hospital.hospital_name &&
            h.hospital.address === item.hospital.address
          )
      )
    );
  };

  const handleAddCompareHospital = (item: RankedHospitalItem) => {
    setComparisonHospitals((prev) => {
      const exists = prev.some(
        (h) =>
          h.hospital.hospital_name === item.hospital.hospital_name &&
          h.hospital.address === item.hospital.address
      );
      if (exists) return prev;
      if (prev.length >= 3) {
        alert('You can compare up to 3 hospitals at a time.');
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleClearComparison = () => {
    setComparisonHospitals([]);
  };

  // Titles and Subtitles per view matching Reference Image
  const getHeaderMeta = () => {
    switch (currentView) {
      case 'policy-xray':
        return {
          title: 'Policy X-Ray',
          subtitle: 'Key insurance constraints extracted from your policy document.'
        };
      case 'financial-impact':
        return {
          title: 'Financial Impact Simulator',
          subtitle: 'See how your policy constraints affect your out-of-pocket expenses.'
        };
      case 'find-hospitals':
        return {
          title: 'Find Hospitals',
          subtitle: 'Discover hospitals that match your policy and healthcare needs.'
        };
      case 'hospital-comparison':
        return {
          title: 'Hospital Comparison',
          subtitle: 'Compare key information across facilities to make an informed decision.'
        };
      case 'room-comparison':
        return {
          title: 'Room Choice Impact',
          subtitle: 'See how different room options affect your financial exposure.'
        };
      case 'care-journey':
        return {
          title: 'Care Journey Navigator',
          subtitle: 'Step-by-step guidance from pre-admission to discharge reconciliation.'
        };
      case 'what-to-verify':
        return {
          title: 'What to Verify',
          subtitle: 'Critical questions to ask the hospital and TPA desk before admission.'
        };
      default:
        return {
          title: 'SehatSure',
          subtitle: 'Insurance-aware healthcare decision-support platform'
        };
    }
  };

  const { title, subtitle } = getHeaderMeta();

  return (
    <div className="sehatsure-root">
      {currentView === 'landing' ? (
        <LandingPage
          onTryDemo={handleTryDemoPolicy}
          onUploadClick={() => setIsUploadModalOpen(true)}
          isLoadingDemo={loadingDemo}
        />
      ) : (
        <div className="product-shell-layout">
          {/* 1. Left Navigation Sidebar */}
          <Sidebar
            currentView={currentView}
            onNavigate={(view) => setCurrentView(view)}
            hasPolicy={!!activePolicy}
            onHelpClick={() => setCurrentView('what-to-verify')}
          />

          {/* 2. Main Work Area */}
          <div className="product-main-area">
            <TopHeader
              title={title}
              subtitle={subtitle}
              policy={activePolicy}
              onUploadClick={() => setIsUploadModalOpen(true)}
              onResetPolicy={handleResetPolicy}
            />

            <main className="product-page-body" id="main-content">
              {currentView === 'policy-xray' && activePolicy && (
                <PolicyXRayPage
                  policy={activePolicy}
                  onNavigateToSimulator={() => setCurrentView('financial-impact')}
                  onNavigateToHospitals={() => setCurrentView('find-hospitals')}
                />
              )}

              {currentView === 'financial-impact' && activePolicy && (
                <FinancialImpactPage
                  policy={activePolicy}
                  onNavigateToHospitals={() => setCurrentView('find-hospitals')}
                  onNavigateToRoomComparison={() => setCurrentView('room-comparison')}
                />
              )}

              {currentView === 'find-hospitals' && activePolicy && (
                <FindHospitalsPage
                  policy={activePolicy}
                  onStartCareJourney={handleStartCareJourney}
                  onNavigateToComparison={handleNavigateToComparison}
                  comparisonHospitals={comparisonHospitals}
                  onToggleCompareHospital={handleToggleCompareHospital}
                  onClearComparison={handleClearComparison}
                />
              )}

              {currentView === 'hospital-comparison' && activePolicy && (
                <HospitalComparisonPage
                  policy={activePolicy}
                  hospitals={comparisonHospitals}
                  onStartCareJourney={handleStartCareJourney}
                  onBackToSearch={() => setCurrentView('find-hospitals')}
                  onAddHospital={handleAddCompareHospital}
                  onRemoveHospital={handleRemoveCompareHospital}
                  onSetComparisonHospitals={setComparisonHospitals}
                />
              )}

              {currentView === 'room-comparison' && activePolicy && (
                <RoomComparisonPage
                  policy={activePolicy}
                  selectedHospital={selectedHospital}
                  onNavigateToJourney={handleStartCareJourney}
                  onNavigateToXRay={() => setCurrentView('policy-xray')}
                />
              )}

              {currentView === 'care-journey' && activePolicy && (
                <CareJourneyPage
                  policy={activePolicy}
                  hospital={
                    selectedHospital || {
                      hospital: {
                        hospital_name: 'Manipal Hospital - Old Airport Road',
                        address: '98, HAL Old Airport Rd, Kodihalli, Bengaluru, Karnataka 560017',
                        city: 'Bengaluru',
                        specialties: ['Neurology', 'Multi-specialty'],
                        insurers: ['HDFC ERGO'],
                        insurersRaw: 'HDFC ERGO',
                        rating: 4.8,
                        tier: 'Tier 1',
                        segment: 'Private',
                        hospital_type: 'Private'
                      },
                      rank: 1,
                      networkStatus: 'verified',
                      networkProvenance: 'NETWORK_REFERENCE_MATCH',
                      specialtyStatus: 'DATASET_LISTED',
                      isEmpanelled: true,
                      score: {
                        finalScore: 92,
                        coverageFit: 95,
                        patientCostFit: 90,
                        hospitalTypeScore: 90,
                        coPayFit: 100,
                        patientPayable: 128000,
                        coPayAmount: 0,
                        excessOverSI: 0
                      },
                      estimate: {
                        available: true,
                        level: 'specialty',
                        estimateLevel: 'specialty',
                        estimateBasis: 'specialty_reference',
                        estimateLevelLabel: 'Specialty Reference',
                        lowCost: 380000,
                        meanCost: 400000,
                        highestCost: 420000,
                        segmentAdjustedCost: 400000,
                        hospitalVariation: 1,
                        treatmentCost: 368000,
                        roomCost: 32000,
                        totalCost: 400000,
                        displayLow: 380000,
                        displayHigh: 420000,
                        estimatedStayDays: 4,
                        roomCostPerDay: 8000,
                        singlePrivateRate: 8000
                      }
                    }
                  }
                  initialRoom={selectedRoom}
                  initialProcedure={selectedProcedure}
                  onBackToDiscovery={() => setCurrentView('find-hospitals')}
                  onBackToPolicy={() => setCurrentView('policy-xray')}
                />
              )}

              {currentView === 'what-to-verify' && (
                <WhatToVerifyPage
                  policy={activePolicy}
                  onNavigateToSimulator={() => setCurrentView('financial-impact')}
                  onNavigateToHospitals={() => setCurrentView('find-hospitals')}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Modal for Custom PDF Upload */}
      {isUploadModalOpen && (
        <UploadPolicyModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onPolicyLoaded={handlePolicyLoaded}
        />
      )}
    </div>
  );
}

export default App;
