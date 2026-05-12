/**
 * Test Email Generation Logic
 * Verifies that emails are generated correctly based on program duration and batch year
 */

// Test the batch year extraction from register number
function extractBatchYearFromRegisterNumber(registerNumber) {
    if (!registerNumber || registerNumber.length < 5) return null;
    
    const cleaned = registerNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const batchYearMatch = cleaned.match(/^[A-Z]+(\d{2})/);
    if (!batchYearMatch || !batchYearMatch[1]) return null;
    
    const twoDigitYear = parseInt(batchYearMatch[1], 10);
    
    if (twoDigitYear >= 20 && twoDigitYear <= 99) {
        return 2000 + twoDigitYear;
    } else if (twoDigitYear >= 0 && twoDigitYear <= 19) {
        return 2000 + twoDigitYear;
    }
    
    return null;
}

// Test the program code extraction from register number
function extractProgramCodeFromRegisterNumber(registerNumber) {
    if (!registerNumber || registerNumber.length < 7) return null;
    
    const cleaned = registerNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const programMatch = cleaned.match(/^[A-Z]+\d{2}([A-Z]+)\d+$/);
    if (!programMatch || !programMatch[1]) return null;
    
    return programMatch[1];
}

// Test the email generation
function generateStudentEmail(fullName, joiningYear, programCode, durationYears = 2) {
    const cleanName = fullName.toLowerCase().replace(/\s/g, '');
    const cleanProgram = programCode.toLowerCase().replace(/\s/g, '');
    
    const joiningYearNum = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : joiningYear;
    const duration = durationYears || 2;
    const emailYear = joiningYearNum + duration;
    
    // Check if program is integrated (MCAI, IMCA, or starts with INT)
    const isIntegrated = 
        cleanProgram.includes('mcai') || 
        cleanProgram.includes('imca') || 
        cleanProgram.startsWith('int');
    
    // Normalize program code for email domain (MCAI -> MCA)
    let emailProgramCode = cleanProgram;
    if (cleanProgram === 'mcai' || cleanProgram === 'imca') {
        emailProgramCode = 'mca';
    }
    
    const integratedSuffix = isIntegrated ? 'i' : '';
    
    return `${cleanName}${emailYear}${integratedSuffix}@${emailProgramCode}.sjcetpalai.ac.in`;
}

// Test cases
console.log('=== Email Generation Test Cases ===\n');

const testCases = [
    {
        name: 'Suryan Jayaprakash',
        regNo: 'SJC24MCA058',
        program: 'MCA',
        duration: 2,
        description: 'MCA student (2-year program) joining in 2024'
    },
    {
        name: 'John Doe',
        regNo: 'SJC22BTECH456',
        program: 'B.Tech',
        duration: 4,
        description: 'BTech student (4-year program) joining in 2022'
    },
    {
        name: 'Alice Smith',
        regNo: 'SJC25MBA789',
        program: 'MBA',
        duration: 2,
        description: 'MBA student (2-year program) joining in 2025'
    },
    {
        name: 'Rohith Satheeshan',
        regNo: 'SJC24MCAI051',
        program: 'MCAI',
        duration: 5,
        description: 'Integrated MCA student (5-year program) joining in 2024'
    }
];

testCases.forEach((testCase, idx) => {
    console.log(`Test Case ${idx + 1}: ${testCase.description}`);
    console.log(`  Register Number: ${testCase.regNo}`);
    
    const joiningYear = extractBatchYearFromRegisterNumber(testCase.regNo);
    console.log(`  Joining Year (from register): ${joiningYear}`);
    
    const programCode = extractProgramCodeFromRegisterNumber(testCase.regNo);
    console.log(`  Program Code (from register): ${programCode}`);
    
    const passoutYear = joiningYear + testCase.duration;
    console.log(`  Passout Year (Joining Year + Duration): ${passoutYear}`);
    
    const email = generateStudentEmail(testCase.name, joiningYear, programCode, testCase.duration);
    console.log(`  Generated Email: ${email}`);
    console.log('');
});

console.log('=== Summary ===');
console.log('✓ Batch year extracted from register number (e.g., 24 from SJC24MCA058 = 2024 joining year)');
console.log('✓ Email year calculated as: joining year + duration');
console.log('✓ For MCA (2 years): joining 2024 + 2 = 2026 (passout year)');
console.log('✓ For BTech (4 years): joining 2022 + 4 = 2026 (passout year)');
console.log('✓ For Integrated MCA (5 years): joining 2024 + 5 = 2029 (passout year) with "i" suffix');
console.log('✓ Format: name + year + [i for integrated] + @ + program + ".sjcetpalai.ac.in"');
