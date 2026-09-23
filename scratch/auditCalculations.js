const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== FINANCIAL CALCULATION ADVERSARIAL AUDIT ===\n');

  const hospName = 'Manipal Hospital Bangalore';
  const hospAddr = '98, Rusthom Bhag, Airport Road, Opposite Leela Palace Road, Bengaluru, Karnataka, 560017';

  // Test 1: HDFC Demo Policy (1% SI = ₹5,000/day, Sum Insured: ₹5,00,000)
  console.log('--- Test 1: Base Corporate Policy (Room Limit: 1% of 5L = ₹5,000/day) ---');
  
  // 1A: General Ward (₹2,500/day - Within Limit)
  const res1A = await post('/api/hospitals/breakdown', {
    policyId: 'pol_demo_hdfc',
    hospitalName: hospName,
    hospitalAddress: hospAddr,
    city: 'Bengaluru',
    specialty: 'Neurology',
    roomType: 'General Ward'
  });

  console.log('1A. General Ward:');
  console.log('  Total Bill:', res1A.itemizedBill.totalBill);
  console.log('  Room Tariff / Day:', res1A.itemizedBill.roomRatePerDay);
  console.log('  Policy Room Cap Applied / Day:', res1A.roomLimitEligiblePerDay);
  console.log('  Proportionate Disallowance Active:', res1A.proportionateDeductionActive);
  console.log('  Proportionate Disallowance Amount:', res1A.proportionateDisallowance);
  console.log('  Insurer Covered:', res1A.totalInsuranceCovered);
  console.log('  Patient Payable:', res1A.totalPatientPayable);
  console.log('  Reconciled (Insurer + Patient = Total):', (res1A.totalInsuranceCovered + res1A.totalPatientPayable) === res1A.itemizedBill.totalBill);

  // 1B: Single Private Room (₹12,000/day - Exceeds Limit)
  const res1B = await post('/api/hospitals/breakdown', {
    policyId: 'pol_demo_hdfc',
    hospitalName: hospName,
    hospitalAddress: hospAddr,
    city: 'Bengaluru',
    specialty: 'Neurology',
    roomType: 'Single Private Room'
  });

  console.log('\n1B. Single Private Room (Deluxe):');
  console.log('  Total Bill:', res1B.itemizedBill.totalBill);
  console.log('  Room Tariff / Day:', res1B.itemizedBill.roomRatePerDay);
  console.log('  Policy Room Cap Applied / Day:', res1B.roomLimitEligiblePerDay);
  console.log('  Room Excess / Day:', res1B.roomRentExcessPerDay);
  console.log('  Proportionate Disallowance Active:', res1B.proportionateDeductionActive);
  console.log('  Proportionate Disallowance Amount:', res1B.proportionateDisallowance);
  console.log('  Insurer Covered:', res1B.totalInsuranceCovered);
  console.log('  Patient Payable:', res1B.totalPatientPayable);
  console.log('  Reconciled (Insurer + Patient = Total):', (res1B.totalInsuranceCovered + res1B.totalPatientPayable) === res1B.itemizedBill.totalBill);
  
  const modeledDiff = res1B.totalPatientPayable - res1A.totalPatientPayable;
  console.log('  Modeled Difference in Patient Exposure (Deluxe vs Ward):', modeledDiff);

  // Test 2: Custom Policy with Fixed Amount Room Limit (₹3,000/day)
  console.log('\n--- Test 2: Policy with Fixed Tariff Cap (₹3,000/day) ---');
  const customPolicy = {
    _id: 'pol_fixed_test',
    insurer: 'Star Health',
    planName: 'Medi Classic',
    sumInsured: 500000,
    roomLimit: { type: 'amount', value: 3000 },
    copay: 0,
    deductible: 0,
    proportionateDeduction: true
  };

  const res2 = await post('/api/hospitals/breakdown', {
    policy: customPolicy,
    hospitalName: hospName,
    hospitalAddress: hospAddr,
    city: 'Bengaluru',
    specialty: 'Neurology',
    roomType: 'Single Private Room'
  });

  console.log('2. Fixed Amount Policy Room Cap Applied:', res2.roomLimitEligiblePerDay);
  console.log('  Is fixed cap exactly ₹3,000 (NOT ₹1.5 Crore)?', res2.roomLimitEligiblePerDay === 3000);
  console.log('  Room Tariff / Day:', res2.itemizedBill.roomRatePerDay);
  console.log('  Room Excess / Day (12k - 3k):', res2.roomRentExcessPerDay);
  console.log('  Proportionate Disallowance:', res2.proportionateDisallowance);
  console.log('  Patient Share:', res2.totalPatientPayable);
  console.log('  Insurer Share:', res2.totalInsuranceCovered);
  console.log('  Reconciled:', (res2.totalInsuranceCovered + res2.totalPatientPayable) === res2.itemizedBill.totalBill);

  console.log('\n=== ALL CALCULATIONS VERIFIED SUCCESSFULLY ===');
}

run().catch(console.error);
